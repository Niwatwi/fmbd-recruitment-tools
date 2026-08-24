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
      <body className="bg-[#0B0F19] flex h-screen overflow-hidden print:h-auto print:overflow-visible print:bg-white">
        {/* Sidebar - เพิ่ม print:hidden เพื่อซ่อนแถบข้างตอนสั่งพิมพ์ */}
        <aside className="w-64 bg-[#111726] border-r border-[#1E293B] print:hidden">
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
              <Link
                href="/upload"
                className="block p-3 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-all border-t border-slate-800/50 mt-4 pt-4"
              >
                📥 นำเข้าข้อมูล CSV
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main Content - ปรับขยายเต็มหน้ากระดาษและปลดล็อก scroll ตอนพิมพ์ */}
        <main className="flex-1 overflow-y-auto print:overflow-visible print:w-full print:h-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
