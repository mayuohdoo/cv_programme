"""
牛客网面经爬虫 - 使用 Playwright 模拟浏览器
使用方法：
1. pip install playwright
2. playwright install chromium
3. python scripts/crawl_nowcoder.py

脚本会打开浏览器，你手动登录牛客网后按回车继续爬取。
爬取结果保存为 JSON 文件，后续用摄入脚本导入 Supabase。
"""

import asyncio
import json
import os
import time
from datetime import datetime

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("请先安装 playwright: pip install playwright && playwright install chromium")
    exit(1)


# 配置
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, f"nowcoder_mianshi_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
MAX_PAGES = 5  # 爬取页数
DELAY_BETWEEN_PAGES = 3  # 页面间延迟（秒）
DELAY_BETWEEN_ITEMS = 2  # 条目间延迟（秒）


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    async with async_playwright() as p:
        # 启动浏览器（有头模式，方便登录）
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        # 打开牛客网首页（让用户登录后手动导航）
        print("正在打开牛客网...")
        await page.goto("https://www.nowcoder.com/", wait_until="networkidle")
        
        # 等待用户手动登录并导航到面经页面
        print("\n" + "=" * 50)
        print("操作步骤：")
        print("1. 在浏览器中登录牛客网")
        print("2. 登录后，手动导航到面经页面")
        print("   例如：点击「面经」或访问讨论区")
        print("3. 确保页面上能看到面经列表")
        print("4. 回到终端按回车继续爬取")
        print("=" * 50)
        input("\n已登录并打开面经列表页面后，按回车继续 >>> ")
        
        # 获取当前页面 URL（用户已经导航到面经页面）
        await asyncio.sleep(2)
        current_url = page.url
        print(f"\n当前页面: {current_url}")
        
        # 调试：打印页面上所有链接，帮助确定正确的选择器
        print("\n[调试] 页面上的前20个链接：")
        all_links = await page.evaluate("""
            () => {
                const links = Array.from(document.querySelectorAll('a[href]'));
                return links.slice(0, 30).map(a => ({
                    href: a.href,
                    text: a.innerText.trim().substring(0, 60)
                }));
            }
        """)
        for link in all_links:
            if link['text'] and len(link['text']) > 5:
                print(f"  {link['href'][:80]}  |  {link['text'][:40]}")
        
        # 让用户确认看到了面经链接
        print("\n看看上面的链接，面经的 URL 格式是什么？")
        print("如果看到面经链接，按回车继续爬取")
        print("如果当前页面不对，请在浏览器中导航到面经列表页，然后按回车")
        input("\n按回车继续 >>> ")
        
        # 重新获取当前 URL
        current_url = page.url
        print(f"当前页面: {current_url}")
        
        all_items = []
        
        # 爬取面经列表
        print(f"\n开始爬取面经热榜（最多 {MAX_PAGES} 页）...")
        
        for page_num in range(1, MAX_PAGES + 1):
            print(f"\n--- 第 {page_num} 页 ---")
            
            # 等待列表加载
            await asyncio.sleep(2)
            
            # 获取面经列表项
            items = await page.query_selector_all('[class*="discuss-item"], [class*="list-item"], .feed-item, .nc-card')
            
            if not items:
                # 尝试其他选择器
                items = await page.query_selector_all('a[href*="/discuss/"]')
            
            if not items:
                print(f"  第 {page_num} 页未找到面经条目，尝试滚动加载...")
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(3)
                items = await page.query_selector_all('a[href*="/discuss/"]')
            
            print(f"  找到 {len(items)} 个条目")
            
            # 收集链接 - 匹配 /discuss/数字 格式
            links = []
            all_page_links = await page.evaluate("""
                () => {
                    const allLinks = Array.from(document.querySelectorAll('a[href]'));
                    const seen = new Set();
                    const results = [];
                    for (const a of allLinks) {
                        const href = a.href || '';
                        if (href.match(/\/discuss\/\d+/) && !seen.has(href)) {
                            seen.add(href);
                            const text = a.innerText.trim().substring(0, 200);
                            if (text.length > 5) {
                                results.push({ href, text });
                            }
                        }
                    }
                    return results;
                }
            """)
            
            for link_data in all_page_links[:20]:
                links.append({"url": link_data["href"], "title": link_data["text"][:100]})
            
            print(f"  收集到 {len(links)} 个面经链接")
            
            # 逐个打开面经详情
            for i, link in enumerate(links):
                try:
                    print(f"  [{i+1}/{len(links)}] 爬取: {link['title'][:40]}...")
                    
                    detail_page = await context.new_page()
                    await detail_page.goto(link["url"], wait_until="networkidle", timeout=15000)
                    await asyncio.sleep(2)
                    
                    # 提取面经内容
                    content = ""
                    
                    # 尝试多种选择器获取正文
                    selectors = [
                        ".nc-post-content",
                        ".post-content",
                        ".discuss-main",
                        "[class*='content']",
                        "article",
                        ".markdown-body"
                    ]
                    
                    for sel in selectors:
                        el = await detail_page.query_selector(sel)
                        if el:
                            content = await el.inner_text()
                            if len(content) > 50:
                                break
                    
                    if not content or len(content) < 50:
                        # 兜底：取页面主体文本
                        content = await detail_page.evaluate("""
                            () => {
                                const main = document.querySelector('main') || document.querySelector('.main') || document.body;
                                return main.innerText;
                            }
                        """)
                    
                    # 提取元信息
                    company = ""
                    position = ""
                    
                    # 尝试从标签/标题中提取公司和岗位
                    tags = await detail_page.query_selector_all('[class*="tag"], [class*="label"]')
                    for tag in tags:
                        tag_text = await tag.inner_text()
                        tag_text = tag_text.strip()
                        if tag_text and len(tag_text) < 20:
                            if not company:
                                company = tag_text
                            elif not position:
                                position = tag_text
                    
                    if content and len(content) > 50:
                        item_data = {
                            "title": link["title"],
                            "url": link["url"],
                            "content": content[:5000],  # 限制长度
                            "company": company,
                            "position": position,
                            "category": "interview_experience",
                            "source": "nowcoder",
                            "crawled_at": datetime.now().isoformat()
                        }
                        all_items.append(item_data)
                        print(f"    ✓ 成功 ({len(content)} 字符)")
                    else:
                        print(f"    ✗ 内容太短，跳过")
                    
                    await detail_page.close()
                    await asyncio.sleep(DELAY_BETWEEN_ITEMS)
                    
                except Exception as e:
                    print(f"    ✗ 错误: {e}")
                    try:
                        await detail_page.close()
                    except:
                        pass
            
            # 翻页
            if page_num < MAX_PAGES:
                try:
                    next_btn = await page.query_selector('[class*="next"], [class*="pagination"] a:last-child, button:has-text("下一页")')
                    if next_btn:
                        await next_btn.click()
                        await asyncio.sleep(DELAY_BETWEEN_PAGES)
                    else:
                        # 滚动加载更多
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        await asyncio.sleep(DELAY_BETWEEN_PAGES)
                except Exception as e:
                    print(f"  翻页失败: {e}")
                    break
        
        # 保存结果
        print(f"\n{'=' * 50}")
        print(f"爬取完成！共获取 {len(all_items)} 条面经")
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(all_items, f, ensure_ascii=False, indent=2)
        
        print(f"数据已保存到: {OUTPUT_FILE}")
        print(f"{'=' * 50}")
        
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
