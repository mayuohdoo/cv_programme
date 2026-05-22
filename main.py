import io
import json
import os
import re
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
from openai import OpenAI
from docx import Document
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

load_dotenv()

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "5"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,https://catarina-xxxcc.github.io,https://cv-programme-git-main-catarina-xxxccs-projects.vercel.app,file://"
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",") if origin.strip()]
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
FRONTEND_DEMO_PATH = Path(__file__).resolve().parent.parent / "frontend" / "index.html"

app = FastAPI(title="小小求职拿下！- AI 简历解析与 MBTI 引擎")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 临时允许所有源，方便测试
    allow_methods=["*"],
    allow_headers=["*"],
)

zhipu_api_key = os.getenv("ZHIPU_API_KEY", "").strip()
if not zhipu_api_key:
    raise RuntimeError("Missing ZHIPU_API_KEY. Add it to your environment or .env file.")
client = OpenAI(api_key=zhipu_api_key, base_url="https://open.bigmodel.cn/api/paas/v4/")
ZHIPU_MODEL = os.getenv("ZHIPU_MODEL", "glm-4-flash")


def _file_extension(filename: str) -> str:
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def _extract_text(content_type: str, file_bytes: bytes) -> str:
    raw_text = ""
    if content_type == "application/pdf":
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                raw_text += page.get_text()
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = Document(io.BytesIO(file_bytes))
        raw_text = "\n".join(para.text for para in doc.paragraphs)
    return raw_text.strip()


def _to_json_with_fallback(response_text: str) -> dict[str, Any]:
    cleaned = response_text.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    code_block_match = re.search(r"```json\s*(\{.*\})\s*```", cleaned, re.DOTALL)
    if code_block_match:
        return json.loads(code_block_match.group(1))

    object_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if object_match:
        return json.loads(object_match.group(1))

    raise ValueError("AI response is not valid JSON")


def _parse_resume_with_ai(raw_text: str) -> dict[str, Any]:
    prompt = f"""
你是一个资深 HR 分析师、职业人格专家和严格的简历审查专家。请将简历解析为严格 JSON（不要使用 markdown 代码块）。

【重要】你必须以高标准检查简历质量，仔细审查每一处表达，不要遗漏任何问题。诚实的反馈比礼貌的赞美更有价值。

输出字段要求：
1) inferred_mbti: 字符串，16型人格之一
2) mbti_description: 字符串，对该 MBTI 人格的简短描述（60字以内，突出核心特质）
3) candidate_summary: 字符串，基于简历内容的候选人简介（80字以内）
4) city: 字符串，从简历中提取的城市信息（如："北京"、"上海"、"深圳"、"杭州"等）
   - 如果简历中明确提及城市（如："北京市朝阳区"、"工作地点：上海"），提取城市名称
   - 如果简历中未明确提及城市，返回空字符串 ""
   - 只返回城市名称，不要包含"市"、"省"等后缀（如：返回"北京"而不是"北京市"）

5) job_recommendations: 数组，推荐6个适合该候选人的岗位，覆盖不同行业，每项包含：
   - title: 岗位名称
   - industry: 所属行业（如：科技、金融、咨询、教育、创业、政府等）
   - reason: 推荐理由（30字以内，结合简历技能和MBTI特质）
   - match_level: 匹配度，"高" 或 "中"
   
   - match_score: 整数 0-100，精确匹配度分数（新增字段，与match_level配合使用）
     【计算规则】：技能匹配40% + 经验匹配25% + 教育匹配20% + MBTI匹配15%
     【示例】：高匹配岗位85-95分，中匹配岗位65-79分
   
   - missing_skills: 数组，候选人缺失的关键技能，0-5个（新增字段）
     【规则】：只列出岗位重要但简历未体现的技能，完全匹配时返回空数组[]
     【示例】：["Docker", "Kubernetes"]
   
   - career_path: 字符串，该岗位的职业成长路径，60-100字（新增字段）
     【格式】：2-4个阶段，用箭头连接
     【示例】："初级算法工程师 → 算法工程师 → 高级算法工程师 → 算法专家"
   
   - salary_range: 对象，该岗位的薪资范围，包含：
     * min_salary: 整数，最低月薪（单位：千元，如 15 表示 15K）
     * max_salary: 整数，最高月薪（单位：千元，如 25 表示 25K）
     * city: 字符串，薪资对应的城市（使用上面提取的城市信息；如果城市为空，使用"全国"）
   
   【薪资推断规则】：
   - 根据岗位名称、行业、城市和候选人背景推断2024-2025年的合理薪资范围
   - 一线城市（北京、上海、深圳、杭州）薪资通常比二三线城市高 20-40%
   - 技术岗位（算法工程师、后端开发、前端开发）通常高于运营、市场岗位
   - 金融、互联网、AI行业通常高于传统行业
   - 考虑候选人的教育背景和工作经验（应届生、1-3年、3-5年、5年以上）
   - 薪资范围应该合理且符合市场行情，不要过高或过低
   - 示例：
     * 北京的算法工程师（3年经验）：25-40K
     * 成都的算法工程师（3年经验）：18-30K
     * 上海的产品经理（应届生）：12-18K
     * 全国的市场专员（1年经验）：8-12K

6) resume_diagnosis: 对象，对简历文本进行严格的质量诊断，包含：

   - typos: 数组，发现的错别字。【检测标准】：
     * 同音字错误（如："测式"应为"测试"，"沟通能里"应为"沟通能力"）
     * 形近字错误（如："项日"应为"项目"）
     * 多字/少字（如："的的项目"应为"的项目"）
     * 标点错误（如：中文语境中使用英文逗号）
     【要求】：仔细检查整个简历，每个错别字必须返回 {{"original": "原文片段(5-30字)", "suggestion": "正确写法"}}
     【示例】：{{"original": "负责产品的测式工作", "suggestion": "负责产品的测试工作"}}

   - grammar_issues: 数组，病句或语法问题。【检测标准】：
     * 语序不当（如："使用了熟练Python"应为"熟练使用Python"）
     * 成分残缺（如："负责开发"缺少宾语，应为"负责XX系统的开发"）
     * 搭配不当（如："提高效率的增长"应为"提高效率"或"促进增长"）
     * 表意不明（如："通过使用工具进行了工作"过于模糊）
     * 冗长啰嗦（如："通过使用Python和数据分析工具进行了数据的分析"应为"使用Python进行数据分析"）
     【要求】：关注动词搭配、介词使用、句子简洁性，每个问题必须返回 {{"original": "原句(10-40字)", "suggestion": "改进后的表达"}}
     【示例】：{{"original": "通过使用Python进行了数据的分析", "suggestion": "使用Python进行数据分析"}}

   - redundancy: 数组，语意冗杂或表达重复。【检测标准】：
     * 重复词语（如："主要负责主要的项目"应为"负责主要的项目"）
     * 重复表达（如："进行了优化和改进"可简化为"进行了优化"）
     * 无意义修饰（如："非常很重要"应为"非常重要"）
     * 可合并句子（如："负责开发。负责测试。"应为"负责开发和测试"）
     【要求】：追求简洁有力的表达，每个冗余必须返回 {{"original": "冗余片段(10-40字)", "suggestion": "简化后的表达"}}
     【示例】：{{"original": "主要负责主要的项目开发", "suggestion": "负责主要的项目开发"}}

   - overall_score: 整数 1-100，简历整体质量评分。【评分标准】：
     * 90-100分：无明显问题，表达专业简洁，用词准确
     * 80-89分：有1-2个小问题，整体良好
     * 70-79分：有3-5个问题，需要改进
     * 60-69分：有6-10个问题，质量一般
     * 60分以下：问题较多（>10个），需要大幅修改
     【要求】：根据发现的问题数量严格评分，不要因为礼貌而虚高评分

   - overall_comment: 字符串，一句话总体评价（30字以内）。
     【要求】：如果有问题，必须明确指出（如："发现3处错别字和2处病句，建议仔细校对"）；如果质量优秀，可以正面评价（如："表达专业简洁，未发现明显问题"）

【重要提示】：
- 如果简历质量确实很好，typos/grammar_issues/redundancy 可以为空数组，overall_score 可以给 85-100 分
- 但如果发现了问题，必须如实指出，不要遗漏，不要因为礼貌而隐瞒
- original 字段必须是简历中的原文片段，不要编造
- suggestion 必须是具体可行的修改建议，不要模糊表达

如果信息缺失，请使用空字符串或空数组，不要省略字段。

推断 inferred_mbti 时，规则如下，【软技能和行为描述的权重必须高于技术栈】：

E vs I（外向 vs 内向）——这是最重要的维度，请仔细判断：
- 只要简历中出现以下任意一项，必须判断为 E：
  团队合作、公开演讲、演讲、领导力、组织活动、社团、部长、负责人、跨部门、客户沟通、培训、带领团队、主导、协调
- 只有简历中完全没有上述信号，且明确描述独立工作、独自研究时，才判断为 I

S vs N：
- N：战略规划、创新、系统设计、跨领域、提出新方案
- S：注重细节、流程执行、数据记录、操作规范

T vs F：
- F：关注团队氛围、帮助他人、志愿服务、用户体验、人文关怀
- T：数据驱动、逻辑分析、优化效率、技术决策

J vs P：
- J：项目管理、按时交付、制定计划、结构化
- P：灵活应变、多线并行、探索性、创意发散

简历文本如下：
{raw_text}
"""
    response = client.chat.completions.create(
        model=ZHIPU_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return _to_json_with_fallback(response.choices[0].message.content)


def _add_default_values_for_new_fields(parsed_data: dict[str, Any]) -> dict[str, Any]:
    """
    为新增字段添加默认值（如果AI没有生成）
    保持向后兼容，不影响现有字段
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if "job_recommendations" in parsed_data and isinstance(parsed_data["job_recommendations"], list):
        for job in parsed_data["job_recommendations"]:
            if not isinstance(job, dict):
                continue
            
            # 添加match_score默认值（如果缺失）
            if "match_score" not in job:
                # 根据match_level推断默认分数
                if job.get("match_level") == "高":
                    job["match_score"] = 85
                elif job.get("match_level") == "中":
                    job["match_score"] = 70
                else:
                    job["match_score"] = 70
            else:
                # 验证范围
                if not isinstance(job["match_score"], int) or job["match_score"] < 0 or job["match_score"] > 100:
                    job["match_score"] = 70
            
            # 添加missing_skills默认值（如果缺失）
            if "missing_skills" not in job:
                job["missing_skills"] = []
            elif not isinstance(job["missing_skills"], list):
                job["missing_skills"] = []
            else:
                # 过滤并限制数量
                job["missing_skills"] = [
                    s for s in job["missing_skills"]
                    if isinstance(s, str) and s.strip()
                ][:5]
            
            # 添加career_path默认值（如果缺失）
            if "career_path" not in job:
                job["career_path"] = ""
            elif not isinstance(job["career_path"], str):
                job["career_path"] = ""
            else:
                job["career_path"] = job["career_path"][:100]
    
    return parsed_data


SYSTEM_PROMPT = """你是一个专业的求职顾问和简历写作专家。你的任务是通过友好的对话，帮助没有简历的用户生成一份专业的简历。

【核心规则——必须严格遵守，优先于所有其他指令】

规则1：用户问到明星、娱乐、天气、政治等与求职完全无关的话题时，直接从以下模板中选择一句回复，**不得修改措辞，不得补充任何信息**：

  模板A："哈哈知道呀～ 话说回来，你最近在找什么方向的工作吗？"
  模板B："好的知道啦～ 说起来，你对自己的职业方向有什么想法吗？"
  模板C："原来你对这个感兴趣呀～ 说起来，你最近有在准备面试吗？"

规则2：回复后如果用户继续追问无关内容，再次从模板中选择一句回复，不提供额外信息。

规则3：如果用户提问的话题与求职模糊相关（如"什么行业前景好"），可以正常回答并引导。

规则4：禁止生成违法内容、冒充他人、造假简历等不诚信请求。

对话流程：
1. 先了解用户的基本情况：姓名、学历、专业、毕业院校
2. 了解工作经历或实习经历（如果是应届生则询问项目经历、社团经历）
3. 了解技能特长（编程语言、软件工具、语言能力等）
4. 了解求职意向（目标岗位、行业）
5. 信息收集完毕后，主动说"我已经收集了足够的信息，现在为你生成简历模板"，然后输出简历

输出简历时，使用以下 Markdown 格式，并在开头加上 [RESUME_TEMPLATE] 标记：

[RESUME_TEMPLATE]
# 姓名

📧 邮箱 | 📱 电话 | 🎓 学校

---

## 教育背景
**学校名称** · 专业 · 入学年份 - 毕业年份

---

## 技能
- 技能1、技能2、技能3

---

## 实习 / 工作经历
**公司名称** · 职位 · 时间段
- 主要职责或成果描述

---

## 项目经历
**项目名称** · 时间段
- 项目描述和个人贡献

---

## 自我评价
简短的自我介绍（2-3句话）

注意：
- 每次只问1-2个问题，不要一次问太多
- 语气友好自然，像朋友聊天一样
- 如果用户信息不完整，用合理的内容补充
- 简历内容要专业、简洁、有力


【回复格式要求——必须严格遵守】
- 回复要简短利落，每段不超过3行
- 用换行分段来组织内容，绝对不要使用任何 Markdown 符号（如 ** * # > ` _ 等）
- 需要强调某个词时，用引号“”代替加粗
- 需要分点时，直接用自然语言的换行列出，不要加符号或数字编号
- 每段之间空一行，让段落分明"""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@app.post("/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})

        response = client.chat.completions.create(
            model=ZHIPU_MODEL,
            messages=messages,
        )
        reply = response.choices[0].message.content

        # 检测是否包含简历模板
        has_resume = "[RESUME_TEMPLATE]" in reply
        clean_reply = reply.replace("[RESUME_TEMPLATE]", "").strip()

        return {
            "reply": clean_reply,
            "has_resume": has_resume,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc
    return {"message": "Resume AI API is ready."}


@app.get("/demo")
async def demo_page() -> FileResponse:
    if not FRONTEND_DEMO_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo page not found.")
    return FileResponse(FRONTEND_DEMO_PATH)


@app.post("/upload")
async def upload_resume(file: UploadFile = File(...)) -> dict[str, Any]:
    content_type = file.content_type or ""
    filename = file.filename or ""
    ext = _file_extension(filename)

    if content_type not in ALLOWED_MIME_TYPES or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX resumes are supported.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max allowed size is {MAX_FILE_SIZE_MB}MB.",
        )

    try:
        raw_text = _extract_text(content_type, file_bytes)
        if not raw_text:
            raise HTTPException(status_code=400, detail="No readable text found in the uploaded file.")

        parsed = _parse_resume_with_ai(raw_text)
        # 为新增字段添加默认值（保持向后兼容）
        parsed = _add_default_values_for_new_fields(parsed)
        return {
            "filename": filename,
            "parse_status": "success",
            "parsed_data": parsed,
            "message": "Resume parsed and structured successfully.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)