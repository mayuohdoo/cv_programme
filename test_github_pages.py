#!/usr/bin/env python3
"""
测试GitHub Pages和Render后端的连接
"""
import requests
import json

def test_github_pages_backend():
    print("🧪 测试GitHub Pages + Render后端连接...")
    
    # 1. 测试GitHub Pages
    try:
        response = requests.get("https://catarina-xxxcc.github.io/cv_programme/")
        if response.status_code == 200:
            print("✅ GitHub Pages正常访问")
        else:
            print(f"❌ GitHub Pages访问异常: {response.status_code}")
    except Exception as e:
        print(f"❌ GitHub Pages连接失败: {e}")
    
    # 2. 测试Render后端API
    try:
        response = requests.get("https://cv-programme.onrender.com/docs")
        if response.status_code == 200:
            print("✅ Render后端API正常")
        else:
            print(f"❌ Render后端API异常: {response.status_code}")
    except Exception as e:
        print(f"❌ Render后端连接失败: {e}")
    
    # 3. 测试CORS配置
    try:
        response = requests.options(
            "https://cv-programme.onrender.com/upload",
            headers={
                'Origin': 'https://catarina-xxxcc.github.io',
                'Access-Control-Request-Method': 'POST'
            }
        )
        if response.status_code == 200:
            cors_origin = response.headers.get('Access-Control-Allow-Origin')
            if cors_origin == 'https://catarina-xxxcc.github.io':
                print("✅ CORS配置正确")
            else:
                print(f"❌ CORS配置错误: {cors_origin}")
        else:
            print(f"❌ CORS预检失败: {response.status_code}")
    except Exception as e:
        print(f"❌ CORS测试失败: {e}")
    
    print("\n🎉 测试完成！现在你可以通过以下网址访问应用：")
    print("   https://catarina-xxxcc.github.io/cv_programme/")
    print("\n📋 功能说明：")
    print("   - 上传PDF或DOCX格式的简历")
    print("   - AI分析MBTI人格类型")
    print("   - 推荐适合的岗位")
    print("   - 诊断简历质量问题")

if __name__ == "__main__":
    test_github_pages_backend()