'use strict';

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { blobClient } = require('../config/lineClient');
const genAI = require('../config/gemini');
const config = require('../config/env');

/** รวบรวม Readable stream ให้เป็น Buffer */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/** ดาวน์โหลด binary ของข้อความ (ไฟล์/เสียง) จาก LINE Content API */
async function downloadContent(messageId) {
  const stream = await blobClient.getMessageContent(messageId);
  return streamToBuffer(stream);
}

/** แยกข้อความดิบจากไฟล์ตามนามสกุล */
async function extractText(buffer, fileName) {
  const lower = (fileName || '').toLowerCase();

  if (lower.endsWith('.pdf')) {
    const result = await pdfParse(buffer);
    return result.text || '';
  }
  if (lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const parts = [];
    wb.SheetNames.forEach((name) => {
      const sheet = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      parts.push(`# ชีต: ${name}\n${csv}`);
    });
    return parts.join('\n\n');
  }

  throw new Error('UNSUPPORTED_FILE_TYPE');
}

/** สรุป + แปลเป็นไทย ด้วย Gemini (Executive Summary ไม่เกิน 10 บรรทัด) */
async function summarizeAndTranslate(rawText, fileName) {
  // ตัดความยาวกันเกิน context (เก็บประมาณ 24,000 ตัวอักษรแรกก็เพียงพอต่อการสรุป)
  const clipped = rawText.slice(0, 24000);

  const systemInstruction = [
    'คุณคือผู้ช่วยผู้บริหารที่เชี่ยวชาญการสรุปเอกสารเชิงธุรกิจ/วิศวกรรม',
    'งานของคุณ: อ่านเนื้อหาเอกสาร แล้วเขียน "บทสรุปผู้บริหาร (Executive Summary)" เป็นภาษาไทย',
    'ข้อกำหนด:',
    '- ถ้าเอกสารเป็นภาษาต่างประเทศ ให้แปลและสรุปเป็นไทย',
    '- ความยาวไม่เกิน 10 บรรทัด',
    '- ใช้ bullet สั้น กระชับ เน้นประเด็นสำคัญ ตัวเลข กำหนดการ และสิ่งที่ต้องตัดสินใจ/ดำเนินการ',
    '- ห้ามแต่งเติมข้อมูลที่ไม่มีในเอกสาร'
  ].join('\n');

  const response = await genAI.models.generateContent({
    model: config.gemini.model,
    contents: `ชื่อไฟล์: ${fileName}\n\nเนื้อหา:\n${clipped}`,
    config: {
      systemInstruction,
      temperature: 0.2
    }
  });

  return (response.text || '').trim() || 'ไม่สามารถสรุปเนื้อหาได้';
}

/**
 * Flow รวม: ดาวน์โหลด -> แยกข้อความ -> สรุป/แปล
 * @returns {String} ข้อความสรุป
 */
async function ingestAndSummarize(messageId, fileName) {
  const buffer = await downloadContent(messageId);
  const rawText = await extractText(buffer, fileName);
  if (!rawText || rawText.trim().length < 5) {
    return 'ไม่พบข้อความที่อ่านได้ในเอกสารนี้ (อาจเป็นไฟล์สแกนรูปภาพ)';
  }
  return summarizeAndTranslate(rawText, fileName);
}

module.exports = {
  downloadContent,
  extractText,
  summarizeAndTranslate,
  ingestAndSummarize,
  streamToBuffer
};
