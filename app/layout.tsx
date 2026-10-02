import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Riverpro Recruitment & Workforce",
  description:
    "Talent acquisition, workforce planning, and performance analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-[#0B0F19] print:bg-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
