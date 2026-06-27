# 🤖 PM LINE Assistant — เลขาฯ ส่วนตัว PM (เวอร์ชันฟรีล้วน)

LINE Bot หลังบ้านครบวงจร ใช้เครื่องมือ **ฟรี 100%** ไม่ต้องผูกบัตรเครดิต
**Node.js (Express) + Supabase + Google Gemini + Open-Meteo** เชื่อม Google Calendar (ตัวเลือกเสริม)

---

## ✨ ความสามารถ
- 🗣️ พิมพ์นัดเป็นภาษาพูด → สกัดด้วย Gemini → บันทึก + ลง Google Calendar + ตอบ Flex สรุป
- ⏰ เตือน 24 ชม. → ย้ำทุก 6 ชม. จนกด [รับทราบแล้ว] → เตือนรอบสุดท้าย 1 ชม.ก่อนนัด
- 📄 ส่งไฟล์ PDF/Word/Excel → สรุป Executive Summary ≤ 10 บรรทัด
- ☀️ รายงานเช้า 06:00 — อากาศ + PM2.5 (Open-Meteo) + นัด + งานค้าง
- 🎙️ ส่งเสียง → Gemini ถอดเป็นข้อความ → บันทึกเป็น To-Do

---

## 🧰 ชุดเครื่องมือฟรี (ไม่ต้องใช้บัตร)

| งาน | บริการ | สมัครที่ |
|---|---|---|
| LLM + สรุปไฟล์ + ถอดเสียง | Google Gemini (Flash) | https://aistudio.google.com/apikey |
| ฐานข้อมูล | Supabase | https://supabase.com |
| LINE Bot | LINE Messaging API | https://developers.line.biz |
| อากาศ + PM2.5 | Open-Meteo | ไม่ต้องสมัคร / ไม่ต้องมี key |
| ปฏิทิน (เสริม) | Google Calendar API | https://console.cloud.google.com |
| Hosting | Render (free web service) | https://render.com |
| ตัวจับเวลา (cron) | cron-job.org | https://cron-job.org |

> ⚠️ Gemini free tier: Google อาจนำ prompt ไปปรับปรุงโมเดล และโควตาจำกัด/เปลี่ยนได้ — เลี่ยงส่งข้อมูลลับสุด ๆ

---

## 🚀 ติดตั้ง (ขั้นตอนเรียงลำดับ — ห้ามสลับ)

### 1) ฐานข้อมูล Supabase
สร้างโปรเจกต์ → SQL Editor → วาง `sql/schema.sql` → Run → คัดลอก `Project URL` + `service_role key`

### 2) Gemini API key
ไปที่ AI Studio → Get API key → คัดลอกใส่ `GEMINI_API_KEY` (ไม่ต้องผูกบัตร)

### 3) LINE Messaging API
สร้าง channel → คัดลอก Channel secret + Access token → ปิด Auto-reply/Greeting

### 4) เตรียม .env
```bash
npm install
cp .env.example .env   # เติมค่าทั้งหมด + ตั้ง CRON_SECRET เป็นสตริงสุ่มยาว ๆ
```

### 5) Deploy บน Render (ฟรี ไม่ต้องใช้บัตร)
1. `git push` ขึ้น GitHub
2. Render → **New → Web Service** → เลือก repo
3. Build Command: `npm install` • Start Command: `npm start`
4. ใส่ **Environment Variables** ให้ครบตาม `.env` (รวม `CRON_SECRET`)
5. Deploy → Render แจก URL เช่น `https://pm-line-assistant.onrender.com`

### 6) ตั้ง Webhook & Calendar redirect
- LINE Webhook URL = `https://<render-url>/webhook` → เปิด Use webhook
- (ถ้าใช้ Calendar) Google redirect URI = `https://<render-url>/oauth2callback` แล้วเปิด `/authorize` เพื่อขอ refresh_token

### 7) ตั้งตัวจับเวลา cron-job.org (หัวใจของเวอร์ชันฟรี)
สร้าง 3 cronjob (ใส่ Header `X-Cron-Secret` = ค่าเดียวกับ `CRON_SECRET`):

| Job | URL | กำหนดเวลา |
|---|---|---|
| เตือนความจำ | `POST https://<url>/cron/reminders` | ทุก 1 ชั่วโมง |
| รายงานเช้า | `POST https://<url>/cron/daily` | ทุกวัน 06:00 (ตั้ง timezone = Asia/Bangkok) |
| กันแอปหลับ | `GET https://<url>/cron/ping` | ทุก 10 นาที |

> Render free จะหลับหลังไม่มีทราฟฟิก 15 นาที — job "กันแอปหลับ" ช่วยปลุกไว้ และอยู่ในเพดาน 750 ชม./เดือนพอดี

### 8) หา PM userId
ทักบอทพิมพ์ `/whoami` → ใส่ค่าใน `PM_LINE_USER_ID` (ใน Render env) → redeploy

---

## 🧪 ทดสอบ
```bash
# ทดสอบ cron ด้วยตัวเอง (ใส่ secret จริง)
curl -X POST -H "X-Cron-Secret: <CRON_SECRET>" https://<url>/cron/reminders
curl -X POST -H "X-Cron-Secret: <CRON_SECRET>" https://<url>/cron/daily
```
- พิมพ์ "ประชุมพรุ่งนี้ 10 โมงเช้าที่ออฟฟิศ" → ได้การ์ดสรุป
- ส่งไฟล์ .pdf/.docx/.xlsx → ได้บทสรุป
- อัดเสียงสั้น ๆ → บันทึกเป็น To-Do

---

## 🔄 ทางเลือก Oracle Cloud / VPS (อัปเกรดภายหลัง)
ถ้าย้ายไป VM ที่ไม่หลับ ให้เปิด node-cron ในแอปแทน cron-job.org:
```bash
ENABLE_REMINDER_CRON=true
ENABLE_DAILY_REPORT_CRON=true
```
แล้วรันด้วย PM2: `pm2 start src/index.js --name pm-line-assistant`
(ต้องมี HTTPS สำหรับ webhook — ใช้ Caddy/Nginx + Let's Encrypt)

---

## 📝 หมายเหตุสคีมา
ตาราง `pm_appointments` / `pm_tasks` คงคอลัมน์ตามสเปกเดิม และเพิ่ม `user_id`, `reminded_1h_sent`,
`last_reminder_at`, `calendar_event_id` (จำเป็นต่อ Reminder Engine)

## 🔒 ความปลอดภัย
- `/webhook` ตรวจ `X-Line-Signature` ทุก request
- `/cron/*` ต้องมี `X-Cron-Secret` ตรงกับ `CRON_SECRET` (ถ้าไม่ตั้ง endpoint จะปิด)
- อย่า commit `.env`
