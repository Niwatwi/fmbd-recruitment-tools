import { createClient } from "@supabase/supabase-js";

// ใส่ URL หลอกตา (Placeholder) ไว้กรณีที่ระบบหามูลค่าจริงไม่เจอตอนบิวด์ หน้าเว็บจะได้ไม่พังครับ
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://placeholder-fmbd.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
