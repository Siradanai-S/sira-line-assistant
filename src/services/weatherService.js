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

/**
 * ฟังก์ชันแปลงข้อมูลดิบ Open-Meteo เป็นรูปแบบที่ใช้แสดงผล (แยกออกมาเพื่อทดสอบได้)
 * @param {Object} weatherData - response จาก /v1/forecast (current)
 * @param {Object} airData - response จาก /v1/air-quality (current)
 */
function mapOpenMeteo(weatherData, airData) {
  const cur = weatherData.current || {};
  const air = airData.current || {};
  const pm25Raw = typeof air.pm2_5 === 'number' ? air.pm2_5 : 0;
  const pm25Value = Math.round(pm25Raw * 10) / 10;

  return {
    description: weatherCodeToThai(cur.weather_code),
    temp: Math.round(cur.temperature_2m ?? 0),
    feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
    humidity: Math.round(cur.relative_humidity_2m ?? 0),
    pm25: pm25Value,
    pm25Label: pm25Label(pm25Value)
  };
}

/**
 * ดึงสภาพอากาศปัจจุบัน + ค่าฝุ่น PM2.5 จาก Open-Meteo (ฟรี ไม่ต้องมี API key)
 * @returns {Object|null}
 */
async function getWeather() {
  const { lat, lon } = config.weather;

  const [weatherRes, airRes] = await Promise.all([
    axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code',
        timezone: TZ
      },
      timeout: 15000
    }),
    axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'pm2_5',
        timezone: TZ
      },
      timeout: 15000
    })
  ]);

  return mapOpenMeteo(weatherRes.data, airRes.data);
}

module.exports = {
  getWeather,
  mapOpenMeteo,
  pm25Label,
  weatherCodeToThai
};
