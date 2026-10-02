import Image from "next/image";
import Link from "next/link";

export function RiverproLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <Image
        src="/logo.png"
        alt="River Group"
        width={compact ? 28 : 36}
        height={compact ? 36 : 46}
        className="shrink-0 rounded bg-white object-contain"
        style={{
          width: compact ? 28 : 36,
          height: compact ? 36 : 46,
        }}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-white">
          Riverpro Intertrade Co., Ltd.
        </span>
        {!compact && (
          <span className="mt-0.5 block text-xs text-slate-500">
            Recruitment Operations & Workforce Analytics
          </span>
        )}
      </span>
    </span>
  );
}

export function RiverproFooter() {
  return (
    <footer className="border-t border-[#1E293B] bg-[#0B0F19] px-5 py-5 text-slate-400 print:hidden sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="River Group"
            width={26}
            height={34}
            className="shrink-0 rounded bg-white object-contain"
            style={{ width: 26, height: 34 }}
          />
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Riverpro Intertrade Co., Ltd.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Recruitment Operations & Workforce Analytics
            </p>
          </div>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-5 gap-y-2 text-xs"
        >
          <Link
            className="transition-colors hover:text-white"
            href="/recruitment"
          >
            Talent pipeline
          </Link>
          <Link
            className="transition-colors hover:text-white"
            href="/dashboard"
          >
            Workforce
          </Link>
          <Link className="transition-colors hover:text-white" href="/kpi">
            Performance
          </Link>
          <Link className="transition-colors hover:text-white" href="/upload">
            Data import
          </Link>
        </nav>
        <span className="text-[11px] text-slate-600">
          © {new Date().getFullYear()} Riverpro Intertrade Co., Ltd.
        </span>
      </div>
    </footer>
  );
}
