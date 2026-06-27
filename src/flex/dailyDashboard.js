'use strict';

const { formatThaiDate, formatThaiDateTime, now } = require('../config/datetime');

/**
 * การ์ดสรุปงานยามเช้า
 * @param {Object} data
 * @param {Object|null} data.weather - { description, temp, feelsLike, humidity, pm25, pm25Label }
 * @param {Array}  data.appointments - นัดหมายของวันนี้ [{ title, date_time, location }]
 * @param {Array}  data.tasks - งานค้าง [{ task_description }]
 * @param {String} data.cityName
 */
function dailyDashboard({ weather, appointments, tasks, cityName }) {
  const today = now();
  const bodyContents = [];

  // ---- ส่วนสภาพอากาศ ----
  bodyContents.push({
    type: 'text', text: '🌤️ สภาพอากาศวันนี้', weight: 'bold', size: 'md', color: '#24292F'
  });
  if (weather) {
    bodyContents.push({
      type: 'box', layout: 'vertical', spacing: 'xs', margin: 'sm', contents: [
        kv(`${cityName} • ${weather.description}`),
        kv(`🌡️ อุณหภูมิ ${weather.temp}°C (รู้สึกเหมือน ${weather.feelsLike}°C)`),
        kv(`💧 ความชื้น ${weather.humidity}%`),
        kv(`😷 PM2.5 ${weather.pm25} µg/m³ — ${weather.pm25Label}`)
      ]
    });
  } else {
    bodyContents.push(kv('ℹ️ ดึงข้อมูลสภาพอากาศไม่สำเร็จในขณะนี้'));
  }

  bodyContents.push({ type: 'separator', margin: 'lg' });

  // ---- ส่วนนัดหมายวันนี้ ----
  bodyContents.push({
    type: 'text', text: `📅 นัดหมายวันนี้ (${appointments.length})`, weight: 'bold', size: 'md', margin: 'lg', color: '#24292F'
  });
  if (appointments.length > 0) {
    appointments.forEach((a) => {
      bodyContents.push({
        type: 'box', layout: 'vertical', margin: 'sm', spacing: 'none', contents: [
          { type: 'text', text: `• ${a.title}`, size: 'sm', wrap: true, color: '#24292F', weight: 'bold' },
          { type: 'text', text: `   ${formatThaiDateTime(a.date_time)} ${a.location ? '@ ' + a.location : ''}`, size: 'xs', wrap: true, color: '#8B949E' }
        ]
      });
    });
  } else {
    bodyContents.push(kv('— ไม่มีนัดหมาย —'));
  }

  bodyContents.push({ type: 'separator', margin: 'lg' });

  // ---- ส่วนงานค้าง ----
  bodyContents.push({
    type: 'text', text: `✅ งานค้าง (${tasks.length})`, weight: 'bold', size: 'md', margin: 'lg', color: '#24292F'
  });
  if (tasks.length > 0) {
    tasks.slice(0, 10).forEach((t) => {
      bodyContents.push({ type: 'text', text: `• ${t.task_description}`, size: 'sm', wrap: true, color: '#24292F', margin: 'xs' });
    });
    if (tasks.length > 10) {
      bodyContents.push({ type: 'text', text: `…และอีก ${tasks.length - 10} รายการ`, size: 'xs', color: '#8B949E', margin: 'xs' });
    }
  } else {
    bodyContents.push(kv('— ไม่มีงานค้าง เยี่ยมมาก! —'));
  }

  return {
    type: 'flex',
    altText: `สรุปงานยามเช้า ${formatThaiDate(today.toISO())}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#0D1117', paddingAll: '16px', contents: [
          { type: 'text', text: '☀️ สรุปงานยามเช้า', color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: formatThaiDate(today.toISO()), color: '#8B949E', size: 'sm', margin: 'xs' }
        ]
      },
      body: { type: 'box', layout: 'vertical', paddingAll: '16px', contents: bodyContents }
    }
  };
}

function kv(text) {
  return { type: 'text', text, size: 'sm', wrap: true, color: '#57606A' };
}

module.exports = dailyDashboard;
