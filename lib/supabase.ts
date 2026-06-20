import { createClient } from "@supabase/supabase-js"; // บรรทัดนี้หายไปครับพี่ ตัวปัญหาเลย

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// สร้าง Client เชื่อมต่อเข้า public schema ตัวมาตรฐาน
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
