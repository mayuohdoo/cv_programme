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

deepseek_api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
if not deepseek_api_key:
    raise RuntimeError("Missing DEEPSEEK_API_KEY. Add it to your environment or .env file.")
client = OpenAI(api_key=deepseek_api_key, base_url="https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


def _file_extension(filename: str) -> str:
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def _extract_text_from_images(file_bytes: bytes) -> str:
    """把 PDF 每页渲染成图片，用 DeepSeek Vision 识别文字内容。"""
    import base64
    texts = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page_num, page in enumerate(doc):
            mat = fitz.Matrix(2, 2)  # 2x 缩放保证清晰度
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            img_b64 = base64.b64encode(img_bytes).decode("utf-8")

            response = client.chat.completions.create(
                model="deepseek-vl2",
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{img_b64}"}
                        },
                        {
                            "type": "text",
                            "text": "请完整提取这张简历图片中的所有文字内容，保持原有结构和顺序，不要添加任何解释或总结。"
                        }
                    ]
                }],
                temperature=0,
            )
            texts.append(response.choices[0].message.content)
            print(f"📷 OCR 第 {page_num + 1} 页完成")

    return "\n\n".join(texts)


def _extract_text(content_type: str, file_bytes: bytes) -> str:
    raw_text = ""
    if content_type == "application/pdf":
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                raw_text += page.get_text()

        # 检测乱码：统计中文字符占比
        if raw_text.strip():
            chinese_chars = sum(1 for c in raw_text if '\u4e00' <= c <= '\u9fff')
            total_chars = len([c for c in raw_text if c.strip()])
            chinese_ratio = chinese_chars / total_chars if total_chars > 0 else 0

            # 文字够多但中文占比低于5%，判定为乱码，改用图片OCR
            if total_chars > 100 and chinese_ratio < 0.05:
                print("⚠️ 检测到PDF字体编码异常，切换为图片OCR模式...")
                raw_text = _extract_text_from_images(file_bytes)

    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = Document(io.BytesIO(file_bytes))
        raw_text = "\n".join(para.text for para in doc.paragraphs)
    return raw_text.strip()


def _to_json_with_fallback(response_text: str) -> dict[str, Any]:
    cleaned = response_text.strip()

    def _sanitize(s: str) -> str:
        """
        单遍状态机，只在 JSON 字符串值内部做修复：
        - 裸控制字符（真实换行、制表符等）-> 转义文本，保留内容
        - 非法反斜杠转义（如 单引号、冒号、连字符等）-> 丢弃反斜杠，保留字符
        - 合法转义（双引号、双反斜杠、/、n、t、r、b、f、u+4位十六进制）-> 原样保留
        JSON 结构字符（字符串外的部分）完全不动。
        """
        _ctrl_map = {'\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f'}
        _valid_single = set('"\\ntrfb/')
        out = []
        in_string = False
        i = 0
        while i < len(s):
            ch = s[i]
            if not in_string:
                if ch == '"':
                    in_string = True
                out.append(ch)
                i += 1
            else:
                if ch == '\\':
                    if i + 1 >= len(s):
                        # 末尾孤立反斜杠，丢弃
                        i += 1
                        continue
                    nxt = s[i + 1]
                    if nxt in _valid_single:
                        # 合法单字符转义，原样保留
                        out.append(ch)
                        out.append(nxt)
                        i += 2
                    elif nxt == 'u':
                        # \uXXXX：检查后4位是否都是十六进制
                        hex_part = s[i + 2: i + 6]
                        if len(hex_part) == 4 and all(c in '0123456789abcdefABCDEF' for c in hex_part):
                            out.append(ch)
                            out.append(nxt)
                            out.extend(hex_part)
                            i += 6
                        else:
                            # 非法 \u，丢弃反斜杠
                            out.append(nxt)
                            i += 2
                    else:
                        # 其他非法转义，丢弃反斜杠，保留字符
                        out.append(nxt)
                        i += 2
                elif ch == '"':
                    in_string = False
                    out.append(ch)
                    i += 1
                elif ch in _ctrl_map:
                    # 裸控制字符 → 转义文本
                    out.extend(_ctrl_map[ch])
                    i += 1
                else:
                    out.append(ch)
                    i += 1
        return ''.join(out)

    def _extract_json_fragment(s: str) -> str | None:
        """从可能含有前缀文字或 markdown 代码块的字符串中提取 JSON 对象。"""
        # 去掉 markdown 代码块
        m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", s, re.DOTALL)
        if m:
            return m.group(1)
        # 提取最外层 {}
        m = re.search(r"(\{.*\})", s, re.DOTALL)
        if m:
            return m.group(1)
        return None

    def _try_parse(text: str) -> dict[str, Any] | None:
        # 第一步：直接解析
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        # 第二步：清洗后解析
        try:
            return json.loads(_sanitize(text))
        except json.JSONDecodeError:
            return None

    # 尝试完整文本
    result = _try_parse(cleaned)
    if result is not None:
        return result

    # 尝试提取 JSON 片段后再解析
    fragment = _extract_json_fragment(cleaned)
    if fragment:
        result = _try_parse(fragment)
        if result is not None:
            return result

    raise ValueError("AI response is not valid JSON")


def _parse_resume_with_ai(raw_text: str) -> dict[str, Any]:
    # 清洗简历原文，防止其中的特殊字符污染 JSON 输出
    # 替换会破坏 JSON 的字符，但保留内容可读性
    safe_text = raw_text.replace('\\', '、').replace('"', '"').replace('"', '"').replace('\x00', '')
    # 把连续多个空行压缩为单个空行，减少 token 浪费
    safe_text = re.sub(r'\n{3,}', '\n\n', safe_text)

    prompt = f"""你是一个资深 HR 分析师和严格的简历审查专家。请将简历解析为严格合法的 JSON。

重要输出规则：
1. 只输出 JSON 对象本身，不要有任何其他文字、不要用 markdown 代码块包裹
2. 所有字符串值中不得出现未转义的双引号或反斜杠
3. 字符串值中的换行用空格代替

输出字段：
{{
  "candidate_summary": "候选人简介，80字以内",
  "city": "城市名，无则空字符串",
  "inferred_mbti": "",
  "mbti_description": "",
  "extracted_skills": ["技能1", "技能2"],
  "job_recommendations": [
    {{
      "title": "岗位名称",
      "industry": "行业",
      "reason": "推荐理由30字以内",
      "match_level": "高或中",
      "match_score": 85,
      "missing_skills": ["缺失技能"],
      "career_path": "成长路径",
      "salary_range": {{"min_salary": 15, "max_salary": 25, "city": "城市或全国"}}
    }}
  ],
  "resume_diagnosis": {{
    "typos": [{{"original": "原文片段", "suggestion": "正确写法"}}],
    "grammar_issues": [{{"original": "原句", "suggestion": "改进表达"}}],
    "redundancy": [{{"original": "冗余片段", "suggestion": "简化表达"}}],
    "overall_score": 80,
    "overall_comment": "一句话评价"
  }}
}}

字段说明：
- extracted_skills：从简历提取关键技能，不超过15个，按重要性排序
- job_recommendations：推荐6个岗位，必须100%基于候选人实际背景，非IT背景禁止推荐开发/算法等技术岗
- match_score：技能匹配45% + 经验匹配30% + 教育匹配25%，高匹配85-95分，中匹配65-79分
- resume_diagnosis：严格检查错别字、病句、冗余，original必须是简历原文片段（不含引号），如无问题则对应数组为空
- overall_score：按问题数量严格评分，90+无问题，80-89有1-2个小问题，70-79有3-5个问题

薪资推断：根据岗位、城市、经验推断2024-2025年市场行情，一线城市比二三线高20-40%

简历原文：
{safe_text}
"""
    response = client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    print("=== RAW MODEL OUTPUT (first 300 chars) ===")
    print(repr(raw[:300]))
    print("==========================================")
    try:
        return _to_json_with_fallback(raw)
    except Exception as e:
        print("=== PARSE FAILED, FULL RAW OUTPUT ===")
        print(repr(raw))
        print("=====================================")
        raise


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


@app.post("/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    try:
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
            # 构建简历数据块
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

            # 岗位推荐
            if ctx.job_recommendations:
                resume_block += f"\n推荐岗位（共{len(ctx.job_recommendations)}个）:\n"
                for i, j in enumerate(ctx.job_recommendations, 1):
                    title = j.get('title', '未知')
                    industry = j.get('industry', '未知')
                    score = j.get('match_score', '')
                    score_str = f"（{score}分）" if score else ""
                    reason = j.get('reason', '')
                    reason_str = f" — {reason}" if reason else ""
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
                    if reason:
                        resume_block += f"     理由: {reason}\n"

            # 简历原文
            if ctx.resume_text:
                resume_block += f"\n【简历原文】\n{ctx.resume_text[:2000]}\n"

            # 强制规则（放在 resume 数据之后、角色 prompt 之前）
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
        if request.mode == "interview_sim":
            interview_state = request.interview_state
            if interview_state.is_active:
                # 面试进行中，添加进度信息
                progress_info = f"""
                
【面试模拟状态】
目标岗位: {interview_state.target_position or "未指定"}
面试类型: {interview_state.interview_type or "未指定"}
当前问题: {interview_state.current_question_index + 1}/{interview_state.total_questions}
已完成的题目: {len(interview_state.scores)}/{interview_state.total_questions}
"""
                system += progress_info
                
                # 如果已经有分数，添加历史分数信息
                if interview_state.scores:
                    avg_score = sum(interview_state.scores) / len(interview_state.scores)
                    system += f"平均得分: {avg_score:.1f}/10\n"
                    
                    # 添加最近一次反馈
                    if interview_state.feedbacks and len(interview_state.feedbacks) > 0:
                        latest_feedback = interview_state.feedbacks[-1]
                        system += f"上次反馈: {latest_feedback[:100]}...\n"

        # ===== RAG 知识库检索（仅 interview_sim 模式）=====
        rag_status = "disabled"
        rag_sources = []
        
        if request.mode == "interview_sim":
            try:
                from rag.pipeline import execute_rag_with_fallback
                # 获取用户最新消息作为查询
                user_query = ""
                for msg in reversed(request.messages):
                    if msg.role == "user":
                        user_query = msg.content
                        break
                
                if user_query:
                    rag_result = await execute_rag_with_fallback(user_query)
                    rag_status = rag_result.status.value if hasattr(rag_result.status, 'value') else str(rag_result.status)
                    rag_sources = rag_result.sources
                    
                    # 如果检索到相关内容，注入系统提示词
                    if rag_result.context_text:
                        system = rag_result.context_text + "\n\n" + system
            except Exception as e:
                print(f"⚠️ RAG 检索失败（降级为纯AI）: {e}")
                rag_status = "fallback"

        messages = [{"role": "system", "content": system}]
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})

        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=messages,
        )
        reply = response.choices[0].message.content

        # 检测是否包含简历模板
        has_resume_template = "[RESUME_TEMPLATE]" in reply
        clean_reply = reply.replace("[RESUME_TEMPLATE]", "").strip()

        # 处理面试状态更新
        interview_state = request.interview_state
        updated_interview_state = None

        if request.mode == "interview_sim":
            # 深拷贝当前状态用于更新
            new_state = copy.deepcopy(interview_state)

            if new_state.is_active:
                # ── 面试进行中：解析 AI 回复中的评分和反馈 ──
                parsed = _parse_interview_feedback(clean_reply)
                has_score = parsed["score"] is not None
                has_feedback = parsed["feedback"] is not None

                if has_score:
                    new_state.scores.append(parsed["score"])
                if has_feedback:
                    new_state.feedbacks.append(parsed["feedback"])

                # 只有当本回合确认为"回答了上一题"（AI 给出评分）后，才推进题号
                if has_score:
                    new_state.current_question_index = len(new_state.scores)
            else:
                # ── 首次进入面试模式：激活状态 ──
                new_state.is_active = True

                # 尝试从 AI 回复中提取目标岗位
                pos_match = re.search(r'目标岗位[：:]\s*([^\n。]+)', clean_reply)
                if pos_match:
                    new_state.target_position = pos_match.group(1).strip()

                # 尝试提取面试类型
                type_match = re.search(r'(技术面|行为面|综合面)', clean_reply)
                if type_match:
                    new_state.interview_type = type_match.group(1)

            updated_interview_state = new_state

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