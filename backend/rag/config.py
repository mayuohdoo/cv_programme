"""RAG 配置管理 - 所有参数通过环境变量控制"""

import os
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))


class RAGConfig:
    """RAG 知识库配置"""

    # DeepSeek API
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_CHAT_MODEL: str = os.getenv("DEEPSEEK_CHAT_MODEL", "deepseek-chat")
    DEEPSEEK_EMBEDDING_MODEL: str = os.getenv("DEEPSEEK_EMBEDDING_MODEL", "text-embedding-v2")

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # RAG Pipeline 参数
    RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "3"))
    RAG_SIMILARITY_THRESHOLD: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.7"))
    RAG_TIMEOUT_SECONDS: float = float(os.getenv("RAG_TIMEOUT_SECONDS", "3"))
    RAG_CONTEXT_MAX_LENGTH: int = int(os.getenv("RAG_CONTEXT_MAX_LENGTH", "2000"))

    # 分块参数
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))
    CHUNK_MIN_SIZE: int = int(os.getenv("CHUNK_MIN_SIZE", "200"))

    # 管理端点认证
    KNOWLEDGE_BASE_ADMIN_KEY: str = os.getenv("KNOWLEDGE_BASE_ADMIN_KEY", "")


# 全局配置实例
config = RAGConfig()
