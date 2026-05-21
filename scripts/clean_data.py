"""
清理牛客网爬取的面经数据
- 去除噪音文本（按钮、导航、评论区）
- 提取公司和岗位信息
- 格式化为知识库可用的结构
"""

import json
import re
import os
from datetime import datetime

# 输入输出路径
INPUT_FILE = "/Users/a123/Desktop/她代码/demo1/data/nowcoder_mianshi_20260518_104936.json"
OUTPUT_FILE = "/Users/a123/Desktop/她代码/demo1/data/cleaned_mianshi.json"

# 需要去除的噪音文本模式
NOISE_PATTERNS = [
    r'^\s*\d+\s*$',  # 纯数字行
    r'点赞',
    r'收藏',
    r'分享',
    r'真题解析',
    r'浏览',
    r'一键发评',
    r'蹲进度',
    r'已老实',
    r'接好运',
    r'快捷表情',
    r'首次评论.*牛币',
    r'大家都在搜',
    r'关注$',
    r'发布于',
    r'同时转发到我的动态',
    r'牛客会员',
    r'查看更多',
    r'^\s*\d+-\d+\s+\d+:\d+\s*$',  # 时间戳行
    r'^\s*\d{4}\.\d{2}\.\d{2}\s*$',  # 日期行
    r'^\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s*$',  # 完整时间行
]

# 编译正则
NOISE_REGEXES = [re.compile(p) for p in NOISE_PATTERNS]


def clean_content(raw_content):
    """清理面经内容"""
    lines = raw_content.split('\n')
    cleaned_lines = []
    
    # 找到正文开始位置（通常在"关注"之后）
    start_idx = 0
    for i, line in enumerate(lines):
        if '关注' == line.strip() and i < 10:
            start_idx = i + 1
            break
    
    # 找到评论区开始位置
    end_idx = len(lines)
    for i, line in enumerate(lines):
        if '一键发评' in line or '首次评论' in line or '快捷表情' in line:
            end_idx = i
            break
    
    # 提取正文
    for line in lines[start_idx:end_idx]:
        line = line.strip()
        if not line:
            continue
        
        # 检查是否是噪音
        is_noise = False
        for regex in NOISE_REGEXES:
            if regex.search(line):
                is_noise = True
                break
        
        if is_noise:
            continue
        
        # 去掉太短的行（可能是按钮文字）
        if len(line) < 3:
            continue
            
        cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)


def extract_company_and_position(content, title):
    """从内容和标题中提取公司和岗位"""
    text = title + '\n' + content[:500]
    
    company = ""
    position = ""
    
    # 常见公司名模式
    company_patterns = [
        r'(腾讯|阿里|字节跳动|百度|美团|京东|华为|小米|网易|快手|拼多多|滴滴|蚂蚁|微软|谷歌|苹果|亚马逊|CVTE|cvte|大疆|比亚迪|中兴|OPPO|vivo|荣耀|联想|携程|去哪儿|饿了么|哔哩哔哩|B站|小红书|知乎|微博|抖音|得物|shopee|Shopee|虾皮|广东电信|中国移动|中国联通|中国电信|招商银行|工商银行|建设银行|农业银行|中信银行|平安|未岚大陆)',
    ]
    
    for pattern in company_patterns:
        match = re.search(pattern, text)
        if match:
            company = match.group(1)
            break
    
    # 常见岗位模式
    position_patterns = [
        r'(后端|前端|算法|测试|产品经理|项目经理|数据分析|运营|设计|Java|Python|C\+\+|Go|iOS|Android|全栈|机器学习|深度学习|NLP|CV|大数据|云计算|安全|运维|DBA|嵌入式|硬件|FPGA|芯片|交付工程师|用户研究|项目管理|人力资源|HR|市场|销售)',
    ]
    
    for pattern in position_patterns:
        match = re.search(pattern, text)
        if match:
            position = match.group(1)
            break
    
    return company, position


def determine_category(content):
    """判断内容类别"""
    if any(kw in content for kw in ['一面', '二面', '三面', 'hr面', 'HR面', '面经', '面试']):
        return "interview_experience"
    elif any(kw in content for kw in ['如何回答', '技巧', '模板', '话术']):
        return "speech_template"
    elif any(kw in content for kw in ['知识点', '原理', '概念', '区别']):
        return "professional_knowledge"
    else:
        return "interview_experience"


def main():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    print(f"原始数据: {len(raw_data)} 条")
    
    cleaned_data = []
    
    for item in raw_data:
        raw_content = item.get('content', '')
        title = item.get('title', '')
        
        # 清理内容
        cleaned_content = clean_content(raw_content)
        
        # 跳过内容太短的
        if len(cleaned_content) < 50:
            continue
        
        # 提取公司和岗位
        company, position = extract_company_and_position(cleaned_content, title)
        
        # 判断类别
        category = determine_category(cleaned_content)
        
        cleaned_item = {
            "content": cleaned_content,
            "metadata": {
                "category": category,
                "industry": "互联网" if company else "",
                "role": position,
                "difficulty": "intermediate",
                "company": company,
                "source": "nowcoder",
                "original_title": title[:100],
                "original_url": item.get('url', '')
            }
        }
        
        cleaned_data.append(cleaned_item)
    
    print(f"清理后: {len(cleaned_data)} 条（去掉了 {len(raw_data) - len(cleaned_data)} 条内容过短的）")
    
    # 统计
    companies = [d['metadata']['company'] for d in cleaned_data if d['metadata']['company']]
    positions = [d['metadata']['role'] for d in cleaned_data if d['metadata']['role']]
    print(f"识别到公司: {len(companies)} 条 ({', '.join(list(set(companies))[:10])})")
    print(f"识别到岗位: {len(positions)} 条 ({', '.join(list(set(positions))[:10])})")
    
    # 内容长度统计
    lengths = [len(d['content']) for d in cleaned_data]
    print(f"内容长度: 最短 {min(lengths)} 字符, 最长 {max(lengths)} 字符, 平均 {sum(lengths)//len(lengths)} 字符")
    
    # 保存
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n清理后的数据已保存到: {OUTPUT_FILE}")
    print("\n前2条样本预览:")
    for i, item in enumerate(cleaned_data[:2]):
        print(f"\n--- 第{i+1}条 ---")
        print(f"公司: {item['metadata']['company']}")
        print(f"岗位: {item['metadata']['role']}")
        print(f"类别: {item['metadata']['category']}")
        print(f"内容前150字: {item['content'][:150]}")


if __name__ == "__main__":
    main()
