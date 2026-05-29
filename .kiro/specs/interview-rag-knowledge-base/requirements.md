# 需求文档：面试辅导 RAG 知识库

## 简介

本功能为现有的"面试辅导"（Interview Coaching）AI 聊天功能构建 RAG（检索增强生成）知识库后端。通过将面试常见问题、面经、行业知识和话术模板等内容向量化存储，并在用户提问时检索相关文档注入 AI 上下文，使面试辅导回答更加专业、准确、有据可依。

## 术语表

- **RAG_Pipeline**: 检索增强生成管道，负责接收用户查询、检索相关文档、将检索结果注入 AI 提示词并生成回答的完整流程
- **Embedding_Service**: 向量嵌入服务，使用 DeepSeek Embedding API 将文本转换为向量表示
- **Knowledge_Base**: 知识库，存储在 Supabase pgvector 中的向量化文档集合
- **Document_Chunk**: 文档分块，将长文档拆分后的单个文本片段及其向量表示
- **Similarity_Search**: 相似度搜索，使用 match_documents 函数在向量空间中查找与查询最相关的文档
- **Ingestion_Service**: 数据摄入服务，负责接收、分块、向量化和存储知识库文档的后端模块
- **Chat_Endpoint**: 聊天接口，现有的 `/chat` FastAPI 端点，处理面试辅导对话
- **Context_Window**: 上下文窗口，注入 AI 提示词的检索文档内容
- **Metadata_Tag**: 元数据标签，附加在文档上的分类信息（类别、行业、角色、难度等级）
- **Top_K**: 检索数量参数，指定从知识库中返回的最相关文档数量

## 需求

### 需求 1：文档向量化与存储

**用户故事：** 作为系统管理员，我希望将面试相关知识内容向量化并存储到数据库中，以便后续检索使用。

#### 验收标准

1. WHEN Ingestion_Service 接收到一篇文档时，THE Embedding_Service SHALL 调用 DeepSeek Embedding API 将文档文本转换为向量表示
2. THE Embedding_Service SHALL 返回与 Supabase pgvector documents 表 embedding 列维度一致的向量
3. WHEN 向量生成成功时，THE Ingestion_Service SHALL 将文档内容、向量和元数据存储到 Supabase documents 表中
4. IF DeepSeek Embedding API 调用失败，THEN THE Ingestion_Service SHALL 返回包含错误原因的错误响应，并记录错误日志
5. IF 文档文本为空或仅包含空白字符，THEN THE Ingestion_Service SHALL 拒绝该文档并返回验证错误

### 需求 2：长文档分块策略

**用户故事：** 作为系统管理员，我希望长文档能被合理拆分为多个片段存储，以便检索时返回精准的相关内容而非整篇文章。

#### 验收标准

1. WHEN 文档文本长度超过 500 个字符时，THE Ingestion_Service SHALL 将文档拆分为多个 Document_Chunk
2. THE Document_Chunk 长度 SHALL 控制在 200-500 个字符之间
3. THE Ingestion_Service SHALL 在相邻 Document_Chunk 之间保留 50 个字符的重叠内容，确保语义连贯性
4. THE Ingestion_Service SHALL 优先在段落边界或句子边界处进行分块，避免在句子中间截断
5. THE 每个 Document_Chunk SHALL 继承原始文档的全部 Metadata_Tag
6. WHEN 文档文本长度不超过 500 个字符时，THE Ingestion_Service SHALL 将文档作为单个 Document_Chunk 存储

### 需求 3：文档元数据标签

**用户故事：** 作为系统管理员，我希望为每篇知识库文档添加分类标签，以便后续按类别、行业或角色筛选检索结果。

#### 验收标准

1. THE Ingestion_Service SHALL 支持以下 Metadata_Tag 字段：category（类别）、industry（行业）、role（目标角色）、difficulty（难度等级）
2. THE category 字段 SHALL 接受以下值之一：qa_pair（问答对）、interview_experience（面经）、professional_knowledge（专业知识）、speech_template（话术模板）
3. THE difficulty 字段 SHALL 接受以下值之一：beginner（初级）、intermediate（中级）、advanced（高级）
4. THE industry 和 role 字段 SHALL 接受任意字符串值，允许自由标注
5. WHEN Metadata_Tag 中 category 字段缺失时，THE Ingestion_Service SHALL 拒绝该文档并返回验证错误
6. THE Metadata_Tag SHALL 与文档内容一起存储在 Supabase documents 表的 metadata 列中

### 需求 4：批量文档摄入 API

**用户故事：** 作为系统管理员，我希望通过 API 批量上传知识库文档，以便高效地填充知识库内容。

#### 验收标准

1. THE Ingestion_Service SHALL 提供 POST `/knowledge-base/ingest` 端点，接受单篇或多篇文档的上传请求
2. THE 请求体 SHALL 包含 documents 数组，每个文档对象包含 content（文本内容）和 metadata（元数据标签）字段
3. WHEN 批量上传请求包含多篇文档时，THE Ingestion_Service SHALL 逐篇处理并返回每篇文档的处理结果（成功或失败及原因）
4. THE Ingestion_Service SHALL 对单次请求中的文档数量设置上限为 50 篇
5. IF 单次请求超过 50 篇文档，THEN THE Ingestion_Service SHALL 返回 400 错误并提示分批上传
6. THE 响应 SHALL 包含成功数量、失败数量和每篇失败文档的错误详情

### 需求 5：向量相似度检索

**用户故事：** 作为面试辅导 AI，我需要根据用户的提问检索知识库中最相关的文档，以便生成有据可依的回答。

#### 验收标准

1. WHEN 用户在面试辅导聊天中发送消息时，THE RAG_Pipeline SHALL 将用户消息通过 Embedding_Service 转换为查询向量
2. THE RAG_Pipeline SHALL 调用 Supabase match_documents 函数执行 Similarity_Search，返回 Top_K 个最相关的 Document_Chunk
3. THE Top_K 默认值 SHALL 为 3，可通过配置调整
4. THE Similarity_Search SHALL 返回相似度分数（similarity score），用于判断检索结果的相关性
5. WHEN 所有检索结果的相似度分数低于 0.7 时，THE RAG_Pipeline SHALL 判定无相关文档，不注入任何知识库内容
6. THE Similarity_Search 响应时间 SHALL 不超过 2 秒

### 需求 6：检索内容注入 AI 提示词

**用户故事：** 作为面试辅导 AI，我需要将检索到的知识库内容作为参考资料注入提示词，以便生成更专业的回答。

#### 验收标准

1. WHEN RAG_Pipeline 检索到相关文档时，THE Chat_Endpoint SHALL 将检索到的 Document_Chunk 内容拼接为 Context_Window 文本
2. THE Context_Window SHALL 插入到面试辅导系统提示词中，位于角色设定之后、用户对话之前
3. THE Context_Window 文本总长度 SHALL 不超过 2000 个字符，超出时截断最低相似度的文档
4. THE Context_Window SHALL 使用明确的标记格式包裹（如"【知识库参考】...【/知识库参考】"），帮助 AI 区分参考资料和对话内容
5. THE 注入的提示词 SHALL 指示 AI 参考知识库内容回答，但允许 AI 结合自身知识进行补充
6. WHEN 无相关文档被检索到时，THE Chat_Endpoint SHALL 跳过知识库注入步骤，使用纯 AI 能力回答

### 需求 7：现有聊天端点集成

**用户故事：** 作为用户，我希望面试辅导聊天在使用知识库增强后，交互方式保持不变，无需额外操作。

#### 验收标准

1. THE Chat_Endpoint SHALL 在处理 mode 为 "interview_sim" 的请求时自动触发 RAG_Pipeline
2. THE RAG_Pipeline 执行 SHALL 对用户透明，不改变现有的请求和响应数据结构
3. WHEN RAG_Pipeline 执行过程中发生错误时，THE Chat_Endpoint SHALL 降级为纯 AI 回答，不中断用户对话
4. THE Chat_Endpoint 响应 SHALL 新增 rag_sources 字段（可选），包含本次回答引用的知识库文档 ID 列表
5. WHEN 回答使用了知识库内容时，THE Chat_Endpoint 响应中 rag_sources SHALL 包含至少一个文档 ID
6. WHEN 回答未使用知识库内容时，THE Chat_Endpoint 响应中 rag_sources SHALL 为空数组

### 需求 8：知识库内容类型支持

**用户故事：** 作为系统管理员，我希望知识库能存储多种类型的面试相关内容，以覆盖用户的各种面试准备需求。

#### 验收标准

1. THE Knowledge_Base SHALL 支持存储问答对（Q&A pair）格式的文档，包含问题和参考答案
2. THE Knowledge_Base SHALL 支持存储面经（interview experience）格式的文档，包含面试过程描述和经验总结
3. THE Knowledge_Base SHALL 支持存储专业知识（professional knowledge）格式的文档，包含行业或角色相关的知识点
4. THE Knowledge_Base SHALL 支持存储话术模板（speech template）格式的文档，包含面试回答的结构化模板
5. THE Ingestion_Service SHALL 对所有内容类型使用统一的存储和检索机制，不因类型不同而区别处理向量化流程

### 需求 9：知识库管理 API

**用户故事：** 作为系统管理员，我希望能查询和删除知识库中的文档，以便维护知识库内容的质量和时效性。

#### 验收标准

1. THE Ingestion_Service SHALL 提供 GET `/knowledge-base/documents` 端点，支持分页查询知识库文档列表
2. THE 查询端点 SHALL 支持按 category、industry、role 字段进行筛选
3. THE 查询响应 SHALL 包含文档 ID、内容摘要（前 100 字符）、元数据标签和创建时间
4. THE Ingestion_Service SHALL 提供 DELETE `/knowledge-base/documents/{document_id}` 端点，支持删除指定文档
5. WHEN 删除一篇文档时，THE Ingestion_Service SHALL 同时删除该文档的所有 Document_Chunk
6. IF 指定的 document_id 不存在，THEN THE Ingestion_Service SHALL 返回 404 错误

### 需求 10：RAG 性能与降级处理

**用户故事：** 作为用户，我希望面试辅导聊天的响应速度不会因为知识库检索而明显变慢，即使知识库出现问题也能正常使用。

#### 验收标准

1. THE RAG_Pipeline 完整执行（向量化查询 + 相似度搜索）SHALL 在 3 秒内完成
2. IF RAG_Pipeline 执行超过 3 秒，THEN THE Chat_Endpoint SHALL 终止检索并降级为纯 AI 回答
3. IF Supabase 连接失败，THEN THE Chat_Endpoint SHALL 降级为纯 AI 回答并记录错误日志
4. IF DeepSeek Embedding API 调用失败，THEN THE Chat_Endpoint SHALL 降级为纯 AI 回答并记录错误日志
5. THE Chat_Endpoint SHALL 在响应中包含 rag_status 字段，值为 "success"（检索成功）、"no_match"（无相关文档）或 "fallback"（降级为纯 AI）
6. THE 降级处理 SHALL 对用户透明，不显示错误信息，仅在后端日志中记录

## 非功能性需求

### 性能需求

1. THE Embedding_Service 单次向量化调用 SHALL 在 2 秒内完成
2. THE Similarity_Search 单次查询 SHALL 在 1 秒内返回结果
3. THE 批量摄入 50 篇文档 SHALL 在 60 秒内完成

### 安全需求

1. THE `/knowledge-base/ingest` 端点 SHALL 仅允许管理员访问（通过 API Key 验证）
2. THE `/knowledge-base/documents` 管理端点 SHALL 仅允许管理员访问
3. THE DeepSeek API Key 和 Supabase 连接信息 SHALL 通过环境变量配置，不硬编码在代码中

### 兼容性需求

1. THE 新增功能 SHALL 与现有 Python FastAPI 后端架构兼容，不修改现有端点的请求和响应格式
2. THE 新增功能 SHALL 使用现有的 Supabase documents 表和 match_documents 函数
3. THE 新增依赖 SHALL 通过 requirements.txt 或 pyproject.toml 管理

### 可维护性需求

1. THE RAG_Pipeline 代码 SHALL 作为独立模块组织，与现有聊天逻辑解耦
2. THE Top_K 值、相似度阈值、分块大小等参数 SHALL 通过环境变量或配置文件管理
3. THE 代码 SHALL 包含清晰的中文注释，说明 RAG 流程的每个步骤
