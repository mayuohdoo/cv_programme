"""
简历质量诊断功能测试脚本
用于验证修复后的诊断功能是否能准确检测出质量问题
"""

import sys
import os

# 添加backend目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.main import _parse_resume_with_ai

# 测试简历1：包含多种质量问题
test_resume_1 = """
张三
联系方式：123456789 | 邮箱：zhangsan@email.com

教育背景：
北京大学 | 计算机科学与技术 | 2019-2023

工作经历：
ABC科技公司 | 软件工程师 | 2023.7-至今
- 负责产品的测式工作和开发
- 通过使用Python和数据分析工具进行了数据的分析
- 主要负责主要的项目开发工作
- 使用了熟练Python进行开发

技能：
- 编程语言：Python、Java、C++
- 沟通能里强，团队合作精神好
"""

# 测试简历2：高质量简历
test_resume_2 = """
李四
联系方式：987654321 | 邮箱：lisi@email.com

教育背景：
清华大学 | 软件工程 | 2018-2022

工作经历：
XYZ互联网公司 | 高级工程师 | 2022.7-至今
- 负责核心支付系统的架构设计与开发
- 使用Python和Go语言实现高并发服务
- 带领5人团队完成项目交付，提升系统性能30%

技能：
- 编程语言：Python、Go、Java
- 沟通能力强，具备团队领导经验
"""

def test_diagnosis():
    print("=" * 60)
    print("测试1：包含质量问题的简历")
    print("=" * 60)
    
    try:
        result1 = _parse_resume_with_ai(test_resume_1)
        diagnosis1 = result1.get('resume_diagnosis', {})
        
        print(f"\n✅ MBTI推断: {result1.get('inferred_mbti', 'N/A')}")
        print(f"✅ 候选人简介: {result1.get('candidate_summary', 'N/A')[:50]}...")
        
        print(f"\n📋 诊断结果:")
        print(f"  - 错别字数量: {len(diagnosis1.get('typos', []))}")
        for typo in diagnosis1.get('typos', []):
            print(f"    ❌ {typo.get('original', '')} → ✅ {typo.get('suggestion', '')}")
        
        print(f"\n  - 病句数量: {len(diagnosis1.get('grammar_issues', []))}")
        for issue in diagnosis1.get('grammar_issues', []):
            print(f"    ❌ {issue.get('original', '')} → ✅ {issue.get('suggestion', '')}")
        
        print(f"\n  - 冗余表达数量: {len(diagnosis1.get('redundancy', []))}")
        for red in diagnosis1.get('redundancy', []):
            print(f"    ❌ {red.get('original', '')} → ✅ {red.get('suggestion', '')}")
        
        print(f"\n  - 综合评分: {diagnosis1.get('overall_score', 'N/A')}/100")
        print(f"  - 总体评价: {diagnosis1.get('overall_comment', 'N/A')}")
        
        # 验证修复效果
        total_issues = (len(diagnosis1.get('typos', [])) + 
                       len(diagnosis1.get('grammar_issues', [])) + 
                       len(diagnosis1.get('redundancy', [])))
        
        print(f"\n🔍 验证结果:")
        if total_issues > 0:
            print(f"  ✅ 成功检测到 {total_issues} 个问题")
        else:
            print(f"  ❌ 未检测到任何问题（修复可能未生效）")
        
        score = diagnosis1.get('overall_score', 100)
        if total_issues >= 5 and score < 80:
            print(f"  ✅ 评分合理（{score}分，符合问题数量）")
        elif total_issues >= 5 and score >= 80:
            print(f"  ⚠️  评分偏高（{score}分，但有{total_issues}个问题）")
        
    except Exception as e:
        print(f"❌ 测试1失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("测试2：高质量简历")
    print("=" * 60)
    
    try:
        result2 = _parse_resume_with_ai(test_resume_2)
        diagnosis2 = result2.get('resume_diagnosis', {})
        
        print(f"\n✅ MBTI推断: {result2.get('inferred_mbti', 'N/A')}")
        print(f"✅ 候选人简介: {result2.get('candidate_summary', 'N/A')[:50]}...")
        
        print(f"\n📋 诊断结果:")
        print(f"  - 错别字数量: {len(diagnosis2.get('typos', []))}")
        print(f"  - 病句数量: {len(diagnosis2.get('grammar_issues', []))}")
        print(f"  - 冗余表达数量: {len(diagnosis2.get('redundancy', []))}")
        print(f"  - 综合评分: {diagnosis2.get('overall_score', 'N/A')}/100")
        print(f"  - 总体评价: {diagnosis2.get('overall_comment', 'N/A')}")
        
        total_issues = (len(diagnosis2.get('typos', [])) + 
                       len(diagnosis2.get('grammar_issues', [])) + 
                       len(diagnosis2.get('redundancy', [])))
        
        print(f"\n🔍 验证结果:")
        if total_issues == 0:
            print(f"  ✅ 正确识别为高质量简历（无问题）")
        else:
            print(f"  ⚠️  检测到 {total_issues} 个问题（可能过于严格）")
        
        score = diagnosis2.get('overall_score', 0)
        if score >= 85:
            print(f"  ✅ 评分合理（{score}分，高质量简历）")
        else:
            print(f"  ⚠️  评分偏低（{score}分，但简历质量较好）")
        
    except Exception as e:
        print(f"❌ 测试2失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    test_diagnosis()
