'use strict';

const { google } = require('googleapis');
const config = require('./env');

/**
 * สร้าง OAuth2 client ที่ผูก refresh_token ไว้แล้ว
 * รูปแบบนี้เหมาะกับ "เลขาฯ ส่วนตัว PM คนเดียว" — authorize ครั้งเดียว ใช้ refresh_token ตลอด
 * (วิธีได้ refresh_token ดูใน README หัวข้อ Google Calendar Setup)
 */
function getOAuth2Client() {
  const oAuth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
  oAuth2Client.setCredentials({ refresh_token: config.google.refreshToken });
  return oAuth2Client;
}

/** คืน instance ของ Calendar API พร้อม auth */
function getCalendarApi() {
  const auth = getOAuth2Client();
  return google.calendar({ version: 'v3', auth });
}

module.exports = {
  google,
  getOAuth2Client,
  getCalendarApi
};
