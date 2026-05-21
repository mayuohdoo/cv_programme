"""Embedding Service - 封装 DeepSeek Embedding API"""

import logging
import httpx
from .config import config

logger = logging.getLogger("rag.embedding")


class EmbeddingError(Exception):
    """Embedding API 调用失败"""
    pass


class EmbeddingService:
    """向量嵌入服务"""

    def __init__(self):
        self.api_key = config.DEEPSEEK_API_KEY
        self.base_url = config.DEEPSEEK_BASE_URL
        self.model = config.DEEPSEEK_EMBEDDING_MODEL

    async def embed_text(self, text: str) -> list:
        """将单段文本转换为向量"""
        if not text or not text.strip():
            raise EmbeddingError("文本不能为空")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "input": text,
                        "encoding_format": "float"
                    }
                )

                if response.status_code != 200:
                    raise EmbeddingError(f"API 返回 {response.status_code}: {response.text}")

                data = response.json()
                embedding = data["data"][0]["embedding"]
                logger.info(f"向量化成功: {len(text)} 字符 -> {len(embedding)} 维向量")
                return embedding

        except httpx.TimeoutException:
            raise EmbeddingError("Embedding API 超时")
        except EmbeddingError:
            raise
        except Exception as e:
            raise EmbeddingError(f"Embedding API 调用失败: {e}")

    async def embed_batch(self, texts: list) -> list:
        """批量文本向量化"""
        results = []
        for text in texts:
            embedding = await self.embed_text(text)
            results.append(embedding)
        return results
