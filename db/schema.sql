-- Schema for AwesomeMark Netlify Functions
-- Create required tables for auth + mood tracking

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  username text,
  avatar_url text,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mood_records (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_type text NOT NULL,
  intensity integer NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
  note text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_mood_records_user_created
  ON mood_records (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_tasks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_date date NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date
  ON daily_tasks (user_id, task_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user
  ON user_sessions (user_id);



CREATE TABLE couple_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 成员关系
  user_id_1 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 角色标记（谁发起的邀请）
  creator_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 邀请状态: 'pending', 'accepted', 'rejected'
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  
  -- 空间名称（可选，默认 "Our Space"）
  space_name text DEFAULT 'Our Space',
  
  -- 时间戳
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- 软删除
  deleted_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  
  -- 唯一性约束：同一对用户只能有一个有效空间
  CONSTRAINT unique_active_couple CHECK (
    (is_deleted = false AND user_id_1 < user_id_2) OR is_deleted = true
  )
);


CREATE TABLE couple_mood_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 所属空间
  space_id uuid NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  
  -- 记录创建者
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 情绪数据（与 mood_records 表结构一致）
  mood_type text NOT NULL CHECK (mood_type IN ('happy', 'calm', 'anxious', 'sad', 'angry')),
  intensity smallint NOT NULL DEFAULT 5 CHECK (intensity >= 1 AND intensity <= 10),
  
  -- 加密字段（复用现有 AES-256-GCM 加密逻辑）
  note text,
  
  -- 标签
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- 时间戳
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- 软删除
  deleted_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false
);