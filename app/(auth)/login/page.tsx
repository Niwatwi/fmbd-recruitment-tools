"use client";

import React, { useState } from "react";
// ✅ แก้ไขเป็นแบบนี้ครับพี่:
import { supabase } from "../../../lib/supabase"; // เรียกใช้ผ่าน Path ที่ไม่มี src
import { Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";

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

    // ⚡ 1. ล้างช่องว่าง และแปลงเป็นตัวพิมพ์เล็กทั้งหมดก่อนส่งไปตรวจสอบสิทธิ์ครับพี่ยอด
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail, // 👈 2. เปลี่ยนมาใช้ cleanEmail ตัวที่แปลงแล้วแทนครับ
        password,
      });

      if (error) throw error;

      // ล็อกอินผ่านสำเร็จ ส่งตัวพนักงานเข้าหน้าหลัก Dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090D16] px-4 relative overflow-hidden">
      {/* ✅ ปรับแก้เป็นแบบนี้เพื่อสยบคำเตือนครับพี่ */}
      <div className="absolute top-[-20%] left-[-10%] w-125 h-125 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-125 h-125 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-sm font-semibold tracking-wider text-emerald-400 uppercase">
            Riverpro Intertrade Co., Ltd.
          </h2>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Manpower Analytics
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            ระบบควบคุมและวิเคราะห์อัตรากำลังพลฝ่ายปฏิบัติการ (FMBD)
          </p>
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
    </div>
  );
}
