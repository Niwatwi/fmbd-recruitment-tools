"use client";

import React, { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { RiverproFooter, RiverproLogo } from "@/components/riverpro-footer";
import { verifyRecruitmentProfileAction } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        throw new Error("ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase");
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (authError) {
        const message = authError.message.toLowerCase();
        if (message.includes("invalid login credentials")) {
          throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
        }
        if (message.includes("email not confirmed")) {
          throw new Error("กรุณายืนยันอีเมลในกล่องจดหมายก่อนเข้าสู่ระบบ");
        }
        if (message.includes("network") || message.includes("fetch")) {
          throw new Error("ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้ กรุณาลองใหม่");
        }
        throw authError;
      }

      const accessToken = authData.session?.access_token;
      if (!accessToken) {
        await supabase.auth.signOut();
        throw new Error("ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาลองใหม่");
      }
      const verification = await verifyRecruitmentProfileAction(accessToken);
      if (!verification.success) {
        await supabase.auth.signOut();
        throw new Error(verification.message);
      }

      window.location.href = "/dashboard";
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "อีเมลหรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#090D16] px-4">
      <div className="absolute top-[-20%] left-[-10%] w-125 h-125 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-125 h-125 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <main className="relative z-10 flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <RiverproLogo />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Recruitment &amp; Workforce
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                ระบบสรรหาและบริหารกำลังคน Riverpro
              </p>
            </div>
          </div>

          <div className="bg-[#121826] border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  อีเมลผู้ใช้งาน (Email Address)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@riverpro.co.th"
                    className="block w-full pl-10 pr-3 py-2.5 bg-[#1A2234] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  รหัสผ่าน (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 bg-[#1A2234] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs text-center">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    กำลังตรวจสอบสิทธิ์...
                  </>
                ) : (
                  "เข้าสู่ระบบปฏิบัติการ"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
      <RiverproFooter />
    </div>
  );
}
