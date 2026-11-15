"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Download,
  LoaderCircle,
  Send,
} from "lucide-react";
import { RiverproLogo } from "@/components/riverpro-footer";
import { ThemeToggle } from "@/components/theme-provider";
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

type PrintableEntry = { label: string; value: string };

const collectApplicationEntries = (
  form: HTMLFormElement,
): {
  details: Record<string, string | string[]>;
  printable: PrintableEntry[];
} => {
  const data = new FormData(form);
  const details: Record<string, string | string[]> = {};
  const printable: PrintableEntry[] = [];
  const baseLabels: Record<string, string> = {
    full_name: "ชื่อ - นามสกุล / Full name",
    email: "อีเมล / Email",
    phone: "โทรศัพท์ / Phone",
    location: "ที่อยู่ปัจจุบัน / Location",
    linkedin_url: "LinkedIn",
    resume_url: "Resume / Portfolio",
  };

  data.forEach((rawValue, key) => {
    if (key === "website" || key === "privacy_consent") return;
    const value = String(rawValue).trim();
    if (!value) return;
    if (key.startsWith("profile.")) {
      const current = details[key.slice("profile.".length)];
      details[key.slice("profile.".length)] = current
        ? Array.isArray(current)
          ? [...current, value]
          : [current, value]
        : value;
    }
    const label =
      baseLabels[key] ||
      key
        .replace(/^profile\./, "")
        .replace(/[._]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const existing = printable.find((entry) => entry.label === label);
    if (existing) existing.value += `, ${value}`;
    else printable.push({ label, value });
  });

  return { details, printable };
};

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
  const [printableEntries, setPrintableEntries] = useState<PrintableEntry[]>(
    [],
  );

  const printApplication = (entries: PrintableEntry[]) => {
    setPrintableEntries(entries);
    const cleanup = () =>
      document.body.classList.remove("application-printing");
    document.body.classList.add("application-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(() => window.print(), 100);
  };

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
    const { details, printable } = collectApplicationEntries(formElement);
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
          p_application_details: details,
          p_privacy_consent: privacyConsent,
          p_website: String(form.get("website") || ""),
        },
      );

      if (error) throw error;
      setPrintableEntries([
        ...printable,
        {
          label: "เลขอ้างอิงใบสมัคร / Application reference",
          value: data?.application_code || "",
        },
      ]);
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
    <div className="flex min-h-screen flex-col bg-linear-to-br from-[#0B0F19] via-[#111b2d] to-[#07383a] text-slate-200">
      <header className="border-b border-[#1E293B] bg-[#111726] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <RiverproLogo />
          <ThemeToggle />
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
              {printableEntries.length > 0 && (
                <button
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#06120D] hover:bg-emerald-300"
                  onClick={() => printApplication(printableEntries)}
                  type="button"
                >
                  <Download size={16} /> พิมพ์ / บันทึกใบสมัคร PDF
                </button>
              )}
            </div>
          ) : job ? (
            <div className="overflow-hidden rounded-xl border border-[#253044] bg-[#111926]/90">
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
                      1. ข้อมูลส่วนตัวและตำแหน่งที่สมัคร
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      กรอกข้อมูลติดต่อ ประวัติที่เกี่ยวข้อง
                      และความพร้อมในการทำงาน
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-slate-300 sm:col-span-2">
                      ชื่อ - นามสกุล / Full name{" "}
                      <span className="text-rose-300">*</span>
                      <input
                        autoComplete="name"
                        className={inputClass}
                        maxLength={160}
                        name="full_name"
                        required
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      อีเมล / Email <span className="text-rose-300">*</span>
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
                      โทรศัพท์ / Phone
                      <input
                        autoComplete="tel"
                        className={inputClass}
                        maxLength={40}
                        name="phone"
                        type="tel"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      ที่อยู่ปัจจุบัน / จังหวัด
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
                      Resume / Portfolio URL
                      <input
                        className={inputClass}
                        maxLength={1000}
                        name="resume_url"
                        placeholder="https://..."
                        type="url"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      ตำแหน่งที่ต้องการสมัคร ลำดับ 1
                      <input
                        className={inputClass}
                        maxLength={160}
                        name="profile.desired_position_1"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      ตำแหน่งที่ต้องการสมัคร ลำดับ 2
                      <input
                        className={inputClass}
                        maxLength={160}
                        name="profile.desired_position_2"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      เงินเดือนที่ต้องการ (บาท)
                      <input
                        className={inputClass}
                        min="0"
                        name="profile.salary_expectation"
                        type="number"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      วันที่พร้อมเริ่มงาน
                      <input
                        className={inputClass}
                        name="profile.available_from"
                        type="date"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      สามารถปฏิบัติงานต่างจังหวัดได้
                      <select
                        className={inputClass}
                        name="profile.travel_availability"
                      >
                        <option value="">เลือกคำตอบ</option>
                        <option>ได้</option>
                        <option>ไม่ได้</option>
                      </select>
                    </label>
                    <label className="text-sm text-slate-300">
                      สามารถทำงานล่วงเวลาได้
                      <select
                        className={inputClass}
                        name="profile.overtime_availability"
                      >
                        <option value="">เลือกคำตอบ</option>
                        <option>ได้</option>
                        <option>ไม่ได้</option>
                      </select>
                    </label>
                    <label className="text-sm text-slate-300">
                      ช่องทางสัมภาษณ์ที่สะดวก
                      <select
                        className={inputClass}
                        name="profile.preferred_interview_channel"
                      >
                        <option value="">เลือกช่องทาง</option>
                        <option>ออนไลน์ (Video call)</option>
                        <option>โทรศัพท์</option>
                        <option>สัมภาษณ์ที่บริษัท</option>
                        <option>อื่น ๆ / ขอหารือกับผู้สรรหา</option>
                      </select>
                    </label>
                    <label className="text-sm text-slate-300 sm:col-span-2">
                      วันและเวลาที่สะดวกสำหรับสัมภาษณ์
                      <input
                        className={inputClass}
                        maxLength={300}
                        name="profile.preferred_interview_times"
                        placeholder="เช่น วันจันทร์-ศุกร์ หลัง 13:00 น."
                      />
                    </label>
                  </div>
                </section>

                <section className="space-y-4 border-t border-[#253044] pt-5">
                  <h2 className="text-base font-semibold text-white">
                    2. ประวัติการศึกษา
                  </h2>
                  {[1, 2, 3].map((row) => (
                    <div
                      className="grid gap-3 rounded-lg border border-[#253044] p-3 sm:grid-cols-3"
                      key={row}
                    >
                      <p className="text-xs font-semibold text-emerald-300 sm:col-span-3">
                        วุฒิการศึกษาลำดับ {row}
                      </p>
                      {[
                        ["ระดับการศึกษา", "level"],
                        ["สถานศึกษา", "school"],
                        ["จังหวัด", "province"],
                        ["ปีที่จบ", "graduation_year"],
                        ["สาขาวิชา", "major"],
                        ["เกรดเฉลี่ย", "gpa"],
                      ].map(([label, field]) => (
                        <label className="text-xs text-slate-400" key={field}>
                          {label}
                          <input
                            className={inputClass}
                            maxLength={120}
                            name={`profile.education_${row}_${field}`}
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                </section>

                <section className="space-y-4 border-t border-[#253044] pt-5">
                  <h2 className="text-base font-semibold text-white">
                    3. ภาษาและทักษะ
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {["ภาษาอังกฤษ", "ภาษาญี่ปุ่น", "ภาษาจีน"].map(
                      (language, index) => (
                        <label
                          className="text-sm text-slate-300"
                          key={language}
                        >
                          {language}
                          <select
                            className={inputClass}
                            name={`profile.language_${index + 1}`}
                          >
                            <option value="">เลือกระดับความสามารถ</option>
                            <option>ดี</option>
                            <option>ปานกลาง</option>
                            <option>พื้นฐาน</option>
                          </select>
                        </label>
                      ),
                    )}
                    <label className="text-sm text-slate-300">
                      โปรแกรมคอมพิวเตอร์ที่ใช้ได้
                      <input
                        className={inputClass}
                        maxLength={300}
                        name="profile.computer_skills"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      ทักษะอื่น ๆ / ความสามารถพิเศษ
                      <input
                        className={inputClass}
                        maxLength={300}
                        name="profile.other_skills"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      ความเร็วพิมพ์ภาษาไทย (คำ/นาที)
                      <input
                        className={inputClass}
                        min="0"
                        name="profile.typing_thai"
                        type="number"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      ความเร็วพิมพ์ภาษาอังกฤษ (คำ/นาที)
                      <input
                        className={inputClass}
                        min="0"
                        name="profile.typing_english"
                        type="number"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      ใบอนุญาตขับขี่ / ประเภท
                      <input
                        className={inputClass}
                        maxLength={120}
                        name="profile.driving_license"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      ประสบการณ์ขับรถโฟร์คลิฟท์
                      <input
                        className={inputClass}
                        maxLength={120}
                        name="profile.forklift_experience"
                      />
                    </label>
                  </div>
                </section>

                <section className="space-y-4 border-t border-[#253044] pt-5">
                  <h2 className="text-base font-semibold text-white">
                    4. ประสบการณ์ทำงานและการฝึกงาน
                  </h2>
                  {[1, 2, 3].map((row) => (
                    <div
                      className="grid gap-3 rounded-lg border border-[#253044] p-3 sm:grid-cols-2"
                      key={row}
                    >
                      <p className="text-xs font-semibold text-emerald-300 sm:col-span-2">
                        ประวัติการทำงานลำดับ {row}
                      </p>
                      {[
                        ["บริษัท", "company"],
                        ["ตำแหน่ง", "position"],
                        ["ช่วงเวลาทำงาน", "period"],
                        ["จังหวัด", "province"],
                        ["หน้าที่รับผิดชอบ", "responsibilities"],
                        ["เหตุผลที่ออก", "reason_for_leaving"],
                      ].map(([label, field]) => (
                        <label className="text-xs text-slate-400" key={field}>
                          {label}
                          <input
                            className={inputClass}
                            maxLength={300}
                            name={`profile.work_${row}_${field}`}
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-slate-300">
                      ประวัติการฝึกงาน / ดูงาน
                      <textarea
                        className={`${inputClass} min-h-24`}
                        maxLength={2000}
                        name="profile.internship_history"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      กิจกรรมระหว่างการศึกษา / งานอดิเรก
                      <textarea
                        className={`${inputClass} min-h-24`}
                        maxLength={2000}
                        name="profile.activities"
                      />
                    </label>
                    <label className="text-sm text-slate-300 sm:col-span-2">
                      การอบรม / สัมมนา (หลักสูตร หน่วยงาน และปีที่อบรม)
                      <textarea
                        className={`${inputClass} min-h-24`}
                        maxLength={2000}
                        name="profile.training_history"
                      />
                    </label>
                  </div>
                </section>

                <section className="space-y-4 border-t border-[#253044] pt-5">
                  <h2 className="text-base font-semibold text-white">
                    5. ผู้ติดต่อกรณีฉุกเฉินและบุคคลอ้างอิง
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2].map((row) => (
                      <div
                        className="grid gap-3 rounded-lg border border-[#253044] p-3"
                        key={row}
                      >
                        <p className="text-xs font-semibold text-emerald-300">
                          ผู้ติดต่อ {row}
                        </p>
                        <input
                          aria-label={`ชื่อผู้ติดต่อ ${row}`}
                          className={inputClass}
                          maxLength={160}
                          name={`profile.contact_${row}_name`}
                          placeholder="ชื่อ - นามสกุล"
                        />
                        <input
                          aria-label={`ความสัมพันธ์ผู้ติดต่อ ${row}`}
                          className={inputClass}
                          maxLength={80}
                          name={`profile.contact_${row}_relationship`}
                          placeholder="ความสัมพันธ์"
                        />
                        <input
                          aria-label={`โทรศัพท์ผู้ติดต่อ ${row}`}
                          className={inputClass}
                          maxLength={40}
                          name={`profile.contact_${row}_phone`}
                          placeholder="โทรศัพท์"
                          type="tel"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3 border-t border-[#253044] pt-5">
                  <h2 className="text-base font-semibold text-white">
                    6. ข้อมูลเพิ่มเติม
                  </h2>
                  <label className="block text-sm text-slate-300">
                    ข้อมูลหรือคำชี้แจงเพิ่มเติมสำหรับผู้สรรหา
                    <textarea
                      className={`${inputClass} min-h-28`}
                      maxLength={3000}
                      name="profile.additional_information"
                    />
                  </label>
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
                    ข้อมูลสุขภาพ เลขประจำตัวประชาชน
                    และข้อมูลครอบครัวจะไม่ถูกร้องขอในขั้นตอนสมัครออนไลน์
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#40516b] px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
                      onClick={(event) => {
                        const formElement = event.currentTarget.form;
                        if (formElement)
                          printApplication(
                            collectApplicationEntries(formElement).printable,
                          );
                      }}
                      type="button"
                    >
                      <Download size={15} /> พิมพ์ / บันทึก PDF
                    </button>
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
                      {isSubmitting ? "กำลังส่ง..." : "ส่งใบสมัคร"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </main>

      {printableEntries.length > 0 && (
        <section id="application-print-sheet" aria-hidden="true">
          <h1>ใบสมัครงาน / Employment Application</h1>
          <h2>
            {job?.title || "Riverpro"} · {job?.job_code}
          </h2>
          <p>บริษัท ริเวอร์โปร อินเตอร์เทรด จำกัด</p>
          <table>
            <tbody>
              {printableEntries.map((entry) => (
                <tr key={entry.label}>
                  <th>{entry.label}</th>
                  <td>{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="application-print-signature">
            ลงชื่อผู้สมัคร
            ............................................................ วันที่
            ........../........../..........
          </p>
        </section>
      )}

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
