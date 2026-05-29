"""用户、面试记录、JD 库的 Supabase 服务"""

import logging
from supabase import create_client
from .config import config

logger = logging.getLogger("rag.user_service")


class UserService:
    """用户数据管理"""

    def __init__(self):
        self.supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)

    # ===== 用户 =====
    async def create_user(self, data: dict) -> dict:
        """创建用户"""
        response = self.supabase.table("users").insert(data).execute()
        return response.data[0] if response.data else {}

    async def get_user(self, user_id: str) -> dict:
        """获取用户"""
        response = self.supabase.table("users").select("*").eq("id", user_id).execute()
        return response.data[0] if response.data else {}

    async def update_user(self, user_id: str, data: dict) -> dict:
        """更新用户"""
        response = self.supabase.table("users").update(data).eq("id", user_id).execute()
        return response.data[0] if response.data else {}

    # ===== 面试记录 =====
    async def create_interview(self, data: dict) -> dict:
        """创建面试记录"""
        response = self.supabase.table("interview_sessions").insert(data).execute()
        return response.data[0] if response.data else {}

    async def update_interview(self, session_id: str, data: dict) -> dict:
        """更新面试记录（保存对话、评分等）"""
        response = self.supabase.table("interview_sessions").update(data).eq("id", session_id).execute()
        return response.data[0] if response.data else {}

    async def get_interview(self, session_id: str) -> dict:
        """获取单条面试记录"""
        response = self.supabase.table("interview_sessions").select("*").eq("id", session_id).execute()
        return response.data[0] if response.data else {}

    async def list_interviews(self, user_id: str, page: int = 1, page_size: int = 10) -> list:
        """获取用户的面试记录列表"""
        offset = (page - 1) * page_size
        response = self.supabase.table("interview_sessions").select(
            "id, target_position, avg_score, status, total_questions, started_at, completed_at"
        ).eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
        return response.data or []

    # ===== JD 库 =====
    async def save_jd(self, data: dict) -> dict:
        """保存 JD"""
        response = self.supabase.table("jd_library").insert(data).execute()
        return response.data[0] if response.data else {}

    async def list_jds(self, user_id: str) -> list:
        """获取用户保存的 JD 列表"""
        response = self.supabase.table("jd_library").select(
            "id, title, company, salary, city, created_at"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
        return response.data or []

    async def get_jd(self, jd_id: str) -> dict:
        """获取单条 JD"""
        response = self.supabase.table("jd_library").select("*").eq("id", jd_id).execute()
        return response.data[0] if response.data else {}

    async def delete_jd(self, jd_id: str) -> bool:
        """删除 JD"""
        response = self.supabase.table("jd_library").delete().eq("id", jd_id).execute()
        return bool(response.data)

    # ===== 简历 =====
    async def create_resume(self, data: dict) -> dict:
        """创建简历记录"""
        response = self.supabase.table("resumes").insert(data).execute()
        return response.data[0] if response.data else {}

    async def list_resumes(self, user_id: str) -> list:
        """获取用户的所有简历"""
        response = (
            self.supabase.table("resumes")
            .select("id, file_name, file_size, parse_status, is_active, parsed_data, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    async def get_resume(self, resume_id: str) -> dict:
        """获取单份简历完整数据"""
        response = self.supabase.table("resumes").select("*").eq("id", resume_id).execute()
        return response.data[0] if response.data else {}

    async def update_resume(self, resume_id: str, data: dict) -> dict:
        """更新简历"""
        response = self.supabase.table("resumes").update(data).eq("id", resume_id).execute()
        return response.data[0] if response.data else {}

    async def delete_resume(self, resume_id: str) -> bool:
        """删除简历"""
        response = self.supabase.table("resumes").delete().eq("id", resume_id).execute()
        return bool(response.data)

    async def set_active_resume(self, user_id: str, resume_id: str) -> dict:
        """切换活跃简历：先把该用户所有简历置为 inactive，再把目标设为 active"""
        # 1. 全部置 inactive
        self.supabase.table("resumes").update({"is_active": False}).eq("user_id", user_id).execute()
        # 2. 设置目标为 active
        response = (
            self.supabase.table("resumes")
            .update({"is_active": True})
            .eq("id", resume_id)
            .eq("user_id", user_id)
            .execute()
        )
        return response.data[0] if response.data else {}
