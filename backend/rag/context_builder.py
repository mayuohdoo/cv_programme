"""上下文构建器 - 将检索结果构建为可注入提示词的上下文"""

from .config import config


class ContextBuilder:
    """将检索到的文档片段构建为知识库上下文窗口"""

    def __init__(self):
        self.max_length = config.RAG_CONTEXT_MAX_LENGTH

    def build_context(self, chunks: list) -> str:
        """
        构建知识库上下文窗口

        Args:
            chunks: 检索到的文档片段列表，每个元素是 dict，包含 content 和 similarity
        Returns:
            格式化的上下文文本，使用标记包裹
        """
        if not chunks:
            return ""

        # 按相似度降序排列
        sorted_chunks = sorted(chunks, key=lambda x: x.get("similarity", 0), reverse=True)

        # 拼接内容，不超过最大长度
        context_parts = []
        total_length = 0

        for chunk in sorted_chunks:
            content = chunk.get("content", "")
            if total_length + len(content) + 10 > self.max_length:
                # 截断
                remaining = self.max_length - total_length - 10
                if remaining > 50:
                    context_parts.append(content[:remaining] + "...")
                break
            context_parts.append(content)
            total_length += len(content) + 1

        if not context_parts:
            return ""

        # 用标记包裹
        context_text = "\n\n".join(context_parts)
        return f"【知识库参考】\n{context_text}\n【/知识库参考】"
