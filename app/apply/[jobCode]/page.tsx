import type { Metadata } from "next";
import { PublicApplicationForm } from "@/components/public-application-form";

export const metadata: Metadata = {
  title: "Apply | Riverpro Intertrade Co., Ltd.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PublicApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobCode: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ jobCode }, { token }] = await Promise.all([params, searchParams]);

  return <PublicApplicationForm jobCode={jobCode} token={token || ""} />;
}
