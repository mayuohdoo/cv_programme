"""RAG Pipeline - 检索增强生成管道"""

import asyncio
import logging
from supabase import create_client
from .config import config
from .embedding import EmbeddingService, EmbeddingError
from .context_builder import ContextBuilder
from .models import RAGResult, RAGStatus

logger = logging.getLogger("rag.pipeline")


class RAGPipeline:
    """RAG 检索增强生成管道"""

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.context_builder = ContextBuilder()
        self.supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)

    async def retrieve(self, query: str) -> RAGResult:
        """
        执行完整的 RAG 检索流程：
        1. 用户消息 → 查询向量
        2. 向量相似度搜索
        3. 过滤低相似度结果
        4. 构建上下文窗口
        """
        try:
            # 1. 查询向量化
            query_embedding = await self.embedding_service.embed_text(query)

            # 2. 调用 match_documents 函数
            response = self.supabase.rpc("match_documents", {
                "query_embedding": query_embedding,
                "match_threshold": config.RAG_SIMILARITY_THRESHOLD,
                "match_count": config.RAG_TOP_K
            }).execute()

            results = response.data if response.data else []

            # 3. 检查是否有匹配结果
            if not results:
                logger.info(f"无匹配文档 (query: {query[:50]}...)")
                return RAGResult(status=RAGStatus.NO_MATCH)

            # 4. 构建上下文
            chunks = [{"content": r["content"], "similarity": r["similarity"]} for r in results]
            context_text = self.context_builder.build_context(chunks)
            sources = [r["id"] for r in results]

            logger.info(f"RAG 检索成功: {len(results)} 个文档, 最高相似度 {results[0]['similarity']:.3f}")

            return RAGResult(
                status=RAGStatus.SUCCESS,
                context_text=context_text,
                sources=sources
            )

        except EmbeddingError as e:
            logger.error(f"Embedding 失败: {e}")
            return RAGResult(status=RAGStatus.FALLBACK)
        except Exception as e:
            logger.error(f"RAG Pipeline 错误: {e}")
            return RAGResult(status=RAGStatus.FALLBACK)


async def execute_rag_with_fallback(query: str) -> RAGResult:
    """带超时和降级的 RAG 执行"""
    try:
        pipeline = RAGPipeline()
        result = await asyncio.wait_for(
            pipeline.retrieve(query),
            timeout=config.RAG_TIMEOUT_SECONDS
        )
        return result
    except asyncio.TimeoutError:
        logger.warning("RAG Pipeline 超时，降级为纯 AI")
        return RAGResult(status=RAGStatus.FALLBACK)
    except Exception as e:
        logger.error(f"RAG 意外错误: {e}")
        return RAGResult(status=RAGStatus.FALLBACK)
