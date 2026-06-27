'use strict';

const express = require('express');
const config = require('./config/env');
const { line } = require('./config/lineClient');
const { getOAuth2Client } = require('./config/googleCalendar');
const webhookRoute = require('./routes/webhook');
const cronRoute = require('./routes/cron');
const reminderEngine = require('./cron/reminderEngine');
const dailyReport = require('./cron/dailyReport');

const app = express();

// ---- Webhook (ต้องมาก่อน express.json เพราะ SDK ต้องอ่าน raw body เอง) ----
app.use('/webhook', webhookRoute);

// ---- Cron HTTP endpoints (ให้ตัวจับเวลาภายนอกยิงเข้ามา) ----
app.use('/cron', cronRoute);

// ---- Health check ----
app.get('/', (req, res) => {
  res.json({
    service: 'PM LINE Assistant',
    status: 'ok',
    timezone: config.server.timezone,
    features: config.features,
    time: new Date().toISOString()
  });
});

// ---- Google OAuth helper (ใช้ครั้งเดียวตอนตั้งค่าเพื่อขอ refresh_token) ----
// 1) เปิด /authorize ในเบราว์เซอร์ -> ล็อกอิน Google -> อนุญาต
// 2) ระบบจะ redirect มาที่ /oauth2callback แล้วแสดง refresh_token ให้คัดลอกไปใส่ .env
app.get('/authorize', (req, res) => {
  if (!config.google.clientId) {
    return res.status(400).send('ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ใน .env');
  }
  const oAuth2Client = getOAuth2Client();
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events']
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('ไม่พบ authorization code');
    const oAuth2Client = getOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);
    res.send(
      `<h3>คัดลอกค่า refresh_token นี้ไปใส่ใน .env ที่ GOOGLE_REFRESH_TOKEN</h3>` +
      `<pre style="background:#f6f8fa;padding:16px;border-radius:8px;">${tokens.refresh_token || '(ไม่ได้รับ refresh_token — ลองเพิ่ม prompt=consent หรือถอนสิทธิ์เดิมก่อน)'}</pre>`
    );
  } catch (err) {
    console.error('[OAuth] แลก token ล้มเหลว:', err.message);
    res.status(500).send('แลก token ล้มเหลว: ' + err.message);
  }
});

// ---- Error handler สำหรับ signature ที่ตรวจไม่ผ่าน ----
app.use((err, req, res, next) => {
  if (err instanceof line.SignatureValidationFailed) {
    console.warn('[Webhook] signature ไม่ถูกต้อง');
    return res.status(401).send('Invalid signature');
  }
  if (err instanceof line.JSONParseError) {
    console.warn('[Webhook] body ไม่ใช่ JSON ที่ถูกต้อง');
    return res.status(400).send('Invalid body');
  }
  console.error('[Server] error:', err.message);
  res.status(500).send('Internal Server Error');
});

// ---- Start server + cron ----
const server = app.listen(config.server.port, () => {
  console.log('============================================');
  console.log(' PM LINE Assistant (Free Stack) พร้อมทำงาน');
  console.log(` Port      : ${config.server.port}`);
  console.log(` Timezone  : ${config.server.timezone}`);
  console.log(` AI        : Gemini (${config.gemini.model})`);
  console.log(` Calendar  : ${config.features.googleCalendar ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อม'}`);
  console.log(` Weather   : Open-Meteo (ไม่ต้องใช้ key)`);
  console.log(` HTTP Cron : ${config.features.httpCron ? 'เปิด (/cron/*)' : 'ปิด (ยังไม่ตั้ง CRON_SECRET)'}`);
  console.log('============================================');

  reminderEngine.start();
  dailyReport.start();
});

// ---- Graceful shutdown ----
function shutdown(signal) {
  console.log(`\n[Server] ได้รับสัญญาณ ${signal} — กำลังปิดระบบ`);
  server.close(() => {
    console.log('[Server] ปิดเรียบร้อย');
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
