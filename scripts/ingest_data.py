"""
将清理好的面经数据导入 Supabase 知识库
使用方法：python scripts/ingest_data.py
"""

import asyncio
import json
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from rag.knowledge_base import KnowledgeBaseManager


async def main():
    data_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cleaned_mianshi.json")
    
    if not os.path.exists(data_file):
        print(f"数据文件不存在: {data_file}")
        return
    
    with open(data_file, 'r', encoding='utf-8') as f:
        documents = json.load(f)
    
    print(f"准备导入 {len(documents)} 条面经数据...")
    
    manager = KnowledgeBaseManager()
    
    # 分批导入（每批10条，避免超时）
    batch_size = 10
    total_success = 0
    total_failure = 0
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        print(f"\n导入第 {i+1}-{min(i+batch_size, len(documents))} 条...")
        
        result = await manager.ingest_batch(batch)
        total_success += result.success_count
        total_failure += result.failure_count
        
        # 打印失败的
        for r in result.results:
            if not r.success:
                print(f"  ✗ 第{i+r.index+1}条失败: {r.error}")
            else:
                print(f"  ✓ 第{i+r.index+1}条成功 ({r.chunks_created} 个分块)")
    
    print(f"\n{'='*50}")
    print(f"导入完成！成功: {total_success}, 失败: {total_failure}")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())
