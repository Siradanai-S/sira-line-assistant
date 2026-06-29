'use strict';

const { formatThaiDateTime, formatThaiDate } = require('../config/datetime');

const MAX_PER_TYPE = 10;

/**
 * การ์ดรายการนัดหมาย + To-Do ที่ค้างอยู่ พร้อมปุ่ม [ยกเลิก] รายรายการ
 * @param {Array} appointments - [{ id, title, date_time, location }]
 * @param {Array} tasks        - [{ id, task_description, due_date }]
 */
function cancelListCard(appointments, tasks) {
  const appts = appointments.slice(0, MAX_PER_TYPE);
  const todos = tasks.slice(0, MAX_PER_TYPE);
  const body = [];

  // ---- นัดหมาย ----
  body.push({ type: 'text', text: `🗓️ นัดหมาย (${appointments.length})`, weight: 'bold', size: 'md', color: '#24292F' });
  if (appts.length > 0) {
    appts.forEach((a) =>
      body.push(itemRow(`${a.title}`, formatThaiDateTime(a.date_time), `action=appt_cancel&appointmentId=${a.id}`))
    );
    if (appointments.length > appts.length) {
      body.push(note(`…และอีก ${appointments.length - appts.length} นัด`));
    }
  } else {
    body.push(note('— ไม่มีนัดหมาย —'));
  }

  body.push({ type: 'separator', margin: 'lg' });

  // ---- To-Do ----
  body.push({ type: 'text', text: `✅ To-Do (${tasks.length})`, weight: 'bold', size: 'md', color: '#24292F', margin: 'lg' });
  if (todos.length > 0) {
    todos.forEach((t) =>
      body.push(itemRow(t.task_description, t.due_date ? `กำหนด ${formatThaiDate(t.due_date)}` : 'ไม่มีกำหนด', `action=todo_cancel&taskId=${t.id}`))
    );
    if (tasks.length > todos.length) {
      body.push(note(`…และอีก ${tasks.length - todos.length} งาน`));
    }
  } else {
    body.push(note('— ไม่มีงานค้าง —'));
  }

  return {
    type: 'flex',
    altText: 'รายการนัดหมาย / To-Do สำหรับยกเลิก',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#CF222E', paddingAll: '16px',
        contents: [{ type: 'text', text: '🗑️ เลือกรายการที่จะยกเลิก', color: '#FFFFFF', weight: 'bold', size: 'lg' }]
      },
      body: { type: 'box', layout: 'vertical', paddingAll: '16px', contents: body }
    }
  };
}

/** แถว 1 รายการ: ข้อความ + ปุ่มยกเลิก */
function itemRow(title, subtitle, postbackData) {
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
          { type: 'text', text: `• ${title}`, size: 'sm', wrap: true, color: '#24292F' },
          { type: 'text', text: subtitle, size: 'xxs', color: '#8B949E', wrap: true }
        ]
      },
      {
        type: 'button',
        flex: 2,
        style: 'secondary',
        height: 'sm',
        gravity: 'center',
        action: { type: 'postback', label: '🗑️ ยกเลิก', data: postbackData, displayText: 'ขอยกเลิกรายการนี้' }
      }
    ]
  };
}

function note(text) {
  return { type: 'text', text, size: 'sm', wrap: true, color: '#8B949E', margin: 'sm' };
}

module.exports = cancelListCard;
