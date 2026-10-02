"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
} from "lucide-react";
import { RiverproFooter, RiverproLogo } from "@/components/riverpro-footer";

const navigation = [
  {
    href: "/recruitment",
    label: "Talent pipeline",
    mobileLabel: "ATS",
    icon: BriefcaseBusiness,
  },
  {
    href: "/dashboard",
    label: "Workforce overview",
    mobileLabel: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/kpi",
    label: "Performance & KPI",
    mobileLabel: "KPI",
    icon: Gauge,
  },
  {
    href: "/upload",
    label: "Data import",
    mobileLabel: "Import",
    icon: FileSpreadsheet,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/apply/")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 md:flex md:h-screen md:overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#1E293B] bg-[#111726] md:flex print:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 border-b border-[#1E293B] px-6 py-5"
        >
          <RiverproLogo />
        </Link>

        <nav aria-label="Main navigation" className="space-y-1 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "border border-emerald-500/20 bg-emerald-500/10 font-semibold text-emerald-300"
                    : "text-slate-400 hover:bg-white/4 hover:text-white"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#1E293B] px-6 py-4 text-xs text-slate-500">
          Recruitment & workforce operations
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:min-h-0">
        <header className="sticky top-0 z-40 border-b border-[#1E293B] bg-[#111726] md:hidden print:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3">
            <RiverproLogo compact />
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex border-t border-[#1E293B] px-1"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-2.5 text-xs ${
                    isActive
                      ? "border-emerald-400 font-semibold text-emerald-300"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  <Icon size={15} />
                  {item.mobileLabel}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto print:overflow-visible print:w-full print:h-auto">
          {children}
        </main>
        <RiverproFooter />
      </div>
    </div>
  );
}
