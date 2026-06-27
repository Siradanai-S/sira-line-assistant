'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

/**
 * Supabase client (ใช้ service_role key ฝั่ง server)
 * ปิด session persistence เพราะเป็น backend ไม่มี browser
 */
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;
