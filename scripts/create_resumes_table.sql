-- ===== 简历表 =====
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,             -- 原始文件名
  file_size INT DEFAULT 0,             -- 文件字节数
  raw_text TEXT DEFAULT '',            -- 简历正文（前 3000 字）
  parsed_data JSONB DEFAULT '{}',      -- 完整解析结果（含诊断、岗位推荐等）
  parse_status TEXT DEFAULT 'pending', -- pending / parsing / parsed / failed
  is_active BOOLEAN DEFAULT FALSE,     -- 是否为当前使用中的简历
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按用户查询 + 按时间排序
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_active ON resumes(user_id, is_active);

-- 每个用户只能有一份 active 简历（通过应用层保证，DB 层用部分唯一索引兜底）
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_one_active_per_user
  ON resumes(user_id) WHERE is_active = TRUE;

-- RLS（与现有表风格一致）
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON resumes FOR ALL USING (true);
