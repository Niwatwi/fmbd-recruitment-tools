"use server";

import { createClient } from "@supabase/supabase-js";

export async function verifyRecruitmentProfileAction(accessToken: string) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey)
      throw new Error("ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase");
    if (
      typeof accessToken !== "string" ||
      !accessToken ||
      accessToken.length > 8192
    )
      throw new Error("กรุณาเข้าสู่ระบบใหม่");

    const authClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(accessToken);
    if (authError || !user?.email || !user.email_confirmed_at)
      throw new Error("กรุณายืนยันอีเมลหรือเข้าสู่ระบบใหม่");

    const database = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const normalizedEmail = user.email.trim().toLowerCase();

    const { data: profile, error: profileError } = await database
      .from("user_profiles")
      .select("is_active")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!profileError && profile) {
      if (profile.is_active !== true)
        throw new Error("บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
      return { success: true as const };
    }

    // Backward compatibility: deployments that use ATS roles do not need a
    // separate user_profiles row. The service-role check remains server-only.
    const missingProfileTable =
      profileError?.code === "42P01" || profileError?.code === "PGRST205";
    const missingActiveColumn =
      profileError?.code === "42703" || profileError?.code === "PGRST204";
    if (profileError && !missingProfileTable && !missingActiveColumn) {
      console.error("Recruitment profile lookup failed", {
        code: profileError.code,
        message: profileError.message,
      });
      throw new Error("ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้งานได้ กรุณาลองใหม่");
    }

    const { data: role, error: roleError } = await database
      .from("ats_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      console.error("Recruitment role lookup failed", {
        code: roleError.code,
        message: roleError.message,
      });
      throw new Error("ยังไม่ได้กำหนดสิทธิ์ผู้ใช้งานในระบบ");
    }
    if (role?.role !== "admin" && role?.role !== "recruiter")
      throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งานระบบ Recruitment");

    return { success: true as const };
  } catch (error: unknown) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "ตรวจสอบบัญชีไม่สำเร็จ",
    };
  }
}
