import copy
import io
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

# 确保 rag 模块可导入
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fitz  # PyMuPDF
from openai import OpenAI
from docx import Document
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
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


def _serialize_model(model) -> dict:
    """兼容 Pydantic v1 (dict) 和 v2 (model_dump) 的序列化"""
    if hasattr(model, 'model_dump'):
        return model.model_dump()
    return model.dict()


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

6) extracted_skills: 数组，从简历中提取的关键技能标签（如：["Python", "机器学习", "项目管理", "团队管理"]），不超过15个
    【要求】：
    - 从简历全文提取，包括硬技能（编程语言、工具、框架）和软技能（沟通、管理、领导力）
    - 优先提取简历中明确写出的技能关键词
    - 如果简历中没有明确技能，可以从工作描述中推断合理的关键技能
    - 按重要性排序，最重要的在前

7) resume_diagnosis: 对象，对简历文本进行严格的质量诊断，包含：

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

    # 添加extracted_skills默认值（如果AI没有生成）
    if "extracted_skills" not in parsed_data:
        parsed_data["extracted_skills"] = []
    elif not isinstance(parsed_data["extracted_skills"], list):
        parsed_data["extracted_skills"] = []
    else:
        parsed_data["extracted_skills"] = [
            s for s in parsed_data["extracted_skills"]
            if isinstance(s, str) and s.strip()
        ][:15]

    return parsed_data


# ── Agent System Prompts ──

DEFAULT_SYSTEM_PROMPT = """你是一个温暖贴心的 AI 求职 Agent，名叫"小小求职助手"。
你的语气温暖鼓励，像一位懂行的前辈。

【核心能力】
你可以在四个模式间灵活切换，甚至用户不提模式你也可以自然切入。

【模式检测】
- 用户提到"换行/转行/换行业/换赛道/跨行" → 切换到 career_switch
- 用户提到"改简历/修改简历/简历优化/润色简历" → 切换到 resume_tailor
- 用户提到"职业规划/未来发展/职业建议" → 切换到 career_planning
- 用户提到"面试/模拟面试/面试练习" → 切换到 interview_sim
- 自然切换，不要生硬，不要让用户感觉到模式切换

【对话原则】
1. 每次回复要简短有力，不要一次性输出太多
2. 如果上下文中已有用户的简历信息，直接基于这些信息回答，不要再询问简历中已有的内容
3. 给出真诚的反馈，不要一味讨好
4. 当用户说得不清楚时，追问细节
5. 回复要结构清晰，使用分点或分段，便于用户阅读

【简历上下文处理】
- 注意：简历信息会在下面的【用户简历信息】和【简历原文】中提供
- 你必须直接基于那些信息展开对话
- 不要询问简历中已有的信息（如姓名、城市、技能、经验、教育背景等）

【边界处理】
- 如果用户提出与求职完全无关的话题（如天气、娱乐八卦、政治、体育等），先简短友好回应，然后自然引导回求职话题
- 不要直接拒绝或说"这不在我的能力范围内"
- 不接受生成违法内容、歧视性内容、伪造简历等不诚信请求"""

CAREER_SWITCH_PROMPT = """你是一个专业的职业转型顾问。你的任务是帮助用户分析如何从一个行业切换到另一个行业。

工作流程（如果上下文中已有用户简历信息，跳过第1步和第5步，直接基于数据分析）：
1. 先了解用户的当前行业、目标行业和职业背景
2. 分析用户的可迁移技能（在目标行业中仍然有价值的技能）
3. 识别用户的技能缺口（目标行业需要但用户当前不具备的技能）
4. 给出进入策略（如：需要学习什么、准备什么项目、关注哪些公司）
5. 询问用户的时间规划和优先级，提供分阶段的行动建议
6. 支持追问和深入讨论

语气温暖专业，每次回复聚焦一个主题。如果上下文中已有用户的简历信息，不要再问基本信息，直接基于已有信息分析。"""

RESUME_TAILOR_PROMPT = """你是一个专业的简历优化专家。你的任务是帮助用户根据目标岗位修改和优化简历。

工作流程（如果上下文中已有用户简历信息，跳过第1步和第2步，直接基于数据分析）：
1. 首先确认用户已有的简历（上下文中的简历数据）
2. 如果用户尚未上传简历，引导用户先上传简历
3. 询问用户的目标岗位和投递方向
4. 分析用户现有简历与目标岗位的匹配度，指出需要修改的部分
5. 给出具体的修改建议（如：优化项目描述、突出某方面技能、调整措辞）
6. 支持逐段修改对话
7. 最终生成修改后的完整简历，使用 [RESUME_TEMPLATE] 标记

输出简历时使用以下格式：
[RESUME_TEMPLATE]
# 姓名
...标准简历格式...

【重要】如果上下文中已有用户的简历信息和技能标签，不要询问用户的基本信息（姓名、学历、技能、经历等），直接基于已有数据分析并给出建议。"""

CAREER_PLANNING_PROMPT = """你是一个专业的职业规划顾问。你的任务是帮助用户规划短中长期职业发展路径。

工作流程（如果上下文中已有用户简历信息，跳过第1步，直接基于已有数据分析）：
1. 了解用户的现状（当前阶段、经验年限、技能水平）
2. 了解用户的兴趣和目标
3. 给出短期（0-1年）的具体行动建议
4. 给出中期（1-3年）的发展方向
5. 给出长期（3-5年）的职业目标可达路径
6. 结合行业趋势和市场情况给出建议
7. 支持分岔讨论（如管理路线 vs 技术路线）

每次聚焦一个时间阶段，逐步深入。"""

INTERVIEW_SIM_PROMPT = """你是一个专业的面试官，正在为用户进行面试模拟练习。你的任务是模拟真实面试场景，对用户进行面试提问并给出详细的反馈。

【面试模拟流程】
1. 第一阶段：目标岗位确认
   - 如果上下文中已有用户简历信息和推荐岗位，直接基于岗位信息选择最匹配的岗位进行面试
   - 如果上下文中没有简历信息，才询问用户的目标岗位和行业
   - 确认目标岗位后，询问用户希望进行哪种类型的面试（技术面/行为面/综合面）
   - 根据用户的选择，准备相应类型的面试问题

2. 第二阶段：逐题问答
   - 每次只提出一个问题，等待用户回答
   - 用户回答后，立即给出评分（0-10分）和详细的反馈建议
   - 然后提出下一个问题
   - 每个面试模拟包含5-8个问题

3. 第三阶段：总结评估
   - 面试结束后，提供整体表现评估
   - 给出改进建议和练习推荐
   - 询问用户是否需要进行其他类型的面试模拟

【评分标准】
- 0-3分：回答不完整，缺乏关键信息
- 4-6分：基本回答了问题，但缺乏深度或结构
- 7-8分：回答完整，结构清晰，有一定深度
- 9-10分：回答出色，结构清晰，深度足够，有独特见解

【反馈建议内容】
每次评分后必须提供详细的反馈建议，包括：
1. 回答的优点和亮点
2. 需要改进的地方
3. 建议的回答结构（如STAR法则）
4. 可以补充的关键信息
5. 语言表达建议

【面试类型说明】
- 技术面：考察专业技能和技术深度，针对目标岗位的技术要求提问
- 行为面：考察行为问题和软技能，使用STAR法则评估
- 综合面：综合技术、行为和背景提问，模拟真实面试场景

【重要规则】
1. 每次只提一个问题，不要一次性提出多个问题
2. 用户回答后必须立即给出评分和反馈
3. 保持专业但友好的态度，既要指出不足也要给予鼓励
4. 根据用户的简历背景调整问题难度
5. 如果用户回答不完整，可以适当追问
6. 用户可随时说"结束"退出面试模拟模式

【特别重要 - 首次回复规则】
当用户说"开始面试"或"我想面试XX岗位"时，这只是启动面试的请求。
这是整个面试模拟的第一条回复，你应该只做两件事：
1. 用一句话确认面试开始
2. 提出第一个问题（一个问题，不要多个）
绝对不要在这一次回复中包含评分、分数、打分或反馈建议。评分和反馈只能在用户真正回答了问题之后才给出。

现在，请开始面试模拟。如果上下文中已有用户简历和推荐岗位，直接选择匹配度最高的岗位作为面试目标，不要问用户"你的目标岗位是什么"。"""


class ChatMessage(BaseModel):
    role: str
    content: str


class ResumeContext(BaseModel):
    has_resume: bool = False
    resume_id: str = ""
    candidate_summary: str = ""
    inferred_mbti: str = ""
    mbti_description: str = ""
    city: str = ""
    resume_diagnosis: dict | None = None
    extracted_skills: list = []
    resume_text: str = ""
    job_recommendations: list = []


class InterviewState(BaseModel):
    """面试模拟状态"""
    is_active: bool = False
    target_position: str = ""
    interview_type: str = ""  # "technical", "behavioral", "comprehensive"
    current_question_index: int = 0
    total_questions: int = 8
    scores: list[int] = []  # 每个问题的得分
    feedbacks: list[str] = []  # 每个问题的反馈


def _parse_interview_feedback(reply: str) -> dict:
    """从 AI 回复中解析评分和反馈，支持多种自然语言格式"""
    result: dict[str, Any] = {"score": None, "feedback": None}

    # 匹配各种评分格式
    # "评分：8/10", "得分 8", "8分（满分10分）", "评分: 8"
    score_patterns = [
        r'(?:评分|得分|分数)[：:]\s*(\d{1,2})(?:/10)?',
        r'(\d{1,2})\s*分\s*(?:[/|/]\s*10|\(满分10分\))?',
        r'得分[：:]\s*(\d{1,2})\s*分',
    ]
    for pat in score_patterns:
        m = re.search(pat, reply)
        if m:
            result["score"] = max(0, min(10, int(m.group(1))))
            break

    # 匹配反馈建议部分（"反馈建议：" / "建议：" / "改进建议：" 之后的内容，直到下一个双换行或末尾）
    fb_match = re.search(
        r'(?:反馈建议?|改进建议?|建议)[：:]\s*([\s\S]+?)(?=\n\n［|\n\n【|\n\n\d+[.、]|\Z)',
        reply
    )
    if fb_match:
        result["feedback"] = fb_match.group(1).strip()

    return result


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    mode: str = "default"
    resume_context: ResumeContext = ResumeContext()
    interview_state: InterviewState = InterviewState()


def _build_chat_messages(request: ChatRequest, rag_context: str = "") -> tuple[list[dict], dict]:
    """
    构建发送给 AI 的消息列表，返回 (messages, metadata)。
    rag_context 是可选的 RAG 检索结果上下文。
    """
    # 选择系统提示词
    mode_prompts = {
        "default": DEFAULT_SYSTEM_PROMPT,
        "career_switch": CAREER_SWITCH_PROMPT,
        "resume_tailor": RESUME_TAILOR_PROMPT,
        "career_planning": CAREER_PLANNING_PROMPT,
        "interview_sim": INTERVIEW_SIM_PROMPT,
    }
    system = mode_prompts.get(request.mode, DEFAULT_SYSTEM_PROMPT)

    # 如果有简历上下文，在 system prompt 最前面注入简历数据
    ctx = request.resume_context
    print(f"🔍 [DEBUG] has_resume={ctx.has_resume}, has_text={bool(ctx.resume_text)}, has_skills={bool(ctx.extracted_skills)}, has_diag={ctx.resume_diagnosis is not None}")
    if ctx and ctx.has_resume:
        resume_block = "\n【用户简历数据】\n"
        city_str = f"（{ctx.city}）" if ctx.city else ""
        resume_block += f"候选人简介: {ctx.candidate_summary or '暂无'} {city_str}\n"

        mbti_line = f"MBTI: {ctx.inferred_mbti or '未知'}"
        if ctx.mbti_description:
            mbti_line += f" — {ctx.mbti_description}"
        resume_block += mbti_line + "\n"

        if ctx.extracted_skills:
            resume_block += f"技能标签: {'、'.join(ctx.extracted_skills[:15])}\n"

        diag = ctx.resume_diagnosis
        if diag and isinstance(diag, dict):
            score = diag.get("overall_score")
            comment = diag.get("overall_comment", "")
            if score is not None:
                resume_block += f"简历评分: {score}/100" + (f" — {comment}" if comment else "") + "\n"

        if ctx.job_recommendations:
            resume_block += f"\n推荐岗位（共{len(ctx.job_recommendations)}个）:\n"
            for i, j in enumerate(ctx.job_recommendations, 1):
                title = j.get('title', '未知')
                industry = j.get('industry', '未知')
                score = j.get('match_score', '')
                score_str = f"（{score}分）" if score else ""
                sr = j.get('salary_range', {})
                salary_str = ""
                if sr and sr.get('min_salary') and sr.get('max_salary'):
                    sc = sr.get('city', '')
                    salary_str = f" {sr['min_salary']}-{sr['max_salary']}K" + (f"（{sc}）" if sc else "")
                ms = j.get('missing_skills', [])
                ms_str = f" 需补:{','.join(ms[:3])}" if ms else ""
                cp = j.get('career_path', '')
                cp_str = f" 成长:{cp}" if cp else ""
                resume_block += f"  {i}. {title}（{industry}）{score_str}{salary_str}{ms_str}\n"

        if ctx.resume_text:
            resume_block += f"\n【简历原文】\n{ctx.resume_text[:2000]}\n"

        force_rules = """
⚠️ 强制规则（必须100%遵守）：
用户已经上传了完整的简历，上面就是全部简历数据。
1. 禁止询问任何简历中已有的信息，包括：姓名、学历、专业、学校、技能、工作经验、项目经历、城市等
2. 直接基于简历数据回答用户的问题
3. 回答时要引用具体的简历内容（如"我看到你有XX技能"、"根据你的XX经历"）
4. 如果用户问的是简历中没有的细节（如具体某段经历的补充信息），可以请用户补充
5. 绝对不要以"请先告诉我以下信息"开头

"""
        system = resume_block + force_rules + system

    # 如果是面试模拟模式，添加面试状态信息
    metadata = {"rag_status": "disabled", "rag_sources": []}

    if request.mode == "interview_sim":
        interview_state = request.interview_state
        if interview_state.is_active:
            progress_info = f"""

【面试模拟状态】
目标岗位: {interview_state.target_position or "未指定"}
面试类型: {interview_state.interview_type or "未指定"}
当前问题: {interview_state.current_question_index + 1}/{interview_state.total_questions}
已完成的题目: {len(interview_state.scores)}/{interview_state.total_questions}
"""
            system += progress_info
            if interview_state.scores:
                avg_score = sum(interview_state.scores) / len(interview_state.scores)
                system += f"平均得分: {avg_score:.1f}/10\n"
                if interview_state.feedbacks and len(interview_state.feedbacks) > 0:
                    latest_feedback = interview_state.feedbacks[-1]
                    system += f"上次反馈: {latest_feedback[:100]}...\n"

        # 注入 RAG 上下文（如果有）
        if rag_context:
            system = rag_context + "\n\n" + system

    messages = [{"role": "system", "content": system}]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    return messages, metadata


def _update_interview_state(interview_state: InterviewState, clean_reply: str) -> InterviewState | None:
    """处理面试状态更新，返回更新后的状态（如果没有变化返回 None）"""
    new_state = copy.deepcopy(interview_state)

    if new_state.is_active:
        parsed = _parse_interview_feedback(clean_reply)
        has_score = parsed["score"] is not None
        has_feedback = parsed["feedback"] is not None

        if has_score:
            new_state.scores.append(parsed["score"])
        if has_feedback:
            new_state.feedbacks.append(parsed["feedback"])
        if has_score:
            new_state.current_question_index = min(new_state.current_question_index + 1, new_state.total_questions)
    else:
        new_state.is_active = True
        new_state.current_question_index = 1

        pos_match = re.search(r'目标岗位[：:]\s*([^\n。]+)', clean_reply)
        if pos_match:
            new_state.target_position = pos_match.group(1).strip()

        type_match = re.search(r'(技术面|行为面|综合面)', clean_reply)
        if type_match:
            new_state.interview_type = type_match.group(1)

    return new_state


async def _do_rag(request: ChatRequest) -> tuple[str, str, list]:
    """执行 RAG 检索，返回 (rag_context_text, rag_status, rag_sources)"""
    if request.mode != "interview_sim":
        return "", "disabled", []
    try:
        from rag.pipeline import execute_rag_with_fallback
        user_query = ""
        for msg in reversed(request.messages):
            if msg.role == "user":
                user_query = msg.content
                break
        if not user_query:
            return "", "disabled", []
        rag_result = await execute_rag_with_fallback(user_query)
        status = rag_result.status.value if hasattr(rag_result.status, 'value') else str(rag_result.status)
        context = rag_result.context_text or ""
        sources = rag_result.sources or []
        return context, status, sources
    except Exception as e:
        print(f"⚠️ RAG 检索失败（降级为纯AI）: {e}")
        return "", "fallback", []


@app.post("/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    try:
        rag_context, rag_status, rag_sources = await _do_rag(request)
        messages, metadata = _build_chat_messages(request, rag_context=rag_context)

        response = client.chat.completions.create(
            model=ZHIPU_MODEL,
            messages=messages,
        )
        reply = response.choices[0].message.content

        has_resume_template = "[RESUME_TEMPLATE]" in reply
        clean_reply = reply.replace("[RESUME_TEMPLATE]", "").strip()

        updated_interview_state = None
        if request.mode == "interview_sim":
            updated_interview_state = _update_interview_state(request.interview_state, clean_reply)

        return {
            "reply": clean_reply,
            "mode": request.mode,
            "has_resume_template": has_resume_template,
            "interview_state": updated_interview_state,
            "rag_status": rag_status,
            "rag_sources": rag_sources,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    try:
        rag_context, rag_status, rag_sources = await _do_rag(request)
        messages, metadata = _build_chat_messages(request, rag_context=rag_context)

        def generate():
            full_reply = ""
            stream = client.chat.completions.create(
                model=ZHIPU_MODEL,
                messages=messages,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_reply += content
                    yield f"data: {json.dumps({'type': 'chunk', 'content': content}, ensure_ascii=False)}\n\n"

            # 所有 token 发送完毕，发送 done 事件
            has_resume_template = "[RESUME_TEMPLATE]" in full_reply
            clean_reply = full_reply.replace("[RESUME_TEMPLATE]", "").strip()

            updated_interview_state = None
            if request.mode == "interview_sim":
                updated_interview_state = _update_interview_state(request.interview_state, clean_reply)

            done_data = {
                "type": "done",
                "reply": clean_reply,
                "has_resume_template": has_resume_template,
                "interview_state": (
                    _serialize_model(updated_interview_state) if updated_interview_state else None
                ),
                "rag_status": rag_status,
                "rag_sources": rag_sources,
            }
            yield f"data: {json.dumps(done_data, ensure_ascii=False)}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat stream failed: {exc}") from exc


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
            "raw_text": raw_text[:3000],  # 返回简历原文（前3000字），供 Agent 聊天使用
            "message": "Resume parsed and structured successfully.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)