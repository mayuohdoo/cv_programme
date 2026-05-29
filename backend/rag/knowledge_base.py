"""知识库管理 - 文档摄入、查询、删除"""

import uuid
import logging
from supabase import create_client
from .config import config
from .embedding import EmbeddingService, EmbeddingError
from .chunking import ChunkingEngine
from .models import IngestResultItem, BatchIngestResult

logger = logging.getLogger("rag.knowledge_base")


class KnowledgeBaseManager:
    """知识库管理器"""

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.chunking_engine = ChunkingEngine()
        self.supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)

    async def ingest_document(self, content: str, metadata: dict) -> IngestResultItem:
        """摄入单篇文档：验证 → 分块 → 向量化 → 存储"""
        # 验证
        if not content or not content.strip():
            return IngestResultItem(success=False, error="文档内容不能为空")

        if "category" not in metadata:
            return IngestResultItem(success=False, error="缺少 category 字段")

        try:
            # 分块
            chunks = self.chunking_engine.chunk_document(content)
            doc_id = str(uuid.uuid4())

            # 逐块向量化并存储
            for i, chunk_text in enumerate(chunks):
                embedding = await self.embedding_service.embed_text(chunk_text)

                # 构建元数据
                chunk_metadata = {
                    **metadata,
                    "source_doc_id": doc_id,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }

                # 存入 Supabase
                self.supabase.table("documents").insert({
                    "content": chunk_text,
                    "metadata": chunk_metadata,
                    "embedding": embedding
                }).execute()

            logger.info(f"文档摄入成功: {doc_id}, {len(chunks)} 个分块")
            return IngestResultItem(
                success=True,
                document_id=doc_id,
                chunks_created=len(chunks)
            )

        except EmbeddingError as e:
            return IngestResultItem(success=False, error=f"向量化失败: {e}")
        except Exception as e:
            return IngestResultItem(success=False, error=f"存储失败: {e}")

    async def ingest_batch(self, documents: list) -> BatchIngestResult:
        """批量摄入文档"""
        if len(documents) > 50:
            return BatchIngestResult(
                total=len(documents),
                failure_count=len(documents),
                results=[IngestResultItem(index=i, success=False, error="单次最多50篇") for i in range(len(documents))]
            )

        results = []
        success_count = 0
        failure_count = 0

        for i, doc in enumerate(documents):
            result = await self.ingest_document(doc.get("content", ""), doc.get("metadata", {}))
            result.index = i
            results.append(result)
            if result.success:
                success_count += 1
            else:
                failure_count += 1

        return BatchIngestResult(
            total=len(documents),
            success_count=success_count,
            failure_count=failure_count,
            results=results
        )

    async def list_documents(self, category=None, industry=None, role=None, page=1, page_size=20):
        """分页查询文档列表"""
        query = self.supabase.table("documents").select("id, content, metadata, created_at")

        if category:
            query = query.eq("metadata->>category", category)
        if industry:
            query = query.eq("metadata->>industry", industry)
        if role:
            query = query.eq("metadata->>role", role)

        # 只返回 chunk_index=0 的（代表原始文档）
        query = query.eq("metadata->>chunk_index", "0")

        offset = (page - 1) * page_size
        response = query.range(offset, offset + page_size - 1).order("created_at", desc=True).execute()

        documents = []
        for doc in (response.data or []):
            documents.append({
                "id": doc["id"],
                "content_preview": doc["content"][:100],
                "metadata": doc["metadata"],
                "created_at": doc["created_at"]
            })

        return {"documents": documents, "page": page, "page_size": page_size}

    async def delete_document(self, document_id: str) -> bool:
        """删除文档及其所有分块"""
        # 先查找该文档的 source_doc_id
        response = self.supabase.table("documents").delete().eq(
            "metadata->>source_doc_id", document_id
        ).execute()

        if response.data:
            logger.info(f"删除文档 {document_id}: {len(response.data)} 条记录")
            return True

        # 也尝试直接按 ID 删除
        response = self.supabase.table("documents").delete().eq("id", document_id).execute()
        return bool(response.data)
