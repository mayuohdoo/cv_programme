# 简历质量诊断功能修复设计文档

## Overview

本设计文档针对简历质量诊断功能的bug进行修复。当前系统使用智谱AI GLM-4-Flash模型解析简历时，`resume_diagnosis`对象几乎无法检测出任何质量问题，即使简历中存在明显的错别字、病句或冗余表达。

**修复策略**：通过优化AI prompt，增加具体的检测标准、示例和严格的评分指导，使模型能够准确识别简历中的质量问题。修复将集中在`backend/main.py`的`_parse_resume_with_ai`函数中的prompt优化，不改变API接口和数据结构。

**核心改进点**：
1. 在prompt中明确定义错别字、病句、冗余表达的检测标准
2. 提供正面和负面示例引导模型判断
3. 设定严格的评分标准（避免评分虚高）
4. 要求模型在检测到问题时必须提供具体的original和suggestion
5. 强调诊断的严格性，避免过于宽容

## Glossary

- **Bug_Condition (C)**: 当用户上传包含质量问题（错别字、病句、冗余）的简历时，AI模型未能检测出这些问题，返回空数组或过高评分
- **Property (P)**: 修复后的诊断功能应准确识别质量问题，返回具体的original和suggestion，并给出合理的评分
- **Preservation**: 简历解析的其他功能（MBTI推断、候选人简介、岗位推荐）必须保持不变
- **_parse_resume_with_ai**: `backend/main.py`中的函数，负责调用智谱AI模型解析简历
- **resume_diagnosis**: 返回数据中的诊断对象，包含typos、grammar_issues、redundancy、overall_score、overall_comment字段
- **GLM-4-Flash**: 智谱AI的快速推理模型，用于简历解析任务

## Bug Details

### Bug Condition

当用户上传包含质量问题的简历时，AI模型的诊断功能失效。问题根源在于`_parse_resume_with_ai`函数中的prompt过于简单，缺乏具体的检测标准和示例，导致模型倾向于返回空结果或过于正面的评价。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ResumeText
  OUTPUT: boolean
  
  RETURN (input.text CONTAINS typos OR grammar_errors OR redundancy)
         AND (AI_diagnosis.typos.length == 0 
              OR AI_diagnosis.grammar_issues.length == 0 
              OR AI_diagnosis.redundancy.length == 0)
         AND AI_diagnosis.overall_score > 85
END FUNCTION
```

### Examples

**示例1：错别字未检测**
- 简历内容：`"负责公司产品的开发和测式工作"`（"测式"应为"测试"）
- 当前行为：`resume_diagnosis.typos = []`
- 期望行为：`resume_diagnosis.typos = [{"original": "测式", "suggestion": "测试"}]`

**示例2：病句未检测**
- 简历内容：`"通过使用Python和数据分析工具进行了数据的分析"`（冗长且重复"分析"）
- 当前行为：`resume_diagnosis.grammar_issues = []`
- 期望行为：`resume_diagnosis.grammar_issues = [{"original": "通过使用Python和数据分析工具进行了数据的分析", "suggestion": "使用Python进行数据分析"}]`

**示例3：冗余表达未检测**
- 简历内容：`"主要负责主要的项目开发工作"`（重复"主要"）
- 当前行为：`resume_diagnosis.redundancy = []`
- 期望行为：`resume_diagnosis.redundancy = [{"original": "主要负责主要的项目开发工作", "suggestion": "负责主要的项目开发工作"}]`

**示例4：评分虚高**
- 简历内容：包含多处错别字和病句的低质量简历
- 当前行为：`resume_diagnosis.overall_score = 95`
- 期望行为：`resume_diagnosis.overall_score = 60-70`（根据问题数量合理评分）

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- MBTI推断逻辑（基于软技能和行为描述的E/I/S/N/T/F/J/P判断）必须保持不变
- 候选人简介生成（candidate_summary）必须保持不变
- 岗位推荐逻辑（job_recommendations）必须保持不变
- JSON响应结构必须保持不变
- 文件上传和文本提取逻辑（PDF/DOCX解析）必须保持不变
- API接口（/upload端点）必须保持不变
- 响应时间必须保持在10秒以内

**Scope:**
所有与简历诊断无关的功能应完全不受影响。修复仅涉及`_parse_resume_with_ai`函数中prompt的`resume_diagnosis`部分的优化。

## Hypothesized Root Cause

基于对`backend/main.py`代码的分析，最可能的问题原因是：

1. **Prompt缺乏具体标准**: 当前prompt仅简单要求"对简历文本进行质量诊断"，没有明确定义什么是错别字、病句、冗余表达，导致模型不知道如何判断

2. **缺少示例引导**: Prompt中没有提供正面和负面示例，模型无法理解期望的检测严格程度

3. **评分标准不明确**: Prompt中没有给出评分标准（如：有3个以上错别字应扣多少分），导致模型倾向于给出保守的高分

4. **指令优先级问题**: Prompt中同时要求多个任务（MBTI推断、岗位推荐、诊断），诊断部分可能被模型视为次要任务而草率处理

5. **模型倾向性**: GLM-4-Flash模型可能存在"过于礼貌"的倾向，不愿意指出问题，需要在prompt中明确强调严格性

## Correctness Properties

Property 1: Bug Condition - 准确检测简历质量问题

_For any_ 简历文本，如果其中包含错别字、病句或冗余表达（isBugCondition返回true），修复后的诊断功能SHALL准确识别这些问题，在对应的数组（typos、grammar_issues、redundancy）中返回每个问题的original和suggestion，并给出合理的overall_score（反映真实质量水平）。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - 保持其他解析功能不变

_For any_ 简历上传请求，修复后的代码SHALL继续正确解析MBTI、候选人简介、岗位推荐等其他字段，返回符合JSON schema的完整响应，并在合理时间内（<10秒）完成，前端UI正常显示所有信息。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

修复将集中在`backend/main.py`文件的`_parse_resume_with_ai`函数中。

**File**: `backend/main.py`

**Function**: `_parse_resume_with_ai(raw_text: str) -> dict[str, Any]`

**Specific Changes**:

1. **优化Prompt结构**: 将诊断部分的指令从简单描述改为详细的检测标准和示例

2. **添加错别字检测标准**:
   - 明确定义：错别字包括同音字错误、形近字错误、多字/少字、标点错误
   - 提供示例：`"测式" → "测试"`, `"沟通能里" → "沟通能力"`
   - 强调：必须检查整个简历，不要遗漏

3. **添加病句检测标准**:
   - 明确定义：病句包括语序不当、成分残缺、搭配不当、表意不明、冗长啰嗦
   - 提供示例：`"通过使用Python进行了分析" → "使用Python进行分析"`
   - 强调：关注动词搭配、介词使用、句子简洁性

4. **添加冗余检测标准**:
   - 明确定义：冗余包括重复词语、重复表达、无意义的修饰词、可合并的句子
   - 提供示例：`"主要负责主要的" → "负责主要的"`, `"非常很重要" → "非常重要"`
   - 强调：追求简洁有力的表达

5. **设定严格评分标准**:
   ```
   评分标准（overall_score）：
   - 90-100分：无明显问题，表达专业简洁
   - 80-89分：有1-2个小问题，整体良好
   - 70-79分：有3-5个问题，需要改进
   - 60-69分：有6-10个问题，质量一般
   - 60分以下：问题较多，需要大幅修改
   ```

6. **强调检测严格性**:
   - 在prompt开头明确角色：`"你是一个严格的简历审查专家，以高标准检查简历质量"`
   - 强调：`"请仔细检查，不要遗漏任何问题，即使是小问题也要指出"`
   - 避免过于宽容：`"不要因为礼貌而隐瞒问题，诚实的反馈更有价值"`

7. **优化Prompt顺序**: 将诊断部分放在MBTI推断之后、岗位推荐之前，确保模型有足够注意力处理诊断任务

8. **添加输出格式约束**: 明确要求当发现问题时，original字段必须是简历中的原文片段（5-30字），suggestion必须是具体的修改建议

### Prompt优化示例

**当前Prompt片段**（简化版）:
```python
prompt = f"""
...
5) resume_diagnosis: 对象，对简历文本进行质量诊断，包含：
   - typos: 数组，发现的错别字，每项包含 original（原文）和 suggestion（建议）
   - grammar_issues: 数组，病句或语法问题，每项包含 original 和 suggestion
   - redundancy: 数组，语意冗杂或表达重复的地方，每项包含 original 和 suggestion
   - overall_score: 整数 1-100，简历整体质量评分
   - overall_comment: 字符串，一句话总体评价（30字以内）
...
"""
```

**优化后的Prompt片段**:
```python
prompt = f"""
你是一个资深 HR 分析师、职业人格专家和严格的简历审查专家。请将简历解析为严格 JSON（不要使用 markdown 代码块）。

【重要】你必须以高标准检查简历质量，仔细审查每一处表达，不要遗漏任何问题。诚实的反馈比礼貌的赞美更有价值。

输出字段要求：
1) inferred_mbti: ...（保持不变）
2) mbti_description: ...（保持不变）
3) candidate_summary: ...（保持不变）
4) job_recommendations: ...（保持不变）

5) resume_diagnosis: 对象，对简历文本进行严格的质量诊断，包含：

   - typos: 数组，发现的错别字。【检测标准】：
     * 同音字错误（如："测式"应为"测试"，"沟通能里"应为"沟通能力"）
     * 形近字错误（如："项日"应为"项目"）
     * 多字/少字（如："的的项目"应为"的项目"）
     * 标点错误（如：中文语境中使用英文逗号）
     【要求】：仔细检查整个简历，每个错别字必须返回 {"original": "原文片段(5-30字)", "suggestion": "正确写法"}
     【示例】：{"original": "负责产品的测式工作", "suggestion": "负责产品的测试工作"}

   - grammar_issues: 数组，病句或语法问题。【检测标准】：
     * 语序不当（如："使用了熟练Python"应为"熟练使用Python"）
     * 成分残缺（如："负责开发"缺少宾语，应为"负责XX系统的开发"）
     * 搭配不当（如："提高效率的增长"应为"提高效率"或"促进增长"）
     * 表意不明（如："通过使用工具进行了工作"过于模糊）
     * 冗长啰嗦（如："通过使用Python和数据分析工具进行了数据的分析"应为"使用Python进行数据分析"）
     【要求】：关注动词搭配、介词使用、句子简洁性，每个问题必须返回 {"original": "原句(10-40字)", "suggestion": "改进后的表达"}
     【示例】：{"original": "通过使用Python进行了数据的分析", "suggestion": "使用Python进行数据分析"}

   - redundancy: 数组，语意冗杂或表达重复。【检测标准】：
     * 重复词语（如："主要负责主要的项目"应为"负责主要的项目"）
     * 重复表达（如："进行了优化和改进"可简化为"进行了优化"）
     * 无意义修饰（如："非常很重要"应为"非常重要"）
     * 可合并句子（如："负责开发。负责测试。"应为"负责开发和测试"）
     【要求】：追求简洁有力的表达，每个冗余必须返回 {"original": "冗余片段(10-40字)", "suggestion": "简化后的表达"}
     【示例】：{"original": "主要负责主要的项目开发", "suggestion": "负责主要的项目开发"}

   - overall_score: 整数 1-100，简历整体质量评分。【评分标准】：
     * 90-100分：无明显问题，表达专业简洁，用词准确
     * 80-89分：有1-2个小问题，整体良好
     * 70-79分：有3-5个问题，需要改进
     * 60-69分：有6-10个问题，质量一般
     * 60分以下：问题较多（>10个），需要大幅修改
     【要求】：根据发现的问题数量严格评分，不要因为礼貌而虚高评分

   - overall_comment: 字符串，一句话总体评价（30字以内）。
     【要求】：如果有问题，必须明确指出（如："发现3处错别字和2处病句，建议仔细校对"）；如果质量优秀，可以正面评价（如："表达专业简洁，未发现明显问题"）

【重要提示】：
- 如果简历质量确实很好，typos/grammar_issues/redundancy 可以为空数组，overall_score 可以给 85-100 分
- 但如果发现了问题，必须如实指出，不要遗漏，不要因为礼貌而隐瞒
- original 字段必须是简历中的原文片段，不要编造
- suggestion 必须是具体可行的修改建议，不要模糊表达

如果信息缺失，请使用空字符串或空数组，不要省略字段。

推断 inferred_mbti 时，规则如下...（保持不变）

简历文本如下：
{raw_text}
"""
```

## Testing Strategy

### Validation Approach

测试策略分为两个阶段：
1. **探索性测试（Exploratory Bug Condition Checking）**: 在未修复的代码上运行测试，验证bug确实存在
2. **修复验证测试（Fix Checking + Preservation Checking）**: 在修复后的代码上运行测试，验证bug已修复且其他功能未受影响

### Exploratory Bug Condition Checking

**Goal**: 在修复前，使用包含已知质量问题的测试简历，验证当前代码确实无法检测出这些问题。这将确认我们的根因分析是正确的。

**Test Plan**: 
1. 准备3-5份测试简历，每份包含特定类型的质量问题（错别字、病句、冗余）
2. 使用当前未修复的代码调用`_parse_resume_with_ai`函数
3. 检查返回的`resume_diagnosis`对象
4. 预期结果：typos/grammar_issues/redundancy数组为空或不完整，overall_score虚高

**Test Cases**:

1. **错别字检测测试**（将在未修复代码上失败）
   - 输入：包含"测式"、"沟通能里"、"项日"等错别字的简历
   - 预期失败：`resume_diagnosis.typos = []`
   - 失败原因：当前prompt未提供错别字检测标准

2. **病句检测测试**（将在未修复代码上失败）
   - 输入：包含"通过使用Python进行了数据的分析"等冗长病句的简历
   - 预期失败：`resume_diagnosis.grammar_issues = []`
   - 失败原因：当前prompt未提供病句检测标准

3. **冗余检测测试**（将在未修复代码上失败）
   - 输入：包含"主要负责主要的"、"非常很重要"等冗余表达的简历
   - 预期失败：`resume_diagnosis.redundancy = []`
   - 失败原因：当前prompt未提供冗余检测标准

4. **评分准确性测试**（将在未修复代码上失败）
   - 输入：包含10个以上明显问题的低质量简历
   - 预期失败：`resume_diagnosis.overall_score > 85`
   - 失败原因：当前prompt未提供评分标准，模型倾向于给高分

**Expected Counterexamples**:
- 诊断数组为空，即使简历中存在明显问题
- 评分虚高（90+分），即使简历质量较差
- overall_comment过于笼统（如："简历整体不错"），缺乏针对性

### Fix Checking

**Goal**: 验证修复后的代码能够准确检测出简历中的质量问题，并给出合理的评分和建议。

**Pseudocode:**
```
FOR ALL resume_text WHERE isBugCondition(resume_text) DO
  result := _parse_resume_with_ai_fixed(resume_text)
  diagnosis := result["resume_diagnosis"]
  
  // 验证错别字检测
  IF resume_text CONTAINS known_typos THEN
    ASSERT diagnosis["typos"].length > 0
    ASSERT diagnosis["typos"] CONTAINS correct_original_and_suggestion
  END IF
  
  // 验证病句检测
  IF resume_text CONTAINS known_grammar_issues THEN
    ASSERT diagnosis["grammar_issues"].length > 0
    ASSERT diagnosis["grammar_issues"] CONTAINS correct_original_and_suggestion
  END IF
  
  // 验证冗余检测
  IF resume_text CONTAINS known_redundancy THEN
    ASSERT diagnosis["redundancy"].length > 0
    ASSERT diagnosis["redundancy"] CONTAINS correct_original_and_suggestion
  END IF
  
  // 验证评分合理性
  total_issues := diagnosis["typos"].length + diagnosis["grammar_issues"].length + diagnosis["redundancy"].length
  IF total_issues >= 10 THEN
    ASSERT diagnosis["overall_score"] < 70
  ELSE IF total_issues >= 6 THEN
    ASSERT diagnosis["overall_score"] < 80
  ELSE IF total_issues >= 3 THEN
    ASSERT diagnosis["overall_score"] < 90
  END IF
  
  // 验证评论针对性
  IF total_issues > 0 THEN
    ASSERT diagnosis["overall_comment"] MENTIONS issues
  END IF
END FOR
```

**Test Cases**:
1. **错别字修复验证**: 使用包含已知错别字的简历，验证typos数组非空且包含正确的original和suggestion
2. **病句修复验证**: 使用包含已知病句的简历，验证grammar_issues数组非空且建议合理
3. **冗余修复验证**: 使用包含已知冗余的简历，验证redundancy数组非空且简化建议有效
4. **评分修复验证**: 使用不同质量等级的简历，验证overall_score符合评分标准
5. **优秀简历测试**: 使用高质量简历，验证诊断数组为空且评分在85-100分

### Preservation Checking

**Goal**: 验证修复后的代码不会影响其他功能（MBTI推断、候选人简介、岗位推荐、API响应结构、性能）。

**Pseudocode:**
```
FOR ALL resume_text IN test_corpus DO
  result_original := _parse_resume_with_ai_original(resume_text)
  result_fixed := _parse_resume_with_ai_fixed(resume_text)
  
  // 验证MBTI推断不变
  ASSERT result_fixed["inferred_mbti"] == result_original["inferred_mbti"]
  ASSERT result_fixed["mbti_description"] == result_original["mbti_description"]
  
  // 验证候选人简介不变（或质量相当）
  ASSERT result_fixed["candidate_summary"] IS_SIMILAR_TO result_original["candidate_summary"]
  
  // 验证岗位推荐不变（或质量相当）
  ASSERT result_fixed["job_recommendations"].length == result_original["job_recommendations"].length
  
  // 验证JSON结构不变
  ASSERT result_fixed HAS_SAME_SCHEMA_AS result_original
  
  // 验证响应时间
  ASSERT execution_time < 10_seconds
END FOR
```

**Testing Approach**: 
- 使用多样化的测试简历（不同行业、不同经验水平、不同质量）
- 对比修复前后的输出，确保非诊断字段保持一致
- 使用快照测试（snapshot testing）记录修复前的输出作为基准
- 重点关注MBTI推断逻辑，因为prompt中该部分的规则较复杂

**Test Plan**: 
1. 准备10-20份多样化的测试简历
2. 在修复前运行一次，记录所有非诊断字段的输出
3. 应用修复后再次运行
4. 对比两次运行的结果，验证非诊断字段未发生变化

**Test Cases**:

1. **MBTI推断保持不变**: 
   - 使用包含明确E/I/S/N/T/F/J/P特征的简历
   - 验证修复前后inferred_mbti和mbti_description完全一致

2. **候选人简介保持不变**: 
   - 使用多份不同背景的简历
   - 验证candidate_summary的长度、内容质量、关键信息保持一致

3. **岗位推荐保持不变**: 
   - 验证job_recommendations数组长度为6
   - 验证推荐岗位的行业多样性和匹配度逻辑未改变

4. **JSON结构保持不变**: 
   - 验证所有必需字段存在
   - 验证字段类型正确（数组、字符串、整数）
   - 验证前端能够正常解析和显示

5. **性能保持不变**: 
   - 测量修复前后的平均响应时间
   - 验证响应时间仍在10秒以内
   - 如果prompt变长导致token增加，评估对性能的影响

### Unit Tests

- **测试`_parse_resume_with_ai`函数的诊断输出格式**: 验证返回的resume_diagnosis对象包含所有必需字段
- **测试错别字检测**: 使用包含已知错别字的简历片段，验证typos数组非空
- **测试病句检测**: 使用包含已知病句的简历片段，验证grammar_issues数组非空
- **测试冗余检测**: 使用包含已知冗余的简历片段，验证redundancy数组非空
- **测试评分逻辑**: 使用不同质量的简历，验证overall_score符合预期范围
- **测试优秀简历**: 使用高质量简历，验证诊断数组为空且评分高

### Property-Based Tests

- **生成随机简历文本**: 使用PBT库生成包含随机质量问题的简历文本，验证诊断功能的鲁棒性
- **验证诊断一致性**: 对同一份简历多次调用API，验证诊断结果的一致性（考虑到LLM的随机性，允许小幅波动）
- **验证original字段的真实性**: 验证所有返回的original字段确实存在于输入的简历文本中（不是模型编造的）
- **验证suggestion字段的有效性**: 验证所有suggestion字段不为空且与original不同
- **验证评分与问题数量的相关性**: 验证overall_score与问题总数呈负相关关系

### Integration Tests

- **端到端测试**: 通过`/upload` API上传测试简历，验证完整的解析流程
- **前端集成测试**: 验证前端能够正确显示诊断结果（错别字、病句、冗余、评分、评论）
- **多文件格式测试**: 测试PDF和DOCX格式的简历，验证诊断功能在两种格式下都正常工作
- **边界情况测试**: 测试极短简历、极长简历、空白简历，验证诊断功能的健壮性
- **并发测试**: 模拟多个用户同时上传简历，验证诊断功能在并发场景下的稳定性
