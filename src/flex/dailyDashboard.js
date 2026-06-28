'use strict';

const { formatThaiDate, formatThaiDateTime, now } = require('../config/datetime');

/**
 * การ์ดสรุปงานยามเช้า (digest) — แยกหัวข้อ นัดหมาย / To-Do
 * @param {Object} data
 * @param {Object|null} data.weather - { description, temp, feelsLike, humidity, pm25, pm25Label }
 * @param {Array}  data.appointments - นัดหมายของวันนี้ [{ title, date_time, location }]
 * @param {Array}  data.tasks - To-Do ที่ถึง/เลยกำหนด [{ id, task_description, due_date }]
 * @param {String} data.cityName
 */
function dailyDashboard({ weather, appointments, tasks, cityName }) {
  const today = now();
  const todayDate = today.toISODate();
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

  // ---- ส่วน To-Do (แยก เลยกำหนด / ถึงกำหนดวันนี้) ----
  const overdue = (tasks || []).filter((t) => t.due_date && t.due_date < todayDate);
  const dueToday = (tasks || []).filter((t) => t.due_date && t.due_date === todayDate);

  bodyContents.push({
    type: 'text', text: `✅ To-Do ที่ต้องทำ (${overdue.length + dueToday.length})`, weight: 'bold', size: 'md', margin: 'lg', color: '#24292F'
  });

  if (overdue.length === 0 && dueToday.length === 0) {
    bodyContents.push(kv('— ไม่มีงานถึงกำหนด เยี่ยมมาก! —'));
  } else {
    if (overdue.length > 0) {
      bodyContents.push({ type: 'text', text: `🔴 เลยกำหนด (${overdue.length})`, size: 'sm', weight: 'bold', color: '#CF222E', margin: 'md' });
      overdue.forEach((t) => bodyContents.push(taskRow(t, true)));
    }
    if (dueToday.length > 0) {
      bodyContents.push({ type: 'text', text: `🟡 ถึงกำหนดวันนี้ (${dueToday.length})`, size: 'sm', weight: 'bold', color: '#9A6700', margin: 'md' });
      dueToday.forEach((t) => bodyContents.push(taskRow(t, false)));
    }
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

/** แถวงาน 1 รายการ พร้อมปุ่ม [เสร็จแล้ว] (postback task_done) */
function taskRow(task, isOverdue) {
  const dueText = task.due_date ? `กำหนด ${formatThaiDate(task.due_date)}` : '';
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'sm',
    spacing: 'sm',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        flex: 4,
        contents: [
          { type: 'text', text: `• ${task.task_description}`, size: 'sm', wrap: true, color: '#24292F' },
          { type: 'text', text: dueText, size: 'xxs', color: isOverdue ? '#CF222E' : '#8B949E' }
        ]
      },
      {
        type: 'button',
        flex: 2,
        style: 'primary',
        color: '#1A7F37',
        height: 'sm',
        gravity: 'center',
        action: {
          type: 'postback',
          label: 'เสร็จแล้ว',
          data: `action=task_done&taskId=${task.id}`,
          displayText: `ทำงานเสร็จแล้ว: ${task.task_description}`
        }
      }
    ]
  };
}

function kv(text) {
  return { type: 'text', text, size: 'sm', wrap: true, color: '#57606A' };
}

module.exports = dailyDashboard;
