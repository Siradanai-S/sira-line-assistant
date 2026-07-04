'use strict';

const axios = require('axios');
const config = require('../config/env');
const { TZ } = require('../config/datetime');

/** จัดระดับคุณภาพอากาศจากค่า PM2.5 (เกณฑ์ AQI แบบย่อ) */
function pm25Label(pm25) {
  if (pm25 <= 12) return 'ดีมาก 🟢';
  if (pm25 <= 35.4) return 'ปานกลาง 🟡';
  if (pm25 <= 55.4) return 'เริ่มมีผลต่อสุขภาพ 🟠';
  if (pm25 <= 150.4) return 'มีผลต่อสุขภาพ 🔴';
  return 'อันตราย 🟣';
}

/** แปลรหัสสภาพอากาศ WMO (Open-Meteo) เป็นคำอธิบายภาษาไทย */
function weatherCodeToThai(code) {
  const map = {
    0: 'ท้องฟ้าแจ่มใส',
    1: 'มีเมฆเล็กน้อย',
    2: 'มีเมฆบางส่วน',
    3: 'เมฆมาก',
    45: 'มีหมอก',
    48: 'หมอกน้ำแข็ง',
    51: 'ฝนปรอยเล็กน้อย',
    53: 'ฝนปรอย',
    55: 'ฝนปรอยหนาแน่น',
    61: 'ฝนเล็กน้อย',
    63: 'ฝนปานกลาง',
    65: 'ฝนตกหนัก',
    71: 'หิมะเล็กน้อย',
    73: 'หิมะปานกลาง',
    75: 'หิมะตกหนัก',
    80: 'ฝนซู่เล็กน้อย',
    81: 'ฝนซู่ปานกลาง',
    82: 'ฝนซู่รุนแรง',
    95: 'พายุฝนฟ้าคะนอง',
    96: 'พายุฝนฟ้าคะนองมีลูกเห็บ',
    99: 'พายุฝนฟ้าคะนองรุนแรงมีลูกเห็บ'
  };
  return map[code] || 'ไม่ทราบสภาพอากาศ';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GET พร้อม retry สำหรับความผิดพลาดชั่วคราว (network/timeout/5xx) */
async function getWithRetry(url, params, { retries = 2, timeout = 12000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, { params, timeout });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await delay(600 * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * ฟังก์ชันแปลงข้อมูลดิบ Open-Meteo เป็นรูปแบบที่ใช้แสดงผล (แยกออกมาเพื่อทดสอบได้)
 * @param {Object} weatherData - response จาก /v1/forecast (current)
 * @param {Object|null} airData - response จาก /v1/air-quality (current) — อาจไม่มีถ้าดึงค่าฝุ่นไม่ได้
 */
function mapOpenMeteo(weatherData, airData) {
  const cur = (weatherData && weatherData.current) || {};
  const air = (airData && airData.current) || null;
  const hasPm = air && typeof air.pm2_5 === 'number';
  const pm25Value = hasPm ? Math.round(air.pm2_5 * 10) / 10 : null;

  return {
    description: weatherCodeToThai(cur.weather_code),
    temp: Math.round(cur.temperature_2m ?? 0),
    feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
    humidity: Math.round(cur.relative_humidity_2m ?? 0),
    pm25: pm25Value,
    pm25Label: hasPm ? pm25Label(pm25Value) : 'ไม่มีข้อมูล'
  };
}

/**
 * ดึงสภาพอากาศปัจจุบัน + ค่าฝุ่น PM2.5 จาก Open-Meteo (ฟรี ไม่ต้องมี API key)
 * - แต่ละ endpoint มี retry เอง และแยกอิสระ (allSettled)
 * - ถ้าค่าฝุ่นดึงไม่ได้ ยังคืนอากาศให้ (pm25 = null)
 * - คืน null เฉพาะเมื่อ "อากาศหลัก" ดึงไม่สำเร็จจริง ๆ หลัง retry
 * @returns {Object|null}
 */
async function getWeather() {
  const { lat, lon } = config.weather;

  const [weatherResult, airResult] = await Promise.allSettled([
    getWithRetry('https://api.open-meteo.com/v1/forecast', {
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code',
      timezone: TZ
    }),
    getWithRetry('https://air-quality-api.open-meteo.com/v1/air-quality', {
      latitude: lat,
      longitude: lon,
      current: 'pm2_5',
      timezone: TZ
    })
  ]);

  if (weatherResult.status !== 'fulfilled') {
    console.error('[Weather] ดึงสภาพอากาศหลักไม่สำเร็จ (หลัง retry):', weatherResult.reason?.message);
    return null;
  }

  const airData = airResult.status === 'fulfilled' ? airResult.value : null;
  if (!airData) {
    console.warn('[Weather] ดึงค่าฝุ่น PM2.5 ไม่สำเร็จ — แสดงเฉพาะสภาพอากาศ:', airResult.reason?.message);
  }

  return mapOpenMeteo(weatherResult.value, airData);
}

module.exports = {
  getWeather,
  mapOpenMeteo,
  pm25Label,
  weatherCodeToThai
};
