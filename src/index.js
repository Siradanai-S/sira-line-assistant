'use strict';

const express = require('express');
const config = require('./config/env');
const { line } = require('./config/lineClient');
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
