"""RAG 数据模型定义"""

from enum import Enum
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime


class DocumentCategory(str, Enum):
    """文档类别"""
    QA_PAIR = "qa_pair"
    INTERVIEW_EXPERIENCE = "interview_experience"
    PROFESSIONAL_KNOWLEDGE = "professional_knowledge"
    SPEECH_TEMPLATE = "speech_template"


class DifficultyLevel(str, Enum):
    """难度等级"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class RAGStatus(str, Enum):
    """RAG 管道执行状态"""
    SUCCESS = "success"
    NO_MATCH = "no_match"
    FALLBACK = "fallback"


@dataclass
class DocumentMetadata:
    """文档元数据"""
    category: str = "interview_experience"
    industry: str = ""
    role: str = ""
    difficulty: str = "intermediate"
    company: str = ""
    source: str = ""
    original_title: str = ""
    original_url: str = ""
    source_doc_id: str = ""
    chunk_index: int = 0
    total_chunks: int = 1


@dataclass
class DocumentInput:
    """摄入请求中的单篇文档"""
    content: str
    metadata: dict = field(default_factory=dict)


@dataclass
class RAGResult:
    """RAG 管道执行结果"""
    status: RAGStatus = RAGStatus.NO_MATCH
    context_text: str = ""
    sources: list = field(default_factory=list)


@dataclass
class IngestResultItem:
    """单篇文档摄入结果"""
    index: int = 0
    success: bool = False
    document_id: str = ""
    chunks_created: int = 0
    error: str = ""


@dataclass
class BatchIngestResult:
    """批量摄入结果"""
    total: int = 0
    success_count: int = 0
    failure_count: int = 0
    results: list = field(default_factory=list)
