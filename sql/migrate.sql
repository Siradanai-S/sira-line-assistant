-- ============================================================================
-- PM LINE ASSISTANT - Migration สำหรับ DB ที่ติดตั้งไปแล้ว
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางทั้งหมด > Run
-- ปลอดภัยต่อการรันซ้ำ (idempotent ด้วย IF NOT EXISTS)
-- ============================================================================

-- ---- pm_appointments: คอลัมน์จากฟีเจอร์ snooze/dismiss + conflict confirm ----
ALTER TABLE pm_appointments ADD COLUMN IF NOT EXISTS is_dismissed     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pm_appointments ADD COLUMN IF NOT EXISTS snooze_until     TIMESTAMPTZ;
ALTER TABLE pm_appointments ADD COLUMN IF NOT EXISTS pending_confirm  BOOLEAN NOT NULL DEFAULT FALSE;

-- ---- pm_tasks: To-Do มีกำหนดส่ง + sync calendar + ปิดงานออกจาก digest ----
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS due_date          DATE;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS is_dismissed      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- ---- index ใหม่ ----
CREATE INDEX IF NOT EXISTS idx_tasks_due ON pm_tasks (status, due_date);
