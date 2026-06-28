-- ============================================================================
-- PM LINE ASSISTANT - Database Schema (Supabase / PostgreSQL)
-- วิธีใช้ (ติดตั้งใหม่): เปิด Supabase Dashboard > SQL Editor > วางสคริปต์นี้ทั้งหมด > Run
-- ถ้ามี DB เดิมอยู่แล้ว ให้รัน sql/migrate.sql แทน (เพิ่มเฉพาะคอลัมน์ใหม่)
-- ============================================================================

-- เปิดใช้งานฟังก์ชันสร้าง UUID (Supabase เปิดให้อยู่แล้วโดยปริยาย แต่ใส่ไว้กันพลาด)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- ตาราง pm_appointments : คิวนัดหมาย + สถานะการแจ้งเตือน
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT,                                  -- LINE userId ของผู้รับการเตือน (push)
  title             VARCHAR(255) NOT NULL,
  date_time         TIMESTAMPTZ NOT NULL,                  -- เวลานัดหมาย (เก็บเป็น UTC, แสดงผลตาม TZ)
  location          TEXT,
  is_acknowledged   BOOLEAN NOT NULL DEFAULT FALSE,        -- กด [รับทราบแล้ว] หรือยัง
  is_dismissed      BOOLEAN NOT NULL DEFAULT FALSE,        -- กด [ปิดการเตือน] — หยุดเตือนถาวร (นัดยังอยู่)
  snooze_until      TIMESTAMPTZ,                           -- กด [เลื่อน] — ข้ามการเตือนจนถึงเวลานี้
  pending_confirm   BOOLEAN NOT NULL DEFAULT FALSE,        -- นัดซ้ำที่รอผู้ใช้กดยืนยัน (ยังไม่ถูกเตือน/ไม่โผล่ digest)
  reminded_1h_sent  BOOLEAN NOT NULL DEFAULT FALSE,        -- ส่ง Final Alert (1 ชม.ก่อน) แล้วหรือยัง
  last_reminder_at  TIMESTAMPTZ,                           -- เวลาที่ส่งเตือนรอบล่าสุด (ใช้คุม loop 6 ชม.)
  calendar_event_id TEXT,                                  -- id event ใน Google Calendar (ไว้แก้/ลบภายหลัง)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- ตาราง pm_tasks : รายการงาน/To-Do (มีกำหนดส่ง due_date ได้)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT,
  task_description  TEXT NOT NULL,
  due_date          DATE,                                  -- กำหนดส่ง (ถ้ามี) — ใช้เตือนแบบ "วันถึงกำหนด" + overdue
  status            VARCHAR(20) NOT NULL DEFAULT 'Pending'
                      CHECK (status IN ('Pending', 'Done')),
  is_dismissed      BOOLEAN NOT NULL DEFAULT FALSE,        -- ปิดงานนี้ออกจาก digest (ไม่ลบ)
  source            VARCHAR(20) NOT NULL DEFAULT 'text'    -- 'text' | 'voice'
                      CHECK (source IN ('text', 'voice')),
  calendar_event_id TEXT,                                  -- id all-day event ใน Google Calendar
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- ตาราง pm_materials : พัสดุ/วัสดุ (สำหรับ /check_stock)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name     VARCHAR(255) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'Pending',
  delivery_due_date DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Indexes เพื่อ performance ของ query ที่ cron เรียกบ่อย
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appt_due       ON pm_appointments (date_time);
CREATE INDEX IF NOT EXISTS idx_appt_pending   ON pm_appointments (is_acknowledged, date_time);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON pm_tasks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due      ON pm_tasks (status, due_date);
CREATE INDEX IF NOT EXISTS idx_materials_due  ON pm_materials (status, delivery_due_date);
