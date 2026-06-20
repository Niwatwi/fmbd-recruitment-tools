"use client";

import React, { useState } from "react";
import { Users, AlertCircle, Download } from "lucide-react";

// ⚡ 1. กำหนดรูปแบบพรอพพอร์ตี้เพื่อรับข้อมูลดิบมาจากหน้าหลัก (Parent Component)
interface ManpowerTableProps {
  rawData: any[];
}

export default function ManpowerTableDashboard({
  rawData,
}: ManpowerTableProps) {
  const [filterTime, setFilterTime] = useState<"today" | "yesterday">("today");

  // ⚡ 2. ลอจิกคำนวณและจัดกลุ่มแจกแจงตามสายงานอ้างอิงจากฟิลด์ employee_type จริงในคลังข้อมูล
  const getBrandStats = (empType: string, categoryName: string) => {
    const brandRows = rawData.filter((item) => item.employee_type === empType);
    const target = brandRows.length;
    const actual = brandRows.filter(
      (item) => item.status_app === "ปกติ",
    ).length;
    const online = actual;
    const offline = target - actual;
    const achievementRate = target > 0 ? (actual / target) * 100 : 0;

    return {
      category: categoryName,
      target,
      actual,
      online,
      offline,
      achievementRate,
    };
  };

  // ประกอบชิ้นส่วนอาร์เรย์สรุปยอดเรียงรายสายงานหลัก
  const summaryData = [
    getBrandStats("MER", "พนักงานขายภาคสนาม (MER - Riverpro)"),
    getBrandStats("COM", "เจ้าหน้าที่กิจกรรมพิเศษ (COM)"),
    getBrandStats("BA", "ทีมแบรนด์แอมบาสเดอร์ (BA)"),
    getBrandStats("KOE", "ทีมสนับสนุนระบบเทคโนโลยี (KOE)"),
  ];

  // คำนวณผลรวมแถวท้ายตารางจากข้อมูลจริง (Total Row)
  const totalTarget = summaryData.reduce((sum, item) => sum + item.target, 0);
  const totalActual = summaryData.reduce((sum, item) => sum + item.actual, 0);
  const totalOnline = summaryData.reduce((sum, item) => sum + item.online, 0);
  const totalOffline = summaryData.reduce((sum, item) => sum + item.offline, 0);
  const averageRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* 1. ส่วนหัวของแผงจัดการ (Table Header Control) */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">
              ตารางวิเคราะห์กำลังพล (Man Power Attendance Summary)
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider pl-8">
            เปรียบเทียบอัตราส่วนเป้าหมาย (Target) และการเข้างานจริง (Actual)
            ประจำวัน
          </p>
        </div>

        {/* ปุ่มควบคุมฝั่งขวา */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-bold">
          <div className="bg-slate-200/60 p-0.5 rounded-xl flex items-center">
            <button
              onClick={() => setFilterTime("today")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterTime === "today" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              วันนี้
            </button>
            <button
              onClick={() => setFilterTime("yesterday")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterTime === "yesterday" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              เมื่อวาน
            </button>
          </div>

          <button className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl text-slate-700 shadow-sm transition-all cursor-pointer active:scale-95">
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออกรายงาน</span>
          </button>
        </div>
      </div>

      {/* 2. ตารางแสดงผลสรุปตัวเลข (Responsive Table) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th className="px-6 py-4">กลุ่มงาน / สังกัดค่าย</th>
              <th className="px-6 py-4 text-center">เป้าหมาย (Target)</th>
              <th className="px-6 py-4 text-center">เข้างานจริง (Actual)</th>
              <th className="px-6 py-4 text-center text-emerald-600">
                Online ตอนนี้
              </th>
              <th className="px-6 py-4 text-center text-rose-500">Offline</th>
              <th className="px-6 py-4 text-center">% อัตราการเข้างาน</th>
            </tr>
          </thead>
          <tbody className="text-xs font-bold text-slate-600 divide-y divide-slate-100">
            {summaryData.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-slate-50/80 transition-colors"
              >
                {/* กลุ่มงาน */}
                <td className="px-6 py-4 text-slate-900 font-black">
                  {item.category}
                </td>

                {/* Target */}
                <td className="px-6 py-4 text-center text-slate-500 font-mono text-sm">
                  {item.target} คน
                </td>

                {/* Actual */}
                <td className="px-6 py-4 text-center text-slate-800 font-mono text-sm bg-slate-50/40">
                  {item.actual} คน
                </td>

                {/* Online */}
                <td className="px-6 py-4 text-center font-mono text-sm text-emerald-600">
                  <span className="inline-flex items-center gap-1.5">
                    {item.online > 0 && (
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    )}
                    {item.online}
                  </span>
                </td>

                {/* Offline */}
                <td className="px-6 py-4 text-center font-mono text-sm text-rose-500">
                  {item.offline}
                </td>

                {/* % Rate Progress */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden hidden md:block">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.achievementRate >= 90
                            ? "bg-emerald-500"
                            : item.achievementRate >= 80
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.min(item.achievementRate, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span
                      className={`font-mono text-xs ${item.achievementRate >= 90 ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {item.achievementRate.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}

            {/* แถวสรุปผลรวมท้ายตาราง (Total Footer Row) */}
            <tr className="bg-slate-900 text-white font-black">
              <td className="px-6 py-4 rounded-bl-xl text-xs uppercase tracking-wider">
                📊 สรุปยอดรวมทุกลำดับงานประจำวัน
              </td>
              <td className="px-6 py-4 text-center font-mono text-sm text-slate-300">
                {totalTarget} คน
              </td>
              <td className="px-6 py-4 text-center font-mono text-sm bg-slate-800">
                {totalActual} คน
              </td>
              <td className="px-6 py-4 text-center font-mono text-sm text-emerald-400">
                {totalOnline}
              </td>
              <td className="px-6 py-4 text-center font-mono text-sm text-rose-400">
                {totalOffline}
              </td>
              <td className="px-6 py-4 text-center font-mono text-sm text-amber-400 rounded-br-xl">
                {averageRate.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. คำแนะนำด้านล่าง (Footer Insight) */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>
            ระบบวิเคราะห์สถาปัตยกรรมคลังข้อมูลส่วนกลาง Next.js + Supabase
            Real-time บันทึกตามเกณฑ์ Con Key
          </span>
        </div>
        <span className="hidden sm:inline">ระบบประมวลผลข้อมูลสดใหม่</span>
      </div>
    </div>
  );
}
