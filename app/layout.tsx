import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Riverpro Manpower War Room",
  description: "Employee data dashboard and KPI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-[#0B0F19] flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#111726] border-r border-[#1E293B]">
          <div className="p-6">
            <h2 className="text-white font-bold text-lg mb-6">War Room</h2>
            <nav className="space-y-3">
              <Link
                href="/dashboard"
                className="block p-3 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-all"
              >
                📊 Dashboard กำลังพล
              </Link>
              <Link
                href="/kpi"
                className="block p-3 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-all"
              >
                🎯 KPI Management
              </Link>
              {/* ⚡ เพิ่มเมนูนี้เข้าไปเพื่อให้สลับหน้าไปอัปโหลด CSV ได้ใน 1 คลิกครับพี่ */}
              <Link
                href="/upload"
                className="block p-3 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-all border-t border-slate-800/50 mt-4 pt-4"
              >
                📥 นำเข้าข้อมูล CSV
              </Link>
            </nav>
          </div>
        </aside>

        {/* ⚡ หัวใจสำคัญ: ตรงนี้คือที่ที่หน้า Dashboard หรือ KPI ของพี่ยอดจะเข้ามาแสดงผลครับ */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
