"""文档分块引擎 - 段落优先 + 句子边界回退 + 硬截断兜底"""

import re
from .config import config


class ChunkingEngine:
    """文档分块引擎"""

    def __init__(self):
        self.chunk_size = config.CHUNK_SIZE
        self.overlap = config.CHUNK_OVERLAP
        self.min_chunk_size = config.CHUNK_MIN_SIZE

    def chunk_document(self, text: str) -> list:
        """将文档拆分为语义连贯的片段"""
        text = text.strip()
        if not text:
            return []
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        # 按段落分割
        paragraphs = re.split(r'\n\s*\n|\n', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]

        buffer = ""
        for para in paragraphs:
            if len(buffer) + len(para) + 1 <= self.chunk_size:
                buffer = buffer + "\n" + para if buffer else para
            else:
                if len(buffer) >= self.min_chunk_size:
                    chunks.append(buffer)
                    # 重叠
                    overlap_text = buffer[-self.overlap:] if len(buffer) >= self.overlap else buffer
                    buffer = overlap_text + "\n" + para
                else:
                    # buffer 太短，按句子拆分
                    sentences = self._split_sentences(para)
                    for sent in sentences:
                        if len(buffer) + len(sent) + 1 <= self.chunk_size:
                            buffer = buffer + sent if buffer else sent
                        else:
                            if len(buffer) >= self.min_chunk_size:
                                chunks.append(buffer)
                                overlap_text = buffer[-self.overlap:]
                                buffer = overlap_text + sent
                            else:
                                buffer = buffer + sent
                                if len(buffer) >= self.chunk_size:
                                    chunks.append(buffer[:self.chunk_size])
                                    overlap_text = buffer[self.chunk_size - self.overlap:self.chunk_size]
                                    buffer = overlap_text + buffer[self.chunk_size:]

        # 处理最后一个 buffer
        if buffer:
            if chunks and len(buffer) < self.min_chunk_size:
                if len(chunks[-1]) + len(buffer) + 1 <= self.chunk_size:
                    chunks[-1] = chunks[-1] + "\n" + buffer
                else:
                    chunks.append(buffer)
            else:
                chunks.append(buffer)

        return chunks

    def _split_sentences(self, text: str) -> list:
        """按中文/英文句子边界分割"""
        sentences = re.split(r'(?<=[。？！；.?!])', text)
        return [s for s in sentences if s.strip()]
