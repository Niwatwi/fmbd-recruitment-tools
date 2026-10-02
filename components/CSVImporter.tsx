"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatus({ type: null, message: "" });

    try {
      let csvRows: Record<string, any>[];
      if (/\.xlsx?$/i.test(file.name)) {
        const workbook = XLSX.read(await file.arrayBuffer(), {
          cellDates: true,
        });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        csvRows = firstSheet
          ? XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false })
          : [];
      } else {
        const results = await new Promise<
          Papa.ParseResult<Record<string, any>>
        >((resolve, reject) => {
          Papa.parse<Record<string, any>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject,
          });
        });
        csvRows = results.data;
      }

      const formattedData = csvRows
        .map((row) => {
          const rawDate =
            row["Date Stamp"] ||
            row["date_stamp"] ||
            row["Update"] ||
            row["update"] ||
            "";
          const formattedDate = String(rawDate).replace(/\//g, "-").trim();
          const empId = String(
            row["Employee ID"] || row["employee_id"] || "",
          ).trim();
          const originalCon = row["Con"] || row["con"];
          const finalCon = originalCon
            ? String(originalCon).replace(/\//g, "-").trim()
            : `${formattedDate}|${empId}`;
          const employeeRole = row["Role"] || row["role"] || "";

          return {
            date_stamp: formattedDate || null,
            day_num: parseInt(row["Date"] || row["day_num"]) || null,
            month_num: parseInt(row["Month"] || row["month_num"]) || null,
            year_num: parseInt(row["Year"] || row["year_num"]) || null,
            employee_type:
              row["Employee Type"] ||
              row["employee_type"] ||
              employeeRole ||
              null,
            area: row["Area"] || row["area"] || null,
            area_code: row["Area Code"] || row["area_code"] || null,
            role: employeeRole || null,
            employee_id: empId || null,
            fullname:
              row["Full Name"] ||
              row["Fullname"] ||
              row["Fullname "] ||
              row["fullname"] ||
              null,
            email: row["Email"] || row["email"] || null,
            version: row["Version"] || row["version"] || null,
            status_app: row["สถานะ"] || row["status_app"] || null,
            con: finalCon,
            status_report: row["Status"] || row["status_report"] || null,
            remark: row["Remark"] || row["remark"] || null,
          };
        })
        .filter((item) => item.employee_id && item.con);

      const uniqueRowsByCon = new Map<string, (typeof formattedData)[number]>();
      formattedData.forEach((item) => {
        uniqueRowsByCon.set(String(item.con), item);
      });
      const rowsToUpsert = Array.from(uniqueRowsByCon.values());
      const duplicateCount = formattedData.length - rowsToUpsert.length;

      if (rowsToUpsert.length === 0) {
        setStatus({
          type: "error",
          message: "ไม่พบข้อมูลพนักงาน กรุณาตรวจสอบคอลัมน์ Employee ID ในไฟล์",
        });
        return;
      }

      const { error } = await supabase
        .from("data_app")
        .upsert(rowsToUpsert, { onConflict: "con" });

      if (error) throw error;

      setStatus({
        type: "success",
        message: `นำเข้าข้อมูลสำเร็จ ${rowsToUpsert.length} รายการ${
          duplicateCount > 0
            ? ` (ข้ามแถวที่มีคีย์ซ้ำ ${duplicateCount} แถว)`
            : ""
        }`,
      });
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: "error",
        message: err.message || "เกิดข้อผิดพลาดในการอ่านไฟล์หรือบันทึกข้อมูล",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="border border-[#1E293B] bg-[#111726] rounded-xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">
            นำเข้าข้อมูลจากไฟล์ Excel หรือ CSV
          </h3>
          <p className="text-xs text-slate-400">
            รองรับ Template ข้อมูลพนักงานและไฟล์สรุป Daily Report
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-lg p-8 sm:p-10 text-center hover:bg-emerald-500/3 transition-colors relative group cursor-pointer">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-sm font-medium text-slate-300">
                กำลังตรวจสอบและนำเข้าข้อมูล...
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              <p className="text-sm font-medium text-slate-300">
                คลิกเพื่อเลือกไฟล์ Excel หรือ CSV
              </p>
              <p className="text-xs text-slate-500">
                รองรับไฟล์ .xlsx, .xls และ .csv
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
