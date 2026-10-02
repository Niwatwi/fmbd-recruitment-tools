import type { Metadata } from "next";
import { ATSWorkspace } from "@/components/ats-workspace";

export const metadata: Metadata = {
  title: "Talent Pipeline | Riverpro Recruitment",
  description: "Manage job requisitions, candidates, interviews, and offers",
};

export default function RecruitmentPage() {
  return <ATSWorkspace />;
}
