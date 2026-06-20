"use client";

import React from "react";
import { Loader2 } from "lucide-react";

// ⚡ ต้องมีคำว่า export default นำหน้าฟังก์ชันเสมอครับพี่ Next.js ถึงจะยอมรับ
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="h-9 w-9 text-blue-500 animate-spin" />
      <p className="text-sm font-semibold tracking-wide animate-pulse">
        กำลังประมวลผลแผงวิเคราะห์ข้อมูล Man Power...
      </p>
    </div>
  );
}
