"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, Send } from "lucide-react";
import { RiverproLogo } from "@/components/riverpro-footer";
import { supabase } from "@/lib/supabase";

type PublicJob = {
  job_code: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  close_date: string | null;
};

type ApplicationState =
  | { type: "idle" | "loading" }
  | { type: "error"; message: string }
  | { type: "success"; code: string };

const inputClass =
  "mt-1.5 w-full rounded-lg border border-[#2A3548] bg-[#101926] px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

export function PublicApplicationForm({
  jobCode,
  token,
}: {
  jobCode: string;
  token: string;
}) {
  const [job, setJob] = useState<PublicJob | null>(null);
  const [state, setState] = useState<ApplicationState>({ type: "loading" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const loadJob = async () => {
      if (!token || token.length < 48) {
        setState({
          type: "error",
          message: "ลิงก์สมัครงานไม่ถูกต้องหรือหมดอายุ กรุณาติดต่อผู้สรรหา",
        });
        return;
      }

      const { data, error } = await supabase.rpc("ats_get_public_job", {
        p_job_code: jobCode,
        p_token: token,
      });
      const publicJob = Array.isArray(data) ? data[0] : null;

      if (!isCurrent) return;
      if (error || !publicJob) {
        setState({
          type: "error",
          message: error?.message?.includes("function")
            ? "ระบบสมัครงานยังไม่พร้อมใช้งาน กรุณาติดต่อผู้สรรหา"
            : "ตำแหน่งนี้ปิดรับสมัครแล้ว หรือลิงก์สมัครงานไม่ถูกต้อง",
        });
        return;
      }

      setJob(publicJob as PublicJob);
      setState({ type: "idle" });
    };

    void loadJob();
    return () => {
      isCurrent = false;
    };
  }, [jobCode, token]);

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!job || !privacyConsent) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setIsSubmitting(true);
    setState({ type: "idle" });

    try {
      const { data, error } = await supabase.rpc(
        "ats_submit_public_application",
        {
          p_job_code: job.job_code,
          p_token: token,
          p_full_name: String(form.get("full_name") || "").trim(),
          p_email: String(form.get("email") || "")
            .trim()
            .toLowerCase(),
          p_phone: String(form.get("phone") || "").trim(),
          p_location: String(form.get("location") || "").trim(),
          p_linkedin_url: String(form.get("linkedin_url") || "").trim(),
          p_resume_url: String(form.get("resume_url") || "").trim(),
          p_privacy_consent: privacyConsent,
          p_website: String(form.get("website") || ""),
        },
      );

      if (error) throw error;
      setState({ type: "success", code: data?.application_code || "" });
      formElement.reset();
      setPrivacyConsent(false);
    } catch (error: any) {
      const message = error.message || "ส่งใบสมัครไม่สำเร็จ กรุณาลองอีกครั้ง";
      setState({
        type: "error",
        message: message.includes("already exists")
          ? "เราได้รับใบสมัครของคุณสำหรับตำแหน่งนี้แล้ว"
          : message.includes("invalid or expired")
            ? "ตำแหน่งนี้ปิดรับสมัครแล้ว หรือลิงก์สมัครงานไม่ถูกต้อง"
            : message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F19] text-slate-200">
      <header className="border-b border-[#1E293B] bg-[#111726] px-5 py-4 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <RiverproLogo />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-3xl">
          {state.type === "loading" ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-slate-400">
              <LoaderCircle className="mr-2 animate-spin" size={18} />{" "}
              กำลังโหลดรายละเอียดตำแหน่ง...
            </div>
          ) : state.type === "error" && !job ? (
            <div className="mx-auto max-w-xl rounded-xl border border-rose-500/20 bg-[#111926] p-6 text-center sm:p-9">
              <CircleAlert className="mx-auto mb-3 text-rose-300" size={24} />
              <h1 className="text-xl font-semibold text-white">
                ไม่สามารถเปิดใบสมัครได้
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {state.message}
              </p>
            </div>
          ) : state.type === "success" ? (
            <div className="mx-auto max-w-xl rounded-xl border border-emerald-500/20 bg-[#111926] p-6 text-center sm:p-9">
              <CheckCircle2
                className="mx-auto mb-4 text-emerald-300"
                size={30}
              />
              <p className="text-xs font-semibold uppercase text-emerald-300">
                Application received
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">
                ขอบคุณที่สมัครงานกับ Riverpro
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                ทีมสรรหาจะตรวจสอบใบสมัครและติดต่อกลับทางอีเมลหากมีขั้นตอนถัดไป
              </p>
              {state.code && (
                <p className="mt-5 font-mono text-xs text-slate-500">
                  Reference: {state.code}
                </p>
              )}
            </div>
          ) : job ? (
            <div className="overflow-hidden rounded-xl border border-[#253044] bg-[#111926]">
              <div className="border-b border-[#253044] bg-[#101A28] px-5 py-6 sm:px-8">
                <p className="text-xs font-semibold uppercase text-emerald-300">
                  Careers · {job.job_code}
                </p>
                <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  {job.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                  {job.department && <span>{job.department}</span>}
                  {job.location && <span>{job.location}</span>}
                  {job.employment_type && <span>{job.employment_type}</span>}
                  {job.close_date && (
                    <span>
                      Apply by{" "}
                      {new Date(
                        `${job.close_date}T00:00:00`,
                      ).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>
              </div>

              <form
                className="space-y-5 p-5 sm:p-8"
                onSubmit={(event) => void submitApplication(event)}
              >
                {state.type === "error" && (
                  <div
                    className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200"
                    role="alert"
                  >
                    <CircleAlert className="mt-0.5 shrink-0" size={16} />{" "}
                    {state.message}
                  </div>
                )}

                <section className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Your details
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Fields marked with * are required.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-slate-300 sm:col-span-2">
                      Full name <span className="text-rose-300">*</span>
                      <input
                        autoComplete="name"
                        className={inputClass}
                        maxLength={160}
                        name="full_name"
                        required
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      Email <span className="text-rose-300">*</span>
                      <input
                        autoComplete="email"
                        className={inputClass}
                        maxLength={254}
                        name="email"
                        required
                        type="email"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      Phone
                      <input
                        autoComplete="tel"
                        className={inputClass}
                        maxLength={40}
                        name="phone"
                        type="tel"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      City / location
                      <input
                        autoComplete="address-level2"
                        className={inputClass}
                        maxLength={120}
                        name="location"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      LinkedIn profile
                      <input
                        className={inputClass}
                        maxLength={500}
                        name="linkedin_url"
                        placeholder="https://www.linkedin.com/in/..."
                        type="url"
                      />
                    </label>
                    <label className="text-sm text-slate-300 sm:col-span-2">
                      Resume / portfolio link
                      <input
                        className={inputClass}
                        maxLength={1000}
                        name="resume_url"
                        placeholder="https://..."
                        type="url"
                      />
                    </label>
                  </div>
                </section>

                <label
                  aria-hidden="true"
                  className="absolute -left-2500 top-auto h-px w-px overflow-hidden"
                  htmlFor="website"
                >
                  Website
                  <input
                    autoComplete="off"
                    id="website"
                    name="website"
                    tabIndex={-1}
                  />
                </label>

                <section className="rounded-lg border border-[#2A3548] bg-[#0D1520] p-4">
                  <label className="flex items-start gap-3 text-xs leading-5 text-slate-300">
                    <input
                      checked={privacyConsent}
                      className="mt-1 accent-emerald-500"
                      onChange={(event) =>
                        setPrivacyConsent(event.target.checked)
                      }
                      required
                      type="checkbox"
                    />
                    <span>
                      I have read the privacy notice and consent to Riverpro
                      processing my personal data for recruitment and this job
                      application. <span className="text-rose-300">*</span>
                    </span>
                  </label>
                  <p className="ml-7 mt-2 text-[11px] leading-5 text-slate-500">
                    You may request access, correction, or withdrawal of consent
                    through the recruitment team.
                  </p>
                </section>

                <div className="flex flex-col-reverse gap-3 border-t border-[#253044] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Your application will be reviewed by our recruitment team.
                  </p>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#06120D] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!privacyConsent || isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Send size={15} />
                    )}
                    {isSubmitting ? "Submitting..." : "Submit application"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-[#1E293B] bg-[#0B0F19] px-5 py-5 text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <RiverproLogo compact />
          <p className="text-xs">
            © {new Date().getFullYear()} Riverpro Intertrade Co., Ltd.
          </p>
        </div>
      </footer>
    </div>
  );
}
