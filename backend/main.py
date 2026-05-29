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

# 用户/简历数据库服务
try:
    from rag.user_service import UserService
    user_service: UserService | None = UserService()
except Exception as _e:
    user_service = None
    print(f"[warn] UserService unavailable: {_e}")

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
client = OpenAI(api_key=zhipu_api_key, base_url=os.getenv("ZHIPU_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"))
ZHIPU_MODEL = os.getenv("ZHIPU_MODEL", "glm-4-flash")


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
            mat = fitz.Matrix(2, 2)  # 2x 缩放，提高清晰度
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            b64 = base64.b64encode(img_bytes).decode()
            try:
                resp = client.chat.completions.create(
                    model=DEEPSEEK_MODEL,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/png;base64,{b64}"},
                                },
                                {
                                    "type": "text",
                                    "text": "请完整提取这张简历图片中的所有文字内容，保持原有格式和结构，不要遗漏任何信息。",
                                },
                            ],
                        }
                    ],
                )
                texts.append(resp.choices[0].message.content)
            except Exception as e:
                print(f"[WARN] 第{page_num+1}页图片OCR失败: {e}")
    return "\n\n".join(texts)


def _extract_text(content_type: str, file_bytes: bytes) -> str:
    raw_text = ""
    if content_type == "application/pdf":
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                raw_text += page.get_text()

        # 检测乱码：统计中文字符占比
        if raw_text.strip():
            chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', raw_text))
            total_chars = len(raw_text.replace('\n', '').replace(' ', ''))
            # 如果文本很短但文件不小，或中文占比异常低，判断为乱码
            if total_chars > 0 and chinese_chars / total_chars < 0.1 and len(raw_text.strip()) < 200:
                print("[WARN] 检测到PDF字体编码异常，切换为图片OCR模式...")
                raw_text = _extract_text_from_images(file_bytes)

    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = Document(io.BytesIO(file_bytes))
        texts = []
        # 1. 提取所有段落的文本
        for para in doc.paragraphs:
            if para.text.strip():
                texts.append(para.text.strip())
        # 2. 提取所有表格中的文本
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        texts.append(cell.text.strip())
        raw_text = "\n".join(texts)
    return raw_text.strip()


def _to_json_with_fallback(response_text: str) -> dict[str, Any]:
    cleaned = response_text.strip()

    def _sanitize(s: str) -> str:
        """移除会破坏 JSON 解析的控制字符，但保留换行/制表符。"""
        return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', s)

    def _try_parse(text: str):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            sanitized = _sanitize(text)
            if sanitized != text:
                try:
                    return json.loads(sanitized)
                except json.JSONDecodeError:
                    pass
        return None

    result = _try_parse(cleaned)
    if result is not None:
        return result

    code_block_match = re.search(r"```json\s*(\{.*\})\s*```", cleaned, re.DOTALL)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1))
        except json.JSONDecodeError:
            pass

    object_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if object_match:
        try:
            return json.loads(object_match.group(1))
        except json.JSONDecodeError:
            pass

    raise ValueError("AI response is not valid JSON")


def _serialize_model(model) -> dict:
    """兼容 Pydantic v1 (dict) 和 v2 (model_dump) 的序列化"""
    if hasattr(model, 'model_dump'):
        return model.model_dump()
    return model.dict()


def _parse_resume_with_ai(raw_text: str) -> dict[str, Any]:
    prompt = f"""你是资深HR分析师。请将简历解析为纯JSON（无markdown），字段如下：
{{
  "inferred_mbti": "16型人格之一",
  "mbti_description": "人格简短描述（≤60字）",
  "candidate_summary": "候选人简介（≤80字）",
  "city": "城市名称（如北京、上海），无则返回空字符串",
  "job_recommendations": [{{
    "title": "岗位名称",
    "industry": "行业（如：科技、金融、互联网）",
    "reason": "推荐理由（≤30字）",
    "match_level": "高或中",
    "match_score": 0-100整数,
    "missing_skills": ["缺失技能1", "缺失技能2"],
    "career_path": "成长路径（如：初级→中级→高级）",
    "salary_range": {{"min_salary": 15, "max_salary": 25, "city": "城市"}}
  }}],
  "resume_diagnosis": {{
    "typos": [{{"original": "原文片段", "suggestion": "正确写法"}}],
    "grammar_issues": [{{"original": "原句", "suggestion": "改进表达"}}],
    "redundancy": [{{"original": "冗余片段", "suggestion": "简化表达"}}],
    "overall_score": 1-100整数,
    "overall_comment": "一句话评价（≤30字）"
  }}
}}

【推断MBTI规则】软技能权重>技术栈：
- E判断：简历出现团队、领导、公开演讲、跨部门、协调等 → E；无以上信号且明确描述独立工作 → I
- N判断：战略、创新、系统设计、跨领域 → N；注重细节、流程执行 → S
- T判断：数据驱动、逻辑分析 → T；关注团队氛围、用户体验 → F
- J判断：项目管理、按时交付、结构化 → J；灵活应变、创意发散 → P

简历文本如下：
{safe_text}
"""
    response = client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return _to_json_with_fallback(response.choices[0].message.content)


def _score_resume_with_ai(raw_text: str, target_position: str, target_company: str = "", preferred_locations: list[str] | None = None) -> dict[str, Any]:
    company_context = f"\n【目标公司】{target_company}" if target_company.strip() else ""
    location_context = f"\n【期望工作地】{', '.join(preferred_locations)}" if preferred_locations else ""
    prompt = f"""你是一个资深 HR 分析师。请根据简历和目标岗位，对候选人进行六维度评分。
{company_context}{location_context}
【目标岗位】{target_position}

六维度评分标准（每项 1-5 分，步进 0.5）：

1. 学历背景匹配度：5分=硕士+985/211+专业对口；4分=普通本科+专业对口；3分=本科+专业不符；2分=大专；1分=学历明显不足
2. 实习经历匹配度：5分=同行业同岗≥2段或单段≥6月+有成果；4分=同行业相关岗或不同行业同岗；3分=有实习但关联一般；2分=无关实习；1分=无实习
3. 基础技能匹配度：5分=满足90%+核心技能+有精通项；4分=满足70%+核心技能；3分=满足约一半；2分=少量基础技能；1分=几乎无相关技能
4. 项目经验匹配度：5分=同类项目+可量化成果；4分=同类项目+有成果；3分=相关但成果一般；2分=项目少且不相关；1分=几乎无项目
5. 软素质匹配度：5分=多处具体事例体现高度匹配；4分=有明确事例；3分=体现一般；2分=较弱；1分=完全不匹配
6. 职业稳定性：5分=路径清晰连贯+每段≥6月+城市一致；4分=稳定+城市一致；3分=基本稳定；2分=多段短期或需跨省搬迁；1分=极度不稳定

【输出】严格纯 JSON（无 markdown），必须包含字段：validation_warnings[], candidate/education|experience|skills|projects|soft_skills|stability 各含score(0.5-5)和reason，position_requirements 同上结构，overall_match(0-100)，match_summary。

规则：
- score 只允许 0.5 步进（如 3.5、4.5），不要只给整数
- validation_warnings：检查岗位/公司/城市的逻辑一致性，不合理才警告，合理返回[]
- overall_match：基于候选人得分与岗位要求差距加权计算 0-100
- match_summary：一句话总结优势与不足
- 应届生无工作经验：stability 给 3 分
- 如指定目标公司（字节/腾讯/阿里/华为等头部大厂），岗位要求分数通常更高
- 严格 JSON 格式，不要 markdown 代码块

简历文本如下：
{raw_text}
"""
    response = client.chat.completions.create(
        model=ZHIPU_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    raw = response.choices[0].message.content
    try:
        parsed_data = _to_json_with_fallback(raw)
        
        # --- Python 端精确校验手机号 ---
        phone_text = parsed_data.get("extracted_phone", "")
        diag = parsed_data.get("resume_diagnosis", {})
        if "contact_info" not in diag:
            diag["contact_info"] = []
            
        if phone_text:
            pure_digits = re.sub(r'\D', '', phone_text)
            if len(pure_digits) != 11:
                deduct = 3
                diag["contact_info"].append({
                    "original": phone_text,
                    "suggestion": f"手机号位数错误！纯数字为{len(pure_digits)}位，国内手机号应为11位，请严格核实。",
                    "deduction": deduct
                })
                if isinstance(diag.get("overall_score"), int):
                    diag["overall_score"] = max(0, diag["overall_score"] - deduct)
        else:
            fallback_matches = re.findall(r'(?:\+86\s*)?1[3-9][\d\s\-]{8,15}', raw_text)
            if fallback_matches:
                fallback_phone = fallback_matches[0]
                pure_digits = re.sub(r'\D', '', fallback_phone)
                if len(pure_digits) != 11:
                    deduct = 3
                    diag["contact_info"].append({
                        "original": fallback_phone,
                        "suggestion": f"检测到疑似手机号，纯数字为{len(pure_digits)}位，应为11位，请严格核实。",
                        "deduction": deduct
                    })
                    if isinstance(diag.get("overall_score"), int):
                        diag["overall_score"] = max(0, diag["overall_score"] - deduct)
            else:
                deduct = 5
                diag["contact_info"].append({
                    "original": "",
                    "suggestion": "未提供有效手机号码，请务必补充以便HR联系。",
                    "deduction": deduct
                })
                if isinstance(diag.get("overall_score"), int):
                    diag["overall_score"] = max(0, diag["overall_score"] - deduct)
                    
        # --- Python 端校验邮箱 ---
        email_matches = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
        if not email_matches:
            deduct = 2
            diag["contact_info"].append({
                "original": "",
                "suggestion": "未提供邮箱，建议补充以便HR联系。",
                "deduction": deduct
            })
            if isinstance(diag.get("overall_score"), int):
                diag["overall_score"] = max(0, diag["overall_score"] - deduct)

        return parsed_data
    except ValueError:
        print("=====================================")
        print("[WARN] AI 返回内容无法解析为 JSON，原始内容：")
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

输出简历时必须严格按照以下结构和顺序，逐项输出完整简历，确保每段经历都有 STAR 法则和数据支撑：

[RESUME_TEMPLATE]
姓名：xxx（电话 | 邮箱 | 城市）

1. 基本信息
   - 姓名 / 电话 / 邮箱 / 城市 / 求职意向

2. 教育背景
   - 学校 | 专业 | 学历 | 时间
   - 相关课程（选填）

3. 实习经历
   - 公司 | 岗位 | 时间
   - 使用 STAR 法则描述每段经历：
     * 情境（Situation）：项目/任务的背景
     * 任务（Task）：你的职责和目标
     * 行动（Action）：你具体做了什么
     * 结果（Result）：量化成果（数据、效率提升等）

4. 项目经历
   - 项目名称 | 时间
   - 技术栈：列出使用的技术
   - 个人贡献：你在项目中的具体角色和工作
   - 数据结果：可量化的成果数据

5. 技能
   - 编程语言：Python / Java / C++ 等
   - AI 工具：LangChain / RAG / Prompt Engineering / Fine-tuning 等
   - 开发工具：Git / Docker / Linux 等

6. 自我评价
   - 30-50字，突出核心竞争力和职业态度

【重要】如果上下文中已有用户的简历信息和技能标签，不要询问用户的基本信息（姓名、学历、技能、经历等），直接基于已有数据分析并给出建议。如果内容较多、简历较长，先输出最关键的信息，确保简历格式完整。"""

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

# ── 面试通用规则（三个阶段共用） ──
INTERVIEW_COMMON_RULES = """
【通用行为规范 - 所有面试阶段必须遵守】

▲ 追问要求（每道题必做）：
  候选人回答后，你必须做以下判断：
  - 回答较简短/表面 → 追问2-3个细节，深入挖掘
  - 回答较充分 → 至少追问1个细节，再过渡到下一题
  - 追问要结合候选人的具体回答内容，不能泛泛而问

▲ 问题衔接要求（每道题必做）：
  每个新问题之前必须有自然的过渡语，让对话流畅连贯。
  差的衔接（禁止使用）：
  ❌ 直接抛出问题，没有任何过渡
  ❌ 机械地说"下一题""下一个问题"

▲ 面试过程中绝对不能做的事情：
  - 不能说"评分""得分""分数""打分"
  - 不能说"回答得很好""不错""优秀""很好"等评价性语言
  - 不能给任何数字或等级
  - 不能做任何形式的评价或反馈（所有反馈集中在最后给出）

【面试流程】

第一步 - 开场：
  一句自然开场白 + 过渡到第1题，使用 [Q:1] 标记第一题

第二步 - 进行中：
  用户回答 → 追问细节 → 自然过渡 → 下一题
  - 追问使用 [追问] 标记
  - 新问题使用 [Q:N] 标记
  - [追问] 和 [Q:N] 不要在同一句中出现

【🔥 强制规则：关于 [Q:N] 标记】
  每次问一个新的面试题时，必须在题目开头使用 [Q:N] 标记。
  N 的编号必须严格递增：第一个问题 [Q:1]，第二个问题 [Q:2]，第三个问题 [Q:3]……
  追问（follow-up）用 [追问]，不要用 [Q:N]。
  这是系统追踪面试进度的唯一方式，如果忘记使用 [Q:N]，面试进度将无法正常显示，请务必遵守。

第三步 - 结束：
  所有题目完成后，先使用 [面试结束] 标记，
  然后输出详细的【结构化反馈】（见下方要求）。

【结构化反馈要求 - 非常重要】

反馈必须严格按照下面的【输出格式】来写，不要使用任何 markdown 符号：

一、回答亮点：
逐条列出至少3-5条，每条结合候选人的具体回答。每条单独一行，用"1. "开头。

二、可以提升的地方：
逐条列出至少3-5条，每条给出具体的改进建议。每条单独一行，用"1. "开头。

【输出格式 - 必须严格遵守】

一、回答亮点：
（空一行）
1. 第一条亮点的具体内容，结合候选人实际回答来写，写完整一句话。
（空一行）
2. 第二条亮点的具体内容，结合候选人实际回答来写，写完整一句话。
（空一行）
3. 第三条亮点的具体内容，结合候选人实际回答来写，写完整一句话。
（空一行）
二、可以提升的地方：
（空一行）
1. 第一条建议的具体内容，写出具体问题和改进方法。
（空一行）
2. 第二条建议的具体内容，写出具体问题和改进方法。
（空一行）
3. 第三条建议的具体内容，写出具体问题和改进方法。

【关于换行的强制规则】
- 每个标题后面必须换行（\n）
- 每个数字编号（1. 2. 3.）必须单独占一行
- 每两条之间必须空一行（双换行）
- 段落和段落之间必须用空行隔开

【标记说明】
[Q:N] 新问题 | [追问] 追问 | [面试结束] 总结评估 | [继续下一面] 阶段过渡

【阶段过渡规则 - 重要】
阶段顺序：HR面 → 一面（专业面）→ 二面（综合面）

当当前阶段所有题目完成后：
1. 先使用 [面试结束] 标记
2. 输出完整的【结构化反馈】
3. 然后主动询问候选人是否要继续下一轮面试

如果候选人同意继续：
4. 在下一轮开始时使用 [继续下一面] 标记
5. 自然过渡到下一阶段，用新阶段的对应风格提问
6. 使用 [Q:1] 标记下一阶段的第一个问题

如果候选人拒绝继续：
4. 正常结束面试
"""

# ── 用户身份规则 ──
IDENTITY_RULES = {
    "intern": """
【用户身份：找实习】
根据以下规则调整面试内容：

【禁止涉及】
- ❌ 薪资待遇、五险一金、福利补贴等话题
- ❌ 离职原因（不适用）
- ❌ 工作空窗期（不适用）

【允许范围】
- ✅ 如果简历中有实习经历，可以正常追问实习相关内容
- ✅ 考察学习能力、发展潜力、专业基础
- ✅ 职业规划以学习方向和成长路径为主

【面试风格】
引导式为主，关注潜力和学习能力
""",
    "fresh": """
【用户身份：应届生秋招/春招】
根据以下规则调整面试内容：

【涉及范围】
- ✅ 可以提及基础薪资预期，但不深入讨论五险一金等细节
- ❌ 离职原因（不适用）
- ❌ 工作空窗期（不适用）

【允许范围】
- ✅ 如果简历中有实习经历，可以正常追问实习相关内容
- ✅ 评估综合能力与发展潜力
- ✅ 职业规划以初期职业发展为主

【面试风格】
渐进式深挖，关注综合能力与成长性
""",
    "experienced": """
【用户身份：有工作经验】
根据以下规则调整面试内容：

【必须包含】
- ✅ 离职原因/跳槽动机（必问）
- ✅ 薪资福利待遇，涉及五险一金、年终奖等
- ⚠️ 如有空窗期，可温和询问

【允许范围】
- ✅ 所有问题以真实工作经历为基础
- ✅ 追问实战经验、项目复杂度
- ✅ 职业规划以中期发展和管理/专家路线为主

【面试风格】
刨根问底，关注实战深度与决策能力
""",
}

# ── 女性婚育偏见模拟训练（HR面专用） ──
GENDER_BIAS_HR_PROMPT = """
【特殊训练环节 - HR面倒数第2题附近】

由于面试者是「女性」且「非找实习」，请在HR面倒数第2题和反问环节之间，自然插入1-2道婚育相关的职场潜在偏见话题。

这不是真实的企业筛选标准，而是一种「模拟训练」——帮助用户面对职场上可能遇到的不公平问题，练习如何从容应对。

【提问要求】
- 语气委婉但意图明显，让用户能感受到这是关于婚育/家庭平衡的试探
- 问题要贴近真实职场场景，保持HR友善关心的口吻。示例如下：
  1) "我们这个岗位需要比较长期的投入，想问一下你近期有没有结婚或者生育方面的计划呢？"
  2) "你条件很优秀，但坦白说我们也有些担心——之前招过年轻女员工入职不久就休产假了，项目中间断档影响挺大的。你这边会有这个顾虑吗？"
- 不要一次性抛完，自然地作为面试后半段的题目依次提出
- 用户回答后正常追问，追问要结合她的回答，不要主动给模板或建议

【原则】
- 保持面试官立场，不要跳出来说"这是模拟训练"
- 所有反馈统一在面试结束后的结构化反馈中给出
- 在最后的反馈中单独点名这部分的表现，并提供专业的应对建议和话术模板
"""

# ── HR 面 Prompt ──
HR_INTERVIEW_PROMPT = """你正在主持一场 HR 面试。你的角色是一位专业、亲和力强的 HR 面试官。

【你的面试官人设】
- 你在公司负责招聘和人才评估，面试风格亲切友好但有结构
- 你关注的是"这个人是否适合公司"而非"技术能力是否够强"
- 你善于倾听，会在候选人回答的基础上自然追问
- 语气温暖、鼓励，但问题有深度

【本阶段考察核心】
重点评估候选人在以下五个维度的表现：
1. 沟通表达：是否条理清晰、表达流畅
2. 自我认知：是否了解自己的优劣势、有清晰的职业规划
3. 求职动机：为什么选择这个行业/公司/岗位
4. 团队适配：协作风格、冲突处理方式
5. 稳定性与成长意愿：是否有长期发展的规划

【提问风格指引】
- 多问"为什么""你是怎么看的""你有什么感受"——关注动机和思考过程
- 追问方向：追问具体事例、追问感受和想法、追问背后的原因
- 问题要具体，不要泛泛地问"你的优缺点是什么"，可以换成"在过往经历中，你觉得哪件事最难处理，为什么？"

好的追问示例：
✅ "你刚才提到想加入我们公司，具体是看中我们哪方面的特点呢？"
✅ "你说你擅长团队协作，能分享一个你处理团队分歧的具体例子吗？"
✅ "你提到职业规划是往管理方向发展，是什么契机让你想做管理呢？"

【出题指引】
根据用户身份和简历内容灵活出题，覆盖以下维度（不必每道题都出，但需确保覆盖主要维度）：
- 自我介绍与简历亮点提炼
- 求职动机与行业/公司认知
- 团队协作风格与冲突处理
- 优劣势自我认知与改进意识
- 职业规划与成长意愿

薪资/反问类问题请严格遵守用户身份规则处理。

一共 8 题。

【评估维度和反馈重点】
面试结束后的反馈需从以下维度给出评价：
- 表达沟通：逻辑清晰度、语言组织
- 自我认知：对自己优劣势的认识深度
- 求职动机：目标明确度、与岗位的匹配度
- 团队适配：协作能力、冲突处理
- 发展意愿：规划合理性、成长意愿

现在开始吧。"""

# ── 一面（专业面）Prompt ──
FIRST_TECH_INTERVIEW_PROMPT = """你正在主持一场技术面试。你的角色是一位资深技术专家 / Tech Lead。

【你的面试官人设】
- 你有深厚的技术背景，面试风格严谨、刨根问底
- 你关注的是候选人的技术深度、项目经验和解决问题的能力
- 你会抓住候选人回答中的技术细节进行追问，直到评估出真实水平
- 语气专业、直接，但不刻薄

【本阶段考察核心】
重点评估候选人在以下五个维度的表现：
1. 技术基础：计算机基础、语言/框架掌握程度
2. 项目深度：在项目中的角色、技术选型考量、难点攻克
3. 编码思维：解决问题的思路、方案推演能力
4. 场景设计：面对开放问题的分析和拆解能力
5. 技术视野：对行业技术的关注度、学习能力

【提问风格指引】
- 多问"具体怎么实现的""技术选型是怎么考虑的""遇到过什么难点"
- 追问方向：追问技术细节、追问决策过程、追问如果重来会怎么做
- 对模糊的回答要持续深挖，直到候选人的技术边界清晰呈现
- 如果候选人提到技术名词，默认追问他对该技术的理解深度

好的追问示例：
✅ "你刚才说用了 Redis 做缓存，能说说你们当时为什么选 Redis 而不是 Memcached 吗？"
✅ "这个接口的 QPS 大概是多少？你是怎么优化的？优化前后数据对比如何？"
✅ "你说遇到了性能瓶颈，排查思路是怎样的？最终定位到是什么原因？"

【出题指引】
根据用户身份和简历内容灵活出题，覆盖以下维度：
- 技术基础摸底（根据简历技能定制）
- 项目经历深挖（简历中最核心的项目，追问角色、难点、选型）
- 问题解决能力（让候选人推演一个实际场景）
- 技术视野与学习方向

项目相关的问题必须基于简历中的实际经历。如果简历中有实习或工作项目，可以深入追问。
一共 8 题。

【评估维度和反馈重点】
面试结束后的反馈需从以下维度给出评价：
- 专业知识：知识掌握的深度和广度
- 实操经验：项目的复杂度、候选人的贡献度
- 逻辑思维：分析能力、方案合理性
- 问题解决：问题拆解与搞定能力、设计思维
- 学习能力：技术热情、学习能力

现在开始吧。"""

# ── 二面（综合面）Prompt ──
SECOND_COMBO_INTERVIEW_PROMPT = """你正在主持一场综合面试。你的角色是一位技术总监 / 架构师级别的面试官。

【你的面试官人设】
- 你有丰富的技术管理和架构经验，面试风格高瞻远瞩、注重全局思维
- 你关注的是候选人的架构能力、业务理解、跨团队协作和领导力潜力
- 你会通过开放性和战略性问题，评估候选人的思维高度和判断力
- 语气沉稳、有深度，像在跟同行交流

【本阶段考察核心】
重点评估候选人在以下五个维度的表现：
1. 架构思维：系统设计能力、技术选型的权衡取舍
2. 业务理解：对业务的认识深度、技术与业务的结合能力
3. 关键决策：面对复杂情况的判断力和决策逻辑
4. 跨团队协作：推动跨部门项目的能力、影响力
5. 技术领导力：技术判断力、团队培养意识、技术方向规划

【提问风格指引】
- 多问"你是怎么权衡的""如果有足够的资源你会怎么做""你怎么评估方案的优劣"
- 追问方向：追问决策背后的 trade-off、追问对不同方案的比较、追问对未来的规划
- 问题偏开放，看候选人如何拆解和构建回答框架
- 关注思考过程多于标准答案

好的追问示例：
✅ "你选择了微服务架构，能说说你判断该进行服务拆分的时机和标准是什么？"
✅ "如果让你重新设计这个系统，你会做出哪些不同的选择？为什么？"
✅ "跨部门合作时，你推动的项目优先级被其他部门质疑过吗？你是怎么处理的？"

【出题指引】
根据用户身份和简历内容灵活出题，覆盖以下维度：
- 关键决策与判断力（工作中的重要选择及考量）
- 协作与影响力（跨团队/跨角色合作经历）
- 业务理解与技术驱动（技术与业务的结合能力）
- 深度探讨（针对简历中体现最深的方向进行追问）
- 反向提问（由候选人提问，考察关注点和思考层次）

问题难度和深度请根据用户身份调整。如果经验较少，可适当降低抽象度，结合实际经历来问。
一共 6 题。

【评估维度和反馈重点】
面试结束后的反馈需从以下维度给出评价：
- 系统思维：宏观设计能力、判断力
- 高压决策：复杂情况下的决策逻辑
- 协同影响：跨团队推动能力、影响力
- 业务敏锐：业务理解深度、商业敏感度
- 发展潜力：领导力潜质、成长空间

现在开始吧。"""


class ChatMessage(BaseModel):
    role: str
    content: str


class ScorePosition(BaseModel):
    title: str
    company: str = ""
    locations: list[str] = []


class ScoreRequest(BaseModel):
    resume_text: str
    positions: list[ScorePosition] = []  # 支持多岗位对比


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
    }

    if request.mode == "interview_sim":
        # 根据面试阶段选择对应的 Prompt
        stage_prompts = {
            "hr": HR_INTERVIEW_PROMPT,
            "first": FIRST_TECH_INTERVIEW_PROMPT,
            "second": SECOND_COMBO_INTERVIEW_PROMPT,
        }
        system = stage_prompts.get(request.interview_state.interview_stage, HR_INTERVIEW_PROMPT)
        system += INTERVIEW_COMMON_RULES

        # 注入身份规则
        identity = request.interview_state.identity or ""
        if identity in IDENTITY_RULES:
            system += IDENTITY_RULES[identity]

        # 注入称呼规则：有经验者按性别称呼，实习/应届用同学
        gender = request.interview_state.gender or ""
        if identity == "experienced":
            if gender == "male":
                system += "\n【称呼规则】全程使用「先生」称呼面试者。\n"
            elif gender == "female":
                system += "\n【称呼规则】全程使用「女士」称呼面试者。\n"
        elif identity in ("intern", "fresh"):
            system += "\n【称呼规则】全程使用「同学」称呼面试者。\n"

        # 注入女性婚育偏见模拟训练（HR面 + 女性 + 非找实习）
        if (request.interview_state.interview_stage == "hr"
                and request.interview_state.gender == "female"
                and identity != "intern"):
            system += GENDER_BIAS_HR_PROMPT
    else:
        system = mode_prompts.get(request.mode, DEFAULT_SYSTEM_PROMPT)

    # 如果有简历上下文，在 system prompt 最前面注入简历数据
    ctx = request.resume_context
    print(f"[DEBUG] has_resume={ctx.has_resume}, has_text={bool(ctx.resume_text)}, has_skills={bool(ctx.extracted_skills)}, has_diag={ctx.resume_diagnosis is not None}")
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
            resume_block += f"\n【简历原文】\n{ctx.resume_text[:6000]}\n"

        # 结构化经历数据
        if ctx.education:
            resume_block += f"\n教育背景:\n"
            for e in ctx.education:
                resume_block += f"  - {e.get('school','')} | {e.get('major','')} | {e.get('degree','')} | {e.get('period','')}\n"

        if ctx.experience:
            resume_block += f"\n实习/工作经历:\n"
            for e in ctx.experience:
                resume_block += f"  - {e.get('company','')} | {e.get('position','')} | {e.get('period','')}\n"
                if e.get('description'):
                    resume_block += f"    描述: {e['description']}\n"

        if ctx.projects:
            resume_block += f"\n项目经历:\n"
            for p in ctx.projects:
                resume_block += f"  - {p.get('name','')} | {p.get('period','')}\n"
                if p.get('tech_stack'):
                    resume_block += f"    技术栈: {p['tech_stack']}\n"
                if p.get('contribution'):
                    resume_block += f"    贡献: {p['contribution']}\n"
                if p.get('result'):
                    resume_block += f"    成果: {p['result']}\n"

        if ctx.competitions:
            resume_block += f"\n竞赛/获奖:\n"
            for c in ctx.competitions:
                ranking_str = f" | {c.get('ranking','')}" if c.get('ranking') else ""
                resume_block += f"  - {c.get('name','')}（{c.get('level','')}{ranking_str}）\n"
                if c.get('description'):
                    resume_block += f"    描述: {c['description']}\n"

        if ctx.campus_experience:
            resume_block += f"\n校园经历:\n"
            for c in ctx.campus_experience:
                resume_block += f"  - {c.get('organization','')} | {c.get('role','')} | {c.get('period','')}\n"
                if c.get('description'):
                    resume_block += f"    描述: {c['description']}\n"

        if ctx.self_evaluation:
            resume_block += f"\n自我评价: {ctx.self_evaluation}\n"

        force_rules = """
[强制规则 - 必须100%遵守]
用户已经上传了完整的简历。"【简历原文】"中是完整的简历文本，结构化摘要（教育背景/实习经历等）仅为辅助提炼。
1. **优先查看【简历原文】**中的完整文本获取信息，结构化摘要可能不完整。
2. 禁止询问任何简历中已有的信息，包括：姓名、学历、专业、学校、技能、工作经验、项目经历、城市等
3. 直接基于简历数据回答用户的问题
4. 回答时要引用具体的简历内容（如"我看到你有XX技能"、"根据你的XX经历"）
5. 如果用户问的是简历中没有的细节（如具体某段经历的补充信息），可以请用户补充
6. 绝对不要以"请先告诉我以下信息"开头
7. **绝不编造简历内容**。对于简历中没有详细描述的经历（仅有名称无具体内容），
   保持原样并引导用户补充，不得自行编造工作内容、项目细节、成果数据等。

"""
        system = resume_block + force_rules + system

    # 如果是面试模拟模式，添加面试状态信息
    metadata = {"rag_status": "disabled", "rag_sources": []}

    if request.mode == "interview_sim":
        interview_state = request.interview_state

        # 注入面试配置（阶段 + JD）
        stage_names = {"hr": "HR 面", "first": "一面（专业面）", "second": "二面（综合面）"}
        stage_descriptions = {
            "hr": "软素质 / 文化适配 / 职业规划",
            "first": "技术深度 / 项目经验 / 问题解决",
            "second": "架构思维 / 业务理解 / 技术领导力",
        }
        stage_name = stage_names.get(interview_state.interview_stage, "未指定")
        stage_desc = stage_descriptions.get(interview_state.interview_stage, "")
        interview_config = f"""

【面试配置】
面试岗位: {interview_state.target_position or "未指定"}
面试阶段: {stage_name}
考察重点: {stage_desc}
题目总数: {interview_state.total_questions} 题
"""
        if interview_state.jd_text:
            interview_config += f"""

【岗位JD】
{interview_state.jd_text[:2000]}

[注意] 请围绕JD中的技能要求和岗位职责出题，问题要有针对性。"""

        if interview_state.is_active or interview_state.current_question_index > 0:
            progress_info = f"""

【面试模拟状态】
目标岗位: {interview_state.target_position or "未指定"}
面试阶段: {stage_name}（{stage_desc}）
当前进度: 第 {interview_state.current_question_index}/{interview_state.total_questions} 题
"""
            interview_config += progress_info

        system = interview_config + system

        # 注入 RAG 上下文（如果有）
        if rag_context:
            system = rag_context + "\n\n" + system

    messages = [{"role": "system", "content": system}]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    return messages, metadata


def _strip_markers(text: str) -> str:
    """移除面试标记 [Q:N]、[追问]、[面试结束]、[继续下一面]，保留标记后的空白和换行"""
    text = re.sub(r'\[Q:\d+\]', '', text)
    text = re.sub(r'\[追问\]', '', text)
    text = re.sub(r'\[面试结束\]', '', text)
    text = re.sub(r'\[继续下一面\]', '', text)
    return text.strip()


def _ensure_feedback_format(text: str) -> str:
    """
    确保反馈文本有正确的换行格式。
    AI 有时会把编号项写成连续段落（一、回答亮点：1.xxx2.xxx），
    这里先清掉已有换行，再统一在每个章节标题和数字条目前插入换行。
    """
    # 1. 清掉所有已有换行（统一从平铺文本开始处理）
    text = re.sub(r'\n+', '', text)
    # 2. 在章节标题前插入双换行（如 "一、回答亮点""二、可以提升的地方"）
    text = re.sub(r'(?=[一二三四五六七八九十]、)', '\n\n', text)
    # 3. 在数字编号前插入双换行（如 "1. xxx""2、xxx"），避免误伤版本号如 1.0
    text = re.sub(r'(?<!\d)(?=\d+[.、](?!\d))', '\n\n', text)
    return text.strip()


def _update_interview_state(interview_state: InterviewState, clean_reply: str) -> InterviewState | None:
    """处理面试状态更新，返回更新后的状态（如果没有变化返回 None）"""
    new_state = copy.deepcopy(interview_state)

    if new_state.is_active:
        # 检测 [继续下一面] 标记 → 过渡到下一阶段（优先处理）
        if '[继续下一面]' in clean_reply:
            next_map = {"hr": "first", "first": "second", "second": ""}
            next_stage = next_map.get(new_state.interview_stage, "")
            if next_stage:
                new_state.interview_stage = next_stage
                new_state.current_question_index = 1
                new_state.is_active = True
                if next_stage == "hr":
                    new_state.total_questions = 8
                elif next_stage == "first":
                    new_state.total_questions = 8
                elif next_stage == "second":
                    new_state.total_questions = 6
        # 检测 [面试结束] 标记
        elif '[面试结束]' in clean_reply or '面试结束' in clean_reply:
            new_state.is_active = False
            new_state.current_question_index = new_state.total_questions
        else:
            # 正常面试进行中：每轮 AI 回答算一题
            new_state.current_question_index = min(new_state.current_question_index + 1, new_state.total_questions)
    else:
        # 非活跃状态：可能刚启动、或刚结束上一轮面试等待用户决定
        # 优先检测 [继续下一面] — 用户同意继续下一轮面试，AI 已发出标记
        if '[继续下一面]' in clean_reply:
            next_map = {"hr": "first", "first": "second", "second": ""}
            next_stage = next_map.get(new_state.interview_stage, "")
            if next_stage:
                new_state.interview_stage = next_stage
                new_state.current_question_index = 1
                new_state.is_active = True
                identity = new_state.identity or ""
                if next_stage == "hr":
                    new_state.total_questions = 8
                elif next_stage == "first":
                    new_state.total_questions = 8
                elif next_stage == "second":
                    new_state.total_questions = 6
                return new_state

        # 上一轮面试已完全结束，不再继续
        if new_state.current_question_index >= new_state.total_questions and new_state.total_questions > 0:
            return None

        # 首次启动面试
        new_state.is_active = True
        new_state.current_question_index = 1
        identity = new_state.identity or ""
        if new_state.interview_stage == "hr":
            new_state.total_questions = 8
        elif new_state.interview_stage == "first":
            new_state.total_questions = 8
        elif new_state.interview_stage == "second":
            new_state.total_questions = 6

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
        print(f"[WARN] RAG 检索失败（降级为纯AI）: {e}")
        return "", "fallback", []


@app.post("/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    try:
        rag_context, rag_status, rag_sources = await _do_rag(request)
        messages, metadata = _build_chat_messages(request, rag_context=rag_context)

        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=messages,
        )
        reply = response.choices[0].message.content

        has_resume_template = "[RESUME_TEMPLATE]" in reply
        clean_reply = reply.replace("[RESUME_TEMPLATE]", "").strip()

        updated_interview_state = None
        if request.mode == "interview_sim":
            updated_interview_state = _update_interview_state(request.interview_state, clean_reply)
            clean_reply = _strip_markers(clean_reply)
            clean_reply = _ensure_feedback_format(clean_reply)

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

        is_interview = request.mode == "interview_sim"

        def generate():
            full_reply = ""
            buf = ""  # 缓冲区，避免标记被 chunk 边界切断
            stream = client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_reply += content
                    if is_interview:
                        buf += content
                        # 只有当缓冲区末尾不可能是标记开头时才输出
                        # 标记都以 "[" 开头，最长标记约 12 字符
                        safe_end = len(buf)
                        for i in range(len(buf) - 1, max(-1, len(buf) - 15), -1):
                            if buf[i] == '[':
                                safe_end = i
                                break
                        if safe_end > 0:
                            clean = _strip_markers(buf[:safe_end])
                            clean = _ensure_feedback_format(clean)
                            buf = buf[safe_end:]
                            # 检测完整的 [Q:N] 标记并发送实时进度事件
                            q_event = re.match(r'^\[Q:(\d+)\]', buf)
                            if q_event:
                                yield f"data: {json.dumps({'type': 'q', 'index': int(q_event.group(1))}, ensure_ascii=False)}\n\n"
                            # 检测 [追问] 标记，前端用来打标签
                            elif re.match(r'^\[追问\]', buf):
                                yield f"data: {json.dumps({'type': 'f'}, ensure_ascii=False)}\n\n"
                            if clean:
                                yield f"data: {json.dumps({'type': 'chunk', 'content': clean}, ensure_ascii=False)}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'chunk', 'content': content}, ensure_ascii=False)}\n\n"

            # 输出缓冲区剩余内容
            if is_interview and buf:
                # 检测剩余内容中的 [Q:N] 和 [追问] 标记
                for m in re.finditer(r'\[Q:(\d+)\]', buf):
                    yield f"data: {json.dumps({'type': 'q', 'index': int(m.group(1))}, ensure_ascii=False)}\n\n"
                if re.search(r'\[追问\]', buf):
                    yield f"data: {json.dumps({'type': 'f'}, ensure_ascii=False)}\n\n"
                clean = _strip_markers(buf)
                clean = _ensure_feedback_format(clean)
                if clean:
                    yield f"data: {json.dumps({'type': 'chunk', 'content': clean}, ensure_ascii=False)}\n\n"

            # 所有 token 发送完毕，发送 done 事件
            has_resume_template = "[RESUME_TEMPLATE]" in full_reply
            clean_reply = full_reply.replace("[RESUME_TEMPLATE]", "").strip()

            updated_interview_state = None
            if is_interview:
                updated_interview_state = _update_interview_state(request.interview_state, clean_reply)
                clean_reply = _strip_markers(clean_reply)
                clean_reply = _ensure_feedback_format(clean_reply)

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
            "raw_text": raw_text,
            "message": "Resume parsed and structured successfully.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {exc}") from exc


@app.post("/score")
async def score_resume(request: ScoreRequest) -> dict[str, Any]:
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")
    if not request.positions:
        raise HTTPException(status_code=400, detail="At least one position is required.")
    try:
        results = []
        for pos in request.positions:
            score_data = _score_resume_with_ai(
                request.resume_text,
                pos.title,
                pos.company,
                pos.locations if pos.locations else None,
            )
            results.append({
                "title": pos.title,
                "company": pos.company,
                "locations": pos.locations,
                **score_data,
            })
        return {
            "score_status": "success",
            "score_data": results if len(results) > 1 else results[0],
            "is_multi": len(results) > 1,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)