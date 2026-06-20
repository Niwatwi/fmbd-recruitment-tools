"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { supabase } from "../lib/supabase";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function CSVImporter() {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatus({ type: null, message: "" });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const csvRows = results.data as any[];

        // 🛠️ จับคู่คอลลัมน์และลบ id ออก ปล่อยให้ Database สร้างให้อัตโนมัติ
        const formattedData = csvRows
          .map((row) => {
            const rawDate = row["Date Stamp"] || row["date_stamp"] || "";
            // แปลงฟอร์แมตวันที่ในคอลลัมน์จากเครื่องหมาย / ให้เป็น - (เช่น 01/05/2026 -> 01-05-2026)
            const formattedDate = rawDate.replace(/\//g, "-").trim();
            const empId = (row["Employee ID"] || row["employee_id"] || "")
              .toString()
              .trim();

            // ⚡ ลอจิกพิเศษ: ตรวจสอบและสร้างค่า Con ให้เป็นรูปแบบเดียวกันทั้งหมดป้องกันการระเบิดซ้ำ
            const originalCon = row["Con"] || row["con"];
            const finalCon =
              originalCon && originalCon.trim() !== ""
                ? originalCon.replace(/\//g, "-").trim() // ตบฟอร์แมต / เป็น -
                : `${formattedDate}|${empId}`;

            return {
              // ❌ ไม่ส่ง id ไปเด็ดขาด เพื่อให้สอดคล้องกับโครงสร้างฐานข้อมูลแบบ Auto-increment
              date_stamp: formattedDate || null,
              day_num: parseInt(row["Date"] || row["day_num"]) || null,
              month_num: parseInt(row["Month"] || row["month_num"]) || null,
              year_num: parseInt(row["Year"] || row["year_num"]) || null,
              employee_type:
                row["Employee Type"] || row["employee_type"] || null,
              area: row["Area"] || row["area"] || null,
              area_code: row["Area Code"] || row["area_code"] || null,
              role: row["Role"] || row["role"] || null,
              employee_id: empId || null,
              fullname: row["Full Name"] || row["fullname"] || null,
              email: row["Email"] || row["email"] || null,
              version: row["Version"] || row["version"] || null,
              status_app: row["สถานะ"] || row["status_app"] || null,
              con: finalCon, // ใช้คีย์ con นี้ทำหน้าที่ตรวจสอบสิทธิ์ขัดแย้ง Upsert
              status_report: row["Status"] || row["status_report"] || null,
              remark: row["Remark"] || row["remark"] || null,
            };
          })
          // กรองเอาเฉพาะแถวที่มีตัวตนพนักงานและมีคีย์ con สมบูรณ์
          .filter((item) => item.employee_id && item.con);

        if (formattedData.length === 0) {
          setStatus({
            type: "error",
            message:
              "พี่ยอดครับ ไม่พบข้อมูลพนักงานที่ถูกต้องในไฟล์ CSV กรุณาตรวจสอบรหัสพนักงานหรือฟิลด์วันที่ครับ",
          });
          setIsUploading(false);
          return;
        }

        try {
          // 🚀 ส่งคำสั่ง Upsert เข้าคลังข้อมูล fmbd_controller.data_app หลัก
          const { error } = await supabase
            .from("data_app")
            .upsert(formattedData, { onConflict: "con" });

          if (error) throw error;

          setStatus({
            type: "success",
            message: `อัปเดตฐานข้อมูลสำเร็จ! ซิงค์ข้อมูลกำลังพลเข้าคลังอัตโนมัติจำนวน ${formattedData.length} รายการ เรียบร้อยแล้วครับพี่`,
          });
        } catch (err: any) {
          console.error(err);
          setStatus({
            type: "error",
            message:
              err.message ||
              "เกิดข้อผิดพลาดในการเชื่อมต่อหรือส่งข้อมูลไปยัง Supabase",
          });
        } finally {
          setIsUploading(false);
          if (event.target) event.target.value = ""; // ล้างค่าหน้าอินพุตไฟล์
        }
      },
    });
  };

  return (
    <div className="p-6 border border-slate-800 bg-[#121826] rounded-2xl shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">
            อัปเดตข้อมูลด้วยไฟล์ CSV (ระบบสร้าง ID อัตโนมัติ)
          </h3>
          <p className="text-xs text-slate-400">
            อัปโหลดไฟล์สรุป Daily Report ลงฐานข้อมูลกลางสคีมา
            fmbd_controller.data_app บันทึกต่อท้ายแบบปลอดภัย
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed border-slate-700/60 hover:border-blue-500/50 rounded-xl p-6 text-center hover:bg-slate-800/20 transition-all relative group cursor-pointer">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm font-medium text-slate-300">
                ระบบกำลังประมวลผลและยิงคำสั่ง Upsert ลงฐานข้อมูล...
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-slate-500 group-hover:text-blue-400 transition-colors" />
              <p className="text-sm font-medium text-slate-300">
                คลิกหรือลากไฟล์ CSV มาวางที่นี่
              </p>
              <p className="text-xs text-slate-500">
                ระบบเปิดใช้ Identity Column
                รันลำดับออโต้หลังบ้านเรียบร้อยแล้วครับพี่
              </p>
            </>
          )}
        </div>
      </div>

      {/* กล่องสถานะแจ้งเตือนเมื่อระบบบันทึกงานเสร็จ */}
      {status.type && (
        <div
          className={`mt-4 p-3 rounded-xl border text-sm flex items-start gap-2.5 ${
            status.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
