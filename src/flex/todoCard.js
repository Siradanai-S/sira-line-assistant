'use strict';

const { formatThaiDate } = require('../config/datetime');

/**
 * การ์ดยืนยันบันทึก To-Do สำเร็จ
 * @param {Object} task - { task_description, due_date }
 * @param {Boolean} savedToCalendar - ลง Google Calendar (all-day) สำเร็จหรือไม่
 */
function todoCard(task, savedToCalendar) {
  const hasDue = Boolean(task.due_date);
  return {
    type: 'flex',
    altText: `บันทึก To-Do: ${task.task_description}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6F42C1',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: '📋 บันทึกงาน (To-Do) สำเร็จ', color: '#FFFFFF', weight: 'bold', size: 'lg' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          row('งาน', task.task_description),
          row('กำหนดส่ง', hasDue ? formatThaiDate(task.due_date) : 'ไม่ระบุ'),
          row('สถานะ', 'รอดำเนินการ (Pending)'),
          { type: 'separator', margin: 'md' },
          {
            type: 'text',
            margin: 'md',
            wrap: true,
            size: 'sm',
            color: savedToCalendar ? '#1A7F37' : '#9A6700',
            text: savedToCalendar
              ? '✅ เพิ่มลง Google Calendar (ทั้งวัน) แล้ว'
              : (hasDue
                ? 'ℹ️ ยังไม่ได้เชื่อม Google Calendar (บันทึกในระบบเรียบร้อย)'
                : 'ℹ️ บันทึกในระบบเรียบร้อย')
          },
          {
            type: 'text',
            margin: 'sm',
            wrap: true,
            size: 'xs',
            color: '#8B949E',
            text: hasDue
              ? 'ระบบจะแจ้งเตือนงานนี้ในสรุปประจำวันเมื่อถึง/เลยกำหนดส่ง'
              : 'งานนี้ไม่มีกำหนดส่ง จะแสดงในรายการงานค้างทั่วไป'
          }
        ]
      }
    }
  };
}

function row(label, value) {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, color: '#8B949E', size: 'sm', flex: 2 },
      { type: 'text', text: String(value), wrap: true, color: '#24292F', size: 'sm', flex: 5 }
    ]
  };
}

module.exports = todoCard;
