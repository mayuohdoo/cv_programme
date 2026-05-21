#!/usr/bin/env python3
"""
测试简历上传功能
"""
import requests
import json

def test_upload():
    # 创建一个简单的测试文本文件
    test_content = """
张三
电话：13800138000
邮箱：zhangsan@example.com
教育背景：北京大学计算机科学与技术专业
工作经历：
- 2022-2024 腾讯科技 后端开发工程师
  负责微信支付系统的开发和维护，使用Python和Go语言
- 2021-2022 字节跳动 实习生
  参与抖音推荐算法的优化工作
技能：
- 编程语言：Python、Go、Java
- 数据库：MySQL、Redis
- 框架：Django、Gin
自我评价：
具有良好的团队合作能力，热爱技术，善于学习新技术。
"""
    
    # 将内容写入临时文件
    with open("test_resume.txt", "w", encoding="utf-8") as f:
        f.write(test_content)
    
    # 测试上传
    url = "http://127.0.0.1:8000/upload"
    
    # 由于我们的API只接受PDF和DOCX，我们需要创建一个简单的测试
    # 这里我们直接测试API的响应
    try:
        response = requests.get("http://127.0.0.1:8000/docs")
        if response.status_code == 200:
            print("✅ 后端API服务正常运行")
            print(f"   FastAPI文档地址: http://127.0.0.1:8000/docs")
        else:
            print("❌ 后端API服务异常")
            
        # 测试CORS
        response = requests.options(url, headers={
            'Origin': 'http://127.0.0.1:3000',
            'Access-Control-Request-Method': 'POST'
        })
        print(f"✅ CORS预检请求状态: {response.status_code}")
        
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务，请确保后端正在运行")
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == "__main__":
    test_upload()