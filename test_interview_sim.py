#!/usr/bin/env python3
"""
测试面试模拟功能
"""

import json
import requests

# 测试API端点
API_BASE = "http://127.0.0.1:8000"

def test_interview_simulation():
    """测试面试模拟功能"""
    
    print("=== 测试面试模拟功能 ===")
    
    # 1. 测试进入面试模拟模式
    print("\n1. 进入面试模拟模式...")
    chat_data = {
        "messages": [
            {"role": "user", "content": "我想进行面试模拟练习"}
        ],
        "mode": "interview_sim",
        "resume_context": {
            "has_resume": True,
            "candidate_summary": "2年前端开发经验，掌握React、Vue、JavaScript",
            "inferred_mbti": "ENTJ",
            "job_recommendations": [
                {"title": "前端开发工程师", "industry": "科技"},
                {"title": "全栈开发工程师", "industry": "科技"}
            ]
        },
        "interview_state": {
            "is_active": False,
            "target_position": "",
            "interview_type": "",
            "current_question_index": 0,
            "total_questions": 8,
            "scores": [],
            "feedbacks": []
        }
    }
    
    try:
        response = requests.post(f"{API_BASE}/chat", json=chat_data)
        response.raise_for_status()
        result = response.json()
        
        print(f"AI回复: {result['reply'][:200]}...")
        print(f"模式: {result['mode']}")
        print(f"面试状态: {result['interview_state']}")
        
        # 2. 模拟用户提供目标岗位
        print("\n2. 用户提供目标岗位...")
        chat_data["messages"].append({"role": "assistant", "content": result["reply"]})
        chat_data["messages"].append({"role": "user", "content": "我想应聘前端开发工程师，进行技术面试"})
        
        # 更新面试状态
        chat_data["interview_state"]["is_active"] = True
        chat_data["interview_state"]["target_position"] = "前端开发工程师"
        chat_data["interview_state"]["interview_type"] = "technical"
        
        response = requests.post(f"{API_BASE}/chat", json=chat_data)
        response.raise_for_status()
        result = response.json()
        
        print(f"AI回复: {result['reply'][:200]}...")
        
        # 3. 模拟用户回答第一个问题
        print("\n3. 用户回答第一个问题...")
        chat_data["messages"].append({"role": "assistant", "content": result["reply"]})
        chat_data["messages"].append({"role": "user", "content": "我使用React开发过电商网站，负责前端架构设计和组件开发"})
        
        # 更新问题索引
        chat_data["interview_state"]["current_question_index"] = 1
        
        response = requests.post(f"{API_BASE}/chat", json=chat_data)
        response.raise_for_status()
        result = response.json()
        
        print(f"AI回复: {result['reply'][:300]}...")
        
        # 检查是否包含评分和反馈
        if "评分" in result["reply"] or "得分" in result["reply"]:
            print("✓ AI提供了评分和反馈")
        else:
            print("✗ AI没有提供评分和反馈")
            
        print("\n=== 测试完成 ===")
        
    except requests.exceptions.RequestException as e:
        print(f"请求失败: {e}")
        print("请确保后端服务正在运行: python backend/main.py")
    except Exception as e:
        print(f"测试失败: {e}")

def test_upload_resume():
    """测试简历上传功能"""
    print("\n=== 测试简历上传功能 ===")
    
    # 创建一个测试PDF文件
    test_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(测试简历内容：前端开发工程师，2年经验) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n0000000176 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n242\n%%EOF"
    
    files = {"file": ("test_resume.pdf", test_pdf_content, "application/pdf")}
    
    try:
        response = requests.post(f"{API_BASE}/upload", files=files)
        response.raise_for_status()
        result = response.json()
        
        print(f"上传结果: {result.get('parse_status', '未知')}")
        print(f"文件名: {result.get('filename', '未知')}")
        
        if "parsed_data" in result:
            print(f"解析数据包含字段: {list(result['parsed_data'].keys())}")
            
    except requests.exceptions.RequestException as e:
        print(f"上传失败: {e}")
    except Exception as e:
        print(f"测试失败: {e}")

if __name__ == "__main__":
    print("启动面试模拟功能测试...")
    
    # 先测试简历上传
    test_upload_resume()
    
    # 再测试面试模拟
    test_interview_simulation()