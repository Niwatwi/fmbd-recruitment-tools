"use client";
import { CSVImporter } from "@/components/CSVImporter";
import { FileSpreadsheet } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-slate-200 sm:p-8">
      <header className="flex items-start gap-4">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Data management
          </p>
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            นำเข้าข้อมูลพนักงาน
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            นำเข้าข้อมูลจาก Template Excel หรือ Daily Report CSV
            เพื่ออัปเดตคลังข้อมูลกลาง
          </p>
        </div>
      </header>

      <section aria-label="นำเข้าไฟล์ข้อมูล">
        <CSVImporter />
      </section>
    </div>
  );
}
