'use strict';

require('dotenv').config();

/**
 * รวมศูนย์การอ่านค่า Environment Variables และตรวจสอบความครบถ้วน
 * เวอร์ชัน "ฟรีล้วน": ใช้ Gemini (แทน OpenAI) + Open-Meteo (ไม่ต้องมี key)
 */

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`[ENV] ค่าจำเป็น "${name}" ยังไม่ได้ตั้งค่าในไฟล์ .env`);
  }
  return String(value).trim();
}

function optional(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  return String(value).trim();
}

const config = {
  server: {
    port: parseInt(optional('PORT', '3000'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
    timezone: optional('TZ', 'Asia/Bangkok')
  },
  line: {
    channelAccessToken: required('LINE_CHANNEL_ACCESS_TOKEN'),
    channelSecret: required('LINE_CHANNEL_SECRET'),
    pmUserId: optional('PM_LINE_USER_ID', '')
  },
  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY')
  },
  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    model: optional('GEMINI_MODEL', 'gemini-2.5-flash'),
    audioMime: optional('GEMINI_AUDIO_MIME', 'audio/mp4')
  },
  google: {
    clientId: optional('GOOGLE_CLIENT_ID', ''),
    clientSecret: optional('GOOGLE_CLIENT_SECRET', ''),
    redirectUri: optional('GOOGLE_REDIRECT_URI', ''),
    refreshToken: optional('GOOGLE_REFRESH_TOKEN', ''),
    calendarId: optional('GOOGLE_CALENDAR_ID', 'primary')
  },
  weather: {
    // Open-Meteo ไม่ต้องใช้ API key — ตั้งแค่พิกัด
    lat: parseFloat(optional('WEATHER_LAT', '13.7563')),
    lon: parseFloat(optional('WEATHER_LON', '100.5018')),
    cityName: optional('WEATHER_CITY_NAME', 'กรุงเทพมหานคร')
  },
  cron: {
    // ดีฟอลต์ปิด node-cron ในแอป เพราะบน Render free แอปจะหลับ
    // ให้ใช้ตัวจับเวลาภายนอก (cron-job.org) ยิงเข้า /cron/* แทน
    enableReminder: optional('ENABLE_REMINDER_CRON', 'false') === 'true',
    enableDailyReport: optional('ENABLE_DAILY_REPORT_CRON', 'false') === 'true',
    // secret สำหรับป้องกัน endpoint /cron/* (ถ้าเว้นว่าง endpoint จะถูกปิด)
    secret: optional('CRON_SECRET', '')
  }
};

/** ฟีเจอร์ที่จะถูกเปิด/ปิดอัตโนมัติตามความพร้อมของ key */
config.features = {
  googleCalendar: Boolean(config.google.clientId && config.google.clientSecret && config.google.refreshToken),
  weather: true, // Open-Meteo ใช้ได้เสมอ ไม่ต้องมี key
  httpCron: Boolean(config.cron.secret)
};

module.exports = config;
