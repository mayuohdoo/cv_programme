# Implementation Plan: 面试辅导 RAG 知识库

## Overview

本实现计划将面试辅导 RAG 知识库设计转化为可执行的编码任务。采用自底向上的方式：先搭建基础模块（配置、嵌入服务、分块引擎），再构建核心管道（RAG Pipeline、上下文构建器），最后集成到现有聊天端点并添加管理 API。每个任务都是增量式的，确保代码始终可运行。

## Tasks

- [ ] 1. 搭建 RAG 模块基础结构和配置
  - [ ] 1.1 创建 RAG 模块目录结构和配置模块
    - 创建 `backend/rag/` 目录及 `__init__.py`
    - 创建 `backend/rag/config.py`，实现 `RAGConfig` 类（基于 pydantic-settings）
    - 包含所有环境变量配置：DeepSeek API、Supabase、RAG 参数、分块参数、管理认证
    - 更新 `requirements.txt` 添加新依赖：`supabase>=2.0.0`, `httpx>=0.25.0`, `pydantic-settings>=2.0.0`
    - _Requirements: 非功能性-安全需求3, 非功能性-可维护性2_

  - [ ] 1.2 创建 Pydantic 数据模型
    - 创建 `backend/rag/models.py`，定义所有数据模型
    - 实现枚举类型：`DocumentCategory`, `DifficultyLevel`, `RAGStatus`
    - 实现请求/响应模型：`DocumentMetadata`, `DocumentInput`, `IngestRequest`, `BatchIngestResponse`, `DocumentListResponse`, `RAGResult`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.4, 10.5_

- [ ] 2. 实现 Embedding Service
  - [ ] 2.1 实现 DeepSeek Embedding 服务
    - 创建 `backend/rag/embedding.py`
    - 实现 `EmbeddingService` 类，封装 DeepSeek Embedding API 调用
    - 实现 `embed_text(text: str) -> list[float]` 方法（单文本向量化）
    - 实现 `embed_batch(texts: list[str]) -> list[list[float]]` 方法（批量向量化）
    - 实现自定义 `EmbeddingError` 异常类
    - 添加错误处理和日志记录
    - _Requirements: 1.1, 1.2, 1.4, 5.1_

  - [ ]* 2.2 编写 Embedding Service 单元测试
    - 创建 `backend/tests/test_embedding.py`
    - 使用 mock 模拟 DeepSeek API 响应
    - 测试正常向量化、API 失败、超时等场景
    - _Requirements: 1.1, 1.4_

- [ ] 3. 实现文档分块引擎
  - [ ] 3.1 实现 ChunkingEngine 分块算法
    - 创建 `backend/rag/chunking.py`
    - 实现 `ChunkingEngine` 类，包含段落优先 + 句子边界回退 + 硬截断兜底的三级策略
    - 实现 `chunk_document(text: str) -> list[str]` 方法
    - 实现 `_split_sentences(text: str) -> list[str]` 辅助方法
    - 支持中文/英文句子边界检测
    - 确保分块大小在 200-500 字符范围内，相邻分块有 50 字符重叠
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [ ]* 3.2 编写分块引擎属性测试 - Property 2: 分块数量正确性
    - 创建 `backend/tests/test_chunking.py`
    - **Property 2: Chunking produces correct count based on length**
    - **Validates: Requirements 2.1, 2.6**
    - 使用 hypothesis 生成随机文本，验证：长度 > 500 时产生多个 chunk，长度 ≤ 500 时产生 1 个 chunk

  - [ ]* 3.3 编写分块引擎属性测试 - Property 3: 分块大小不变量
    - **Property 3: Chunk size invariant**
    - **Validates: Requirements 2.2**
    - 验证所有 chunk 长度在 200-500 字符范围内

  - [ ]* 3.4 编写分块引擎属性测试 - Property 4: 相邻分块重叠
    - **Property 4: Adjacent chunk overlap**
    - **Validates: Requirements 2.3**
    - 验证相邻 chunk 之间有 50 字符重叠

- [ ] 4. Checkpoint - 确保基础模块测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. 实现上下文构建器
  - [ ] 5.1 实现 ContextBuilder 上下文构建
    - 创建 `backend/rag/context_builder.py`
    - 实现 `ContextBuilder` 类
    - 实现 `build_context(chunks, max_length=2000) -> str` 方法
    - 按相似度降序拼接 chunk 内容，总长度不超过 2000 字符
    - 使用【知识库参考】...【/知识库参考】标记包裹
    - 超出长度时截断最低相似度的文档
    - _Requirements: 6.1, 6.3, 6.4_

  - [ ]* 5.2 编写上下文构建器属性测试 - Property 9: 上下文窗口大小限制
    - 创建 `backend/tests/test_context_builder.py`
    - **Property 9: Context window size limit and completeness**
    - **Validates: Requirements 6.1, 6.3, 6.4**
    - 验证构建的上下文不超过 2000 字符，包含正确标记，按相似度降序排列

  - [ ]* 5.3 编写上下文构建器属性测试 - Property 10: 无匹配跳过注入
    - **Property 10: No-match skips knowledge injection**
    - **Validates: Requirements 6.6**
    - 验证无匹配文档时，输出不包含【知识库参考】标记

- [ ] 6. 实现 RAG Pipeline 核心管道
  - [ ] 6.1 实现 RAG Pipeline 检索流程
    - 创建 `backend/rag/pipeline.py`
    - 实现 `RAGPipeline` 类，组合 EmbeddingService + Supabase match_documents + ContextBuilder
    - 实现 `retrieve(query: str) -> RAGResult` 方法
    - 实现相似度阈值过滤（< 0.7 返回 no_match）
    - 实现 3 秒超时控制和降级处理
    - 添加完整的错误处理和日志记录
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 6.2 编写 RAG Pipeline 属性测试 - Property 8: 相似度阈值过滤
    - 创建 `backend/tests/test_pipeline.py`
    - **Property 8: Similarity threshold filtering**
    - **Validates: Requirements 5.5**
    - 使用 mock Supabase，验证所有相似度 < 0.7 时返回 no_match 状态

  - [ ]* 6.3 编写 RAG Pipeline 属性测试 - Property 11: 优雅降级
    - **Property 11: RAG graceful degradation**
    - **Validates: Requirements 7.3, 10.2, 10.3, 10.4**
    - 模拟各种异常（Embedding 失败、数据库连接失败、超时），验证返回 fallback 状态

  - [ ]* 6.4 编写 RAG Pipeline 属性测试 - Property 12: rag_sources 一致性
    - **Property 12: rag_sources consistency with rag_status**
    - **Validates: Requirements 7.5, 7.6, 10.5**
    - 验证 status=success 时 sources 非空，status=no_match/fallback 时 sources 为空

- [ ] 7. 实现知识库管理模块
  - [ ] 7.1 实现 KnowledgeBaseManager 摄入功能
    - 创建 `backend/rag/knowledge_base.py`
    - 实现 `KnowledgeBaseManager` 类
    - 实现 `ingest_document(content, metadata) -> IngestResult` 方法（分块 → 向量化 → 存储）
    - 实现 `ingest_batch(documents) -> BatchIngestResult` 方法（批量摄入）
    - 实现文档验证：空白文本拒绝、元数据验证、批量上限 50 篇
    - 每个 chunk 继承原始文档元数据并添加 source_doc_id、chunk_index、total_chunks
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.5, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.5_

  - [ ] 7.2 实现 KnowledgeBaseManager 查询和删除功能
    - 实现 `list_documents(filters, page, page_size) -> PaginatedDocuments` 方法
    - 支持按 category、industry、role 筛选
    - 返回文档 ID、内容摘要（前 100 字符）、元数据、创建时间
    - 实现 `delete_document(document_id) -> bool` 方法
    - 删除文档时级联删除所有关联 chunk
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 7.3 编写知识库管理属性测试 - Property 1: 空白文本拒绝
    - 创建 `backend/tests/test_knowledge_base.py`
    - **Property 1: Whitespace-only text rejection**
    - **Validates: Requirements 1.5**
    - 使用 hypothesis 生成纯空白字符串，验证摄入被拒绝

  - [ ]* 7.4 编写知识库管理属性测试 - Property 5: 分块元数据继承
    - **Property 5: Chunk metadata inheritance**
    - **Validates: Requirements 2.5**
    - 验证所有 chunk 继承原始文档的完整元数据

  - [ ]* 7.5 编写知识库管理属性测试 - Property 7: 批量响应完整性
    - **Property 7: Batch response integrity**
    - **Validates: Requirements 4.3, 4.6**
    - 验证批量摄入响应中 results 数量等于输入文档数，success_count + failure_count = total

- [ ] 8. Checkpoint - 确保核心模块测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. 集成 RAG 到现有聊天端点
  - [ ] 9.1 修改 /chat 端点集成 RAG Pipeline
    - 修改 `backend/main.py` 中的 `/chat` 端点
    - 当 mode == "interview_sim" 时自动触发 RAG Pipeline
    - 实现 `execute_rag_with_fallback(query)` 函数（带 3 秒超时和降级）
    - 将 RAG 检索到的上下文注入系统提示词（位于角色设定之后、用户对话之前）
    - 在响应中添加 `rag_status` 和 `rag_sources` 字段
    - 确保 RAG 错误不中断正常聊天流程
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 6.2, 6.5, 6.6, 10.5, 10.6_

  - [ ]* 9.2 编写聊天端点 RAG 集成测试
    - 创建 `backend/tests/test_api_endpoints.py`
    - 测试 interview_sim 模式下 RAG 正常工作
    - 测试 RAG 降级场景（API 失败、超时）
    - 测试非 interview_sim 模式不触发 RAG
    - 验证响应格式包含 rag_status 和 rag_sources
    - _Requirements: 7.1, 7.2, 7.3, 10.5_

- [ ] 10. 实现知识库管理 API 端点
  - [ ] 10.1 实现管理 API 端点和认证中间件
    - 在 `backend/main.py` 中添加管理端点（或创建独立路由文件）
    - 实现 `verify_admin_key` 依赖注入（Header X-Admin-Key 验证）
    - 实现 `POST /knowledge-base/ingest` 端点（批量文档摄入）
    - 实现 `GET /knowledge-base/documents` 端点（分页查询，支持 category/industry/role 筛选）
    - 实现 `DELETE /knowledge-base/documents/{document_id}` 端点（删除文档及其 chunk）
    - 添加请求验证：批量上限 50 篇、必填字段检查
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 9.1, 9.2, 9.4, 9.6, 非功能性-安全需求1, 非功能性-安全需求2_

  - [ ]* 10.2 编写管理 API 端点测试
    - 测试认证中间件（有效/无效 API Key）
    - 测试摄入端点（正常摄入、验证错误、超出批量限制）
    - 测试查询端点（分页、筛选）
    - 测试删除端点（正常删除、404）
    - _Requirements: 4.1, 4.5, 9.1, 9.6_

- [ ] 11. 实现元数据验证属性测试
  - [ ]* 11.1 编写元数据验证属性测试 - Property 6: 枚举验证
    - 创建 `backend/tests/test_metadata.py`
    - **Property 6: Metadata enum validation**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
    - 验证 category 和 difficulty 只接受有效枚举值，无效值被拒绝
    - 验证 industry 和 role 接受任意非空字符串

  - [ ]* 11.2 编写文档列表属性测试 - Property 13 和 Property 14
    - **Property 13: Document filter correctness**
    - **Validates: Requirements 9.2**
    - **Property 14: Content preview truncation**
    - **Validates: Requirements 9.3**
    - 验证过滤查询返回的文档都匹配筛选条件
    - 验证 content_preview 等于文档内容的前 100 字符

  - [ ]* 11.3 编写级联删除属性测试 - Property 15
    - **Property 15: Cascading delete removes all chunks**
    - **Validates: Requirements 9.5**
    - 验证删除文档后，所有关联 chunk 记录被清除

- [ ] 12. 创建测试基础设施
  - [ ] 12.1 创建测试配置和共享 fixtures
    - 创建 `backend/tests/__init__.py` 和 `backend/tests/conftest.py`
    - 配置 pytest + pytest-asyncio
    - 创建共享 fixtures：mock Supabase client、mock EmbeddingService、测试用 RAGConfig
    - 添加 hypothesis 配置（max_examples=200）
    - 更新 `requirements.txt` 添加测试依赖：`pytest`, `pytest-asyncio`, `hypothesis`, `pytest-mock`, `httpx`（用于 FastAPI TestClient）
    - _Requirements: 非功能性-可维护性1_

- [ ] 13. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- 所有代码使用 Python，与现有 FastAPI 后端保持一致
- 测试使用 pytest + hypothesis 框架
- RAG 模块作为独立包组织在 `backend/rag/` 下，与现有 `main.py` 解耦

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "12.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "3.4", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1", "7.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 5, "tasks": ["9.1", "10.1", "11.1", "11.2", "11.3"] },
    { "id": 6, "tasks": ["9.2", "10.2"] }
  ]
}
```
