"use client";
import { CSVImporter } from "@/components/CSVImporter"; // เรียกตัวเก่งของพี่มาใช้
import { FileSpreadsheet } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-200">
      <div className="bg-[#111726] p-8 rounded-2xl border border-[#1E293B] shadow-2xl">
        <h1 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-400" />
          ระบบจัดการไฟล์ข้อมูลกลาง (FMBD Ingestion)
        </h1>
        <p className="text-slate-400 mb-8">
          อัปโหลดไฟล์สรุป Daily Report
          จากหน้างานเพื่อซิงค์ข้อมูลลงระบบวิเคราะห์ข้อมูลหลักอัตโนมัติ
        </p>

        {/* เรียกตัวเก่งที่ซิงค์คอลัมน์ Con และทำ Upsert มารันตรงนี้ครับ */}
        <CSVImporter />
      </div>
    </div>
  );
}
