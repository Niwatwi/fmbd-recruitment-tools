"use client";

import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Activity,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Clock3,
  Download,
  FileSpreadsheet,
  Filter,
  LoaderCircle,
  Link2,
  Mail,
  MapPin,
  Plus,
  Search,
  UserRoundPlus,
  UserCheck,
  UserX,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  job_code: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  headcount: number;
  recruiter_email: string | null;
  status: string;
  close_date: string | null;
};

type Candidate = {
  id: string;
  candidate_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
};

type Application = {
  id: string;
  application_code: string;
  candidate_id: string;
  job_id: string;
  stage: string;
  review_status: string;
  reviewed_at: string | null;
  source: string | null;
  owner_email: string | null;
  applied_at: string;
  next_action_at: string | null;
  notes: string | null;
  candidate: Candidate | null;
  job: Job | null;
};

type Notice = { type: "success" | "error" | "info"; text: string } | null;

const STAGES = [
  { id: "new_applicant", label: "New application", color: "sky" },
  { id: "screening", label: "Screening", color: "cyan" },
  { id: "interview", label: "Interview", color: "amber" },
  { id: "assessment", label: "Assessment", color: "orange" },
  { id: "offer", label: "Offer", color: "emerald" },
  { id: "hired", label: "Hired", color: "green" },
  { id: "rejected", label: "Rejected", color: "rose" },
  { id: "withdrawn", label: "Withdrawn", color: "slate" },
] as const;

const BOARD_COLUMNS = [
  { id: "new_applicant", label: "New application", stages: ["new_applicant"] },
  { id: "screening", label: "Screening", stages: ["screening"] },
  { id: "interview", label: "Interview", stages: ["interview"] },
  { id: "assessment", label: "Assessment", stages: ["assessment"] },
  { id: "offer", label: "Offer", stages: ["offer"] },
  { id: "hired", label: "Hired", stages: ["hired"] },
  { id: "closed", label: "Closed", stages: ["rejected", "withdrawn"] },
] as const;

const TEMPLATES = [
  {
    title: "Job requisitions",
    description: "ตำแหน่งงาน, หน่วยงาน, ผู้จัดการ และช่วงเปิดรับ",
    href: "/templates/ats-jobs-template.csv",
    filename: "ats-jobs-template.csv",
    icon: BriefcaseBusiness,
  },
  {
    title: "Candidate profiles",
    description: "ข้อมูลผู้สมัคร, ช่องทางที่มา และสถานะความยินยอม",
    href: "/templates/ats-candidates-template.csv",
    filename: "ats-candidates-template.csv",
    icon: UsersRound,
  },
  {
    title: "Applications",
    description: "ใบสมัครที่เชื่อม candidate_code กับ job_code",
    href: "/templates/ats-applications-template.csv",
    filename: "ats-applications-template.csv",
    icon: FileSpreadsheet,
  },
];

const FIELD_CLASS =
  "w-full rounded-lg border border-[#2A3548] bg-[#0B1220] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

const codeFor = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const normalizeRow = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, ""),
      String(value ?? "").trim(),
    ]),
  );

const uniqueBy = <T,>(rows: T[], keyOf: (row: T) => string) =>
  Array.from(new Map(rows.map((row) => [keyOf(row), row])).values());

const stageLabel = (stage: string) =>
  STAGES.find((item) => item.id === stage)?.label || stage;

function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-70 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-label={title}
        aria-modal="true"
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-[#263246] bg-[#111926] p-5 shadow-2xl sm:rounded-xl sm:p-6 ${wide ? "max-w-4xl" : "max-w-xl"}`}
        role="dialog"
      >
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#253044] pb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            aria-label="Close dialog"
            className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ATSWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [scheduledInterviewCount, setScheduledInterviewCount] = useState(0);
  const [pendingOfferCount, setPendingOfferCount] = useState(0);
  const [notifications, setNotifications] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasATSAccess, setHasATSAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [applicationLinks, setApplicationLinks] = useState<
    Record<string, string>
  >({});
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(
    null,
  );
  const [interviews, setInterviews] = useState<Record<string, any>[]>([]);
  const [offers, setOffers] = useState<Record<string, any>[]>([]);
  const [activity, setActivity] = useState<Record<string, any>[]>([]);
  const [candidateConsent, setCandidateConsent] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    job_id: "",
    source: "Company website",
  });
  const [jobForm, setJobForm] = useState({
    title: "",
    department: "",
    location: "",
    employment_type: "Full-time",
    headcount: "1",
    hiring_manager_email: "",
    recruiter_email: "",
  });
  const [interviewForm, setInterviewForm] = useState({
    starts_at: "",
    interview_type: "video",
    duration_minutes: "60",
    interviewer_email: "",
    location_or_link: "",
  });
  const [offerForm, setOfferForm] = useState({
    salary_amount: "",
    salary_period: "monthly",
    currency_code: "THB",
    expires_at: "",
  });

  const loadWorkspace = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setHasATSAccess(false);
        setNotice({
          type: "error",
          text: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
        });
        setJobs([]);
        setApplications([]);
        return;
      }

      const { data: userRole, error: roleError } = await supabase
        .from("ats_user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (roleError) throw roleError;
      if (!userRole || !["admin", "recruiter"].includes(userRole.role)) {
        setHasATSAccess(false);
        setNotice({
          type: "error",
          text: "บัญชีนี้ยังไม่มี ATS role จึงสร้างหรือแก้ไข requisition ไม่ได้ ให้ Supabase admin กำหนด role เป็น admin หรือ recruiter ตามคำสั่งใน supabase/ats_import_guide.md",
        });
        setJobs([]);
        setApplications([]);
        setNotifications([]);
        return;
      }
      setHasATSAccess(true);

      const [
        applicationResult,
        jobResult,
        interviewResult,
        offerResult,
        notificationResult,
      ] = await Promise.all([
        supabase
          .from("ats_applications")
          .select("*")
          .order("applied_at", { ascending: false })
          .limit(1000),
        supabase
          .from("ats_jobs")
          .select(
            "id,job_code,title,department,location,employment_type,headcount,recruiter_email,status,close_date",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("ats_interviews")
          .select("id,status")
          .eq("status", "scheduled"),
        supabase
          .from("ats_offers")
          .select("id,status")
          .in("status", ["pending_approval", "sent"]),
        supabase
          .from("ats_notifications")
          .select(
            "id,application_id,event_type,title,message,read_at,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      if (applicationResult.error) throw applicationResult.error;
      if (jobResult.error) throw jobResult.error;
      if (interviewResult.error) throw interviewResult.error;
      if (offerResult.error) throw offerResult.error;
      if (notificationResult.error) throw notificationResult.error;

      const applicationRows = applicationResult.data || [];
      const candidateIds = Array.from(
        new Set(applicationRows.map((row) => row.candidate_id)),
      );
      const candidateRows: Candidate[] = [];

      if (candidateIds.length > 0) {
        const { data, error } = await supabase
          .from("ats_candidates")
          .select("*")
          .in("id", candidateIds);
        if (error) throw error;
        candidateRows.push(...((data || []) as Candidate[]));
      }

      const jobsData = (jobResult.data || []) as Job[];
      const candidateById = new Map(
        candidateRows.map((item) => [item.id, item]),
      );
      const jobById = new Map(jobsData.map((item) => [item.id, item]));

      setJobs(jobsData);
      setApplications(
        applicationRows.map((row) => ({
          ...(row as Omit<Application, "candidate" | "job">),
          candidate: candidateById.get(row.candidate_id) || null,
          job: jobById.get(row.job_id) || null,
        })),
      );
      setScheduledInterviewCount(interviewResult.data?.length || 0);
      setPendingOfferCount(offerResult.data?.length || 0);
      setNotifications(notificationResult.data || []);
    } catch (error: any) {
      console.error("ATS workspace could not load:", error);
      const sessionMissing =
        error.name === "AuthSessionMissingError" ||
        error.message?.includes("Auth session missing");
      const schemaNotReady =
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        error.message?.includes("ats_");
      setNotice({
        type: "error",
        text: sessionMissing
          ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบก่อนใช้งาน ATS"
          : error.code === "42501"
            ? "บัญชีนี้ยังไม่มีสิทธิ์ ATS กรุณาเพิ่ม role admin หรือ recruiter ในตาราง ats_user_roles"
            : schemaNotReady
              ? "ยังไม่พบตาราง ATS ใน Supabase ดาวน์โหลด schema SQL แล้วรันใน SQL Editor ก่อนโหลดหน้านี้ใหม่"
              : error.message || "ไม่สามารถโหลดข้อมูล ATS ได้ กรุณาลองใหม่",
      });
      if (error.code === "42501" || schemaNotReady) {
        setHasATSAccess(false);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
    const interval = window.setInterval(() => void loadWorkspace(false), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const activeApplication = applications.find(
    (application) => application.id === activeApplicationId,
  );

  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return applications.filter((application) => {
      if (jobFilter !== "all" && application.job_id !== jobFilter) return false;
      if (!query) return true;
      return [
        application.candidate?.full_name,
        application.candidate?.email,
        application.job?.title,
        application.job?.job_code,
        application.source,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [applications, jobFilter, searchTerm]);

  const openJobs = jobs.filter((job) => job.status === "open");
  const activeApplications = applications.filter(
    (application) =>
      !["hired", "rejected", "withdrawn"].includes(application.stage),
  ).length;
  const pendingReviewCount = applications.filter(
    (application) => application.review_status === "pending",
  ).length;
  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;

  const openApplicationDetails = async (application: Application) => {
    setActiveApplicationId(application.id);
    setInterviews([]);
    setOffers([]);
    setActivity([]);
    const [interviewResult, offerResult, activityResult] = await Promise.all([
      supabase
        .from("ats_interviews")
        .select("*")
        .eq("application_id", application.id)
        .order("starts_at", { ascending: false }),
      supabase
        .from("ats_offers")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ats_activity")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (interviewResult.error || offerResult.error || activityResult.error) {
      setNotice({
        type: "error",
        text:
          interviewResult.error?.message ||
          offerResult.error?.message ||
          activityResult.error?.message ||
          "Unable to load application details",
      });
      return;
    }

    setInterviews(interviewResult.data || []);
    setOffers(offerResult.data || []);
    setActivity(activityResult.data || []);
  };

  const addActivity = async (
    application: Application,
    eventType: string,
    summary: string,
    metadata: Record<string, unknown> = {},
  ) => {
    const { error } = await supabase.from("ats_activity").insert({
      application_id: application.id,
      candidate_id: application.candidate_id,
      job_id: application.job_id,
      event_type: eventType,
      summary,
      metadata,
    });
    if (error) console.error("Activity log write failed:", error.message);
  };

  const changeStage = async (application: Application, nextStage: string) => {
    if (application.stage === nextStage) return;
    const previousStage = application.stage;
    setApplications((current) =>
      current.map((item) =>
        item.id === application.id ? { ...item, stage: nextStage } : item,
      ),
    );
    const { error } = await supabase
      .from("ats_applications")
      .update({ stage: nextStage })
      .eq("id", application.id);

    if (error) {
      setNotice({ type: "error", text: error.message });
      await loadWorkspace();
      return;
    }

    await addActivity(
      application,
      "stage_changed",
      `${stageLabel(previousStage)} → ${stageLabel(nextStage)}`,
      { from: previousStage, to: nextStage },
    );
    setNotice({
      type: "success",
      text: `ย้ายใบสมัครไปยัง ${stageLabel(nextStage)} แล้ว`,
    });
    if (activeApplicationId === application.id) {
      const { data } = await supabase
        .from("ats_activity")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false })
        .limit(8);
      setActivity(data || []);
    }
  };

  const createJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const jobCode = codeFor("JOB");
      const { data, error } = await supabase
        .from("ats_jobs")
        .insert({
          job_code: jobCode,
          title: jobForm.title.trim(),
          department: jobForm.department.trim() || null,
          location: jobForm.location.trim() || null,
          employment_type: jobForm.employment_type,
          headcount: Number(jobForm.headcount) || 1,
          hiring_manager_email:
            jobForm.hiring_manager_email.trim().toLowerCase() || null,
          recruiter_email: jobForm.recruiter_email.trim().toLowerCase() || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("ats_activity").insert({
        job_id: data.id,
        event_type: "job_created",
        summary: `เปิด requisition ${jobCode}: ${jobForm.title.trim()}`,
      });
      setJobForm({
        title: "",
        department: "",
        location: "",
        employment_type: "Full-time",
        headcount: "1",
        hiring_manager_email: "",
        recruiter_email: "",
      });
      setJobDialogOpen(false);
      setNotice({ type: "success", text: `สร้างตำแหน่ง ${jobCode} แล้ว` });
      await loadWorkspace();
    } catch (error: any) {
      setNotice({
        type: "error",
        text:
          error.code === "42501" ||
          error.name === "AuthSessionMissingError" ||
          error.message?.includes("Auth session missing")
            ? "บัญชีนี้ไม่มี ATS role admin/recruiter กรุณาให้ Supabase admin กำหนด role ตาม supabase/ats_import_guide.md แล้วเข้าสู่ระบบใหม่"
            : error.message || "สร้างตำแหน่งไม่สำเร็จ",
      });
    } finally {
      setSaving(false);
    }
  };

  const createApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!candidateForm.job_id) {
      setNotice({
        type: "error",
        text: "กรุณาเลือกตำแหน่งงานก่อนสร้างใบสมัคร",
      });
      return;
    }

    setSaving(true);
    try {
      const email = candidateForm.email.trim().toLowerCase();
      const { data: existingCandidate, error: lookupError } = await supabase
        .from("ats_candidates")
        .select("id,candidate_code")
        .ilike("email", email)
        .maybeSingle();
      if (lookupError) throw lookupError;

      let candidateId = existingCandidate?.id;
      if (!candidateId) {
        const { data, error } = await supabase
          .from("ats_candidates")
          .insert({
            candidate_code: codeFor("CAN"),
            full_name: candidateForm.full_name.trim(),
            email,
            phone: candidateForm.phone.trim() || null,
            primary_source: candidateForm.source,
            consent_status: candidateConsent ? "consented" : "not_recorded",
            consent_date: candidateConsent
              ? new Date().toISOString().slice(0, 10)
              : null,
          })
          .select("id")
          .single();
        if (error) throw error;
        candidateId = data.id;
      }

      if (candidateConsent && existingCandidate?.id) {
        const { error } = await supabase
          .from("ats_candidates")
          .update({
            consent_status: "consented",
            consent_date: new Date().toISOString().slice(0, 10),
          })
          .eq("id", existingCandidate.id);
        if (error) throw error;
      }

      const job = jobs.find((item) => item.id === candidateForm.job_id) || null;
      const applicationCode = codeFor("APP");
      const { data: applicationRow, error: applicationError } = await supabase
        .from("ats_applications")
        .insert({
          application_code: applicationCode,
          candidate_id: candidateId,
          job_id: candidateForm.job_id,
          stage: "new_applicant",
          source: candidateForm.source,
          owner_email: job?.recruiter_email || null,
        })
        .select(
          "id,candidate_id,job_id,stage,source,owner_email,applied_at,next_action_at,notes,application_code",
        )
        .single();
      if (applicationError) throw applicationError;

      await supabase.from("ats_activity").insert({
        application_id: applicationRow.id,
        candidate_id: candidateId,
        job_id: candidateForm.job_id,
        event_type: "application_created",
        summary: `ใบสมัครใหม่สำหรับ ${job?.title || "ตำแหน่งงาน"}`,
      });
      setCandidateForm({
        full_name: "",
        email: "",
        phone: "",
        job_id: "",
        source: "Company website",
      });
      setCandidateConsent(false);
      setCandidateDialogOpen(false);
      setNotice({
        type: "success",
        text: `สร้างใบสมัคร ${applicationCode} แล้ว`,
      });
      await loadWorkspace();
    } catch (error: any) {
      setNotice({
        type: "error",
        text: error.message || "สร้างใบสมัครไม่สำเร็จ",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setNotice(null);
    try {
      let parsedRows: Record<string, unknown>[];
      if (/\.xlsx?$/i.test(file.name)) {
        const workbook = XLSX.read(await file.arrayBuffer(), {
          cellDates: true,
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = sheet
          ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
              defval: "",
              raw: false,
            })
          : [];
      } else {
        const result = await new Promise<
          Papa.ParseResult<Record<string, unknown>>
        >((resolve, reject) => {
          Papa.parse<Record<string, unknown>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject,
          });
        });
        parsedRows = result.data;
      }

      const rows = parsedRows.map(normalizeRow);
      const headers = new Set(Object.keys(rows[0] || {}));
      const value = (row: Record<string, string>, key: string) =>
        row[key]?.trim() || "";

      if (headers.has("job_code") && headers.has("title")) {
        const mapped = rows
          .filter((row) => value(row, "job_code") && value(row, "title"))
          .map((row) => ({
            job_code: value(row, "job_code").toUpperCase(),
            title: value(row, "title"),
            department: value(row, "department") || null,
            location: value(row, "location") || null,
            employment_type: value(row, "employment_type") || null,
            headcount: Math.max(1, Number(value(row, "headcount")) || 1),
            hiring_manager_email:
              value(row, "hiring_manager_email").toLowerCase() || null,
            recruiter_email:
              value(row, "recruiter_email").toLowerCase() || null,
            status: ["open", "on_hold", "closed", "cancelled"].includes(
              value(row, "status").toLowerCase(),
            )
              ? value(row, "status").toLowerCase()
              : "open",
            open_date: value(row, "open_date") || null,
            close_date: value(row, "close_date") || null,
            description: value(row, "description") || null,
          }));
        if (mapped.length === 0)
          throw new Error("ไม่พบแถวงานที่มี job_code และ title ครบ");
        const uniqueMapped = uniqueBy(mapped, (row) => row.job_code);
        const { error } = await supabase
          .from("ats_jobs")
          .upsert(uniqueMapped, { onConflict: "job_code" });
        if (error) throw error;
        setNotice({
          type: "success",
          text: `นำเข้าตำแหน่งงาน ${uniqueMapped.length} รายการ${mapped.length > uniqueMapped.length ? ` (ข้าม code ซ้ำ ${mapped.length - uniqueMapped.length} แถว)` : ""}`,
        });
      } else if (headers.has("candidate_code") && headers.has("full_name")) {
        const mapped = rows
          .filter(
            (row) => value(row, "candidate_code") && value(row, "full_name"),
          )
          .map((row) => ({
            candidate_code: value(row, "candidate_code").toUpperCase(),
            full_name: value(row, "full_name"),
            email: value(row, "email").toLowerCase() || null,
            phone: value(row, "phone") || null,
            location: value(row, "location") || null,
            linkedin_url: value(row, "linkedin_url") || null,
            portfolio_url: value(row, "portfolio_url") || null,
            resume_url: value(row, "resume_url") || null,
            primary_source: value(row, "primary_source") || null,
            source_detail: value(row, "source_detail") || null,
            consent_status: ["not_recorded", "consented", "withdrawn"].includes(
              value(row, "consent_status").toLowerCase(),
            )
              ? value(row, "consent_status").toLowerCase()
              : "not_recorded",
            consent_date: value(row, "consent_date") || null,
          }));
        if (mapped.length === 0)
          throw new Error(
            "ไม่พบแถวผู้สมัครที่มี candidate_code และ full_name ครบ",
          );
        const uniqueMapped = uniqueBy(mapped, (row) => row.candidate_code);
        const candidateEmails = uniqueMapped
          .map((row) => row.email)
          .filter((email): email is string => Boolean(email));
        if (new Set(candidateEmails).size !== candidateEmails.length) {
          throw new Error(
            "พบอีเมลซ้ำหลาย candidate_code กรุณารวมข้อมูลให้เหลือหนึ่ง candidate_code ต่อผู้สมัคร",
          );
        }
        const { error } = await supabase
          .from("ats_candidates")
          .upsert(uniqueMapped, { onConflict: "candidate_code" });
        if (error) throw error;
        setNotice({
          type: "success",
          text: `นำเข้าประวัติผู้สมัคร ${uniqueMapped.length} รายการ${mapped.length > uniqueMapped.length ? ` (ข้าม code ซ้ำ ${mapped.length - uniqueMapped.length} แถว)` : ""}`,
        });
      } else if (
        headers.has("application_code") &&
        headers.has("candidate_code") &&
        headers.has("job_code")
      ) {
        const validRows = rows.filter(
          (row) =>
            value(row, "application_code") &&
            value(row, "candidate_code") &&
            value(row, "job_code"),
        );
        const candidateCodes = Array.from(
          new Set(
            validRows.map((row) => value(row, "candidate_code").toUpperCase()),
          ),
        );
        const jobCodes = Array.from(
          new Set(validRows.map((row) => value(row, "job_code").toUpperCase())),
        );
        const [
          { data: candidateRows, error: candidatesError },
          { data: jobRows, error: jobsError },
        ] = await Promise.all([
          supabase
            .from("ats_candidates")
            .select("id,candidate_code")
            .in("candidate_code", candidateCodes),
          supabase
            .from("ats_jobs")
            .select("id,job_code")
            .in("job_code", jobCodes),
        ]);
        if (candidatesError) throw candidatesError;
        if (jobsError) throw jobsError;

        const candidateIds = new Map(
          (candidateRows || []).map((item) => [item.candidate_code, item.id]),
        );
        const jobIds = new Map(
          (jobRows || []).map((item) => [item.job_code, item.id]),
        );
        const allowedStages = STAGES.map((stage) => stage.id);
        const mapped = validRows.flatMap((row) => {
          const candidateCode = value(row, "candidate_code").toUpperCase();
          const jobCode = value(row, "job_code").toUpperCase();
          const stage = value(row, "stage")
            .toLowerCase()
            .replace(/[\s-]+/g, "_");
          const candidateId = candidateIds.get(candidateCode);
          const jobId = jobIds.get(jobCode);
          if (!candidateId || !jobId) return [];
          if (
            value(row, "stage") &&
            !allowedStages.includes(stage as (typeof STAGES)[number]["id"])
          )
            return [];
          return [
            {
              application_code: value(row, "application_code").toUpperCase(),
              candidate_id: candidateId,
              job_id: jobId,
              stage: stage || "new_applicant",
              source: value(row, "source") || null,
              owner_email: value(row, "owner_email").toLowerCase() || null,
              applied_at: value(row, "applied_at") || new Date().toISOString(),
              next_action_at: value(row, "next_action_at") || null,
              notes: value(row, "notes") || null,
            },
          ];
        });
        if (mapped.length === 0)
          throw new Error(
            "ไม่พบรายการที่อ้างอิง candidate_code และ job_code ซึ่งมีอยู่ในระบบ",
          );
        const uniqueMapped = uniqueBy(mapped, (row) => row.application_code);
        const { error } = await supabase
          .from("ats_applications")
          .upsert(uniqueMapped, { onConflict: "application_code" });
        if (error) throw error;
        const skipped = validRows.length - uniqueMapped.length;
        setNotice({
          type: "success",
          text: `นำเข้าใบสมัคร ${uniqueMapped.length} รายการ${skipped ? ` (ข้าม ${skipped} รายการที่ซ้ำหรือข้อมูลอ้างอิงไม่ครบ)` : ""}`,
        });
      } else {
        throw new Error(
          "ไม่รู้จักรูปแบบไฟล์ กรุณาใช้ Template งาน, ผู้สมัคร หรือใบสมัครของ ATS",
        );
      }

      await loadWorkspace();
    } catch (error: any) {
      setNotice({
        type: "error",
        text: error.message || "อ่านหรือนำเข้าไฟล์ไม่สำเร็จ",
      });
    } finally {
      setImporting(false);
    }
  };

  const scheduleInterview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeApplication || !interviewForm.starts_at) return;
    if (activeApplication.review_status !== "approved") {
      setNotice({
        type: "error",
        text: "กรุณาอนุมัติใบสมัครก่อนนัดสัมภาษณ์",
      });
      return;
    }
    setSaving(true);
    try {
      const startsAt = new Date(interviewForm.starts_at).toISOString();
      const { data: interview, error } = await supabase
        .from("ats_interviews")
        .insert({
          application_id: activeApplication.id,
          interview_type: interviewForm.interview_type,
          starts_at: startsAt,
          duration_minutes: Number(interviewForm.duration_minutes) || 60,
          interviewer_email:
            interviewForm.interviewer_email.trim().toLowerCase() || null,
          location_or_link: interviewForm.location_or_link.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: applicationError } = await supabase
        .from("ats_applications")
        .update({ stage: "interview", next_action_at: startsAt })
        .eq("id", activeApplication.id);
      if (applicationError) throw applicationError;
      await addActivity(
        activeApplication,
        "interview_scheduled",
        "นัดสัมภาษณ์แล้ว",
        {
          starts_at: startsAt,
          interview_type: interviewForm.interview_type,
        },
      );
      setInterviewForm({
        starts_at: "",
        interview_type: "video",
        duration_minutes: "60",
        interviewer_email: "",
        location_or_link: "",
      });
      await sendInterviewInvitation(interview.id);
      await loadWorkspace();
    } catch (error: any) {
      setNotice({
        type: "error",
        text: error.message || "บันทึกนัดสัมภาษณ์ไม่สำเร็จ",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveInterviewEvaluation = async (
    event: React.FormEvent<HTMLFormElement>,
    interview: Record<string, any>,
  ) => {
    event.preventDefault();
    if (!activeApplication) return;
    const formData = new FormData(event.currentTarget);
    const score = String(formData.get("score") || "");
    const status = String(formData.get("status") || "scheduled");
    const feedback = String(formData.get("feedback") || "").trim();
    const { error } = await supabase
      .from("ats_interviews")
      .update({
        status,
        feedback: feedback || null,
        score: score ? Number(score) : null,
      })
      .eq("id", interview.id);

    if (error) {
      setNotice({ type: "error", text: error.message });
      return;
    }

    await addActivity(
      activeApplication,
      "interview_evaluated",
      `บันทึกผลสัมภาษณ์ (${status})`,
      { interview_id: interview.id, status, score: score || null },
    );
    await refreshApplicationDetails(activeApplication);
    setNotice({ type: "success", text: "บันทึกผลประเมินสัมภาษณ์แล้ว" });
  };

  const createOffer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeApplication || !offerForm.salary_amount) return;
    if (activeApplication.review_status !== "approved") {
      setNotice({
        type: "error",
        text: "กรุณาอนุมัติใบสมัครก่อนสร้างข้อเสนอจ้าง",
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("ats_offers").insert({
        application_id: activeApplication.id,
        status: "draft",
        job_title: activeApplication.job?.title || null,
        salary_amount: Number(offerForm.salary_amount),
        salary_period: offerForm.salary_period,
        currency_code: offerForm.currency_code.toUpperCase(),
        expires_at: offerForm.expires_at || null,
      });
      if (error) throw error;
      const { error: applicationError } = await supabase
        .from("ats_applications")
        .update({ stage: "offer" })
        .eq("id", activeApplication.id);
      if (applicationError) throw applicationError;
      await addActivity(
        activeApplication,
        "offer_created",
        "สร้างข้อเสนอจ้างฉบับร่าง",
        {
          salary_period: offerForm.salary_period,
          currency_code: offerForm.currency_code.toUpperCase(),
        },
      );
      setOfferForm({
        salary_amount: "",
        salary_period: "monthly",
        currency_code: "THB",
        expires_at: "",
      });
      await refreshApplicationDetails(activeApplication);
      await loadWorkspace();
      setNotice({ type: "success", text: "สร้างข้อเสนอจ้างฉบับร่างแล้ว" });
    } catch (error: any) {
      setNotice({
        type: "error",
        text: error.message || "สร้างข้อเสนอไม่สำเร็จ",
      });
    } finally {
      setSaving(false);
    }
  };

  const refreshApplicationDetails = async (application: Application) => {
    const [interviewResult, offerResult, activityResult] = await Promise.all([
      supabase
        .from("ats_interviews")
        .select("*")
        .eq("application_id", application.id)
        .order("starts_at", { ascending: false }),
      supabase
        .from("ats_offers")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ats_activity")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    setInterviews(interviewResult.data || []);
    setOffers(offerResult.data || []);
    setActivity(activityResult.data || []);
  };

  const sendInterviewInvitation = async (interviewId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const invitationResponse = await fetch("/api/ats/send-interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token || ""}`,
        },
        body: JSON.stringify({ interviewId }),
      });
      const invitation = await invitationResponse.json().catch(() => ({}));
      setNotice(
        invitationResponse.ok
          ? {
              type: "success",
              text: invitation.alreadySent
                ? "อีเมลนัดสัมภาษณ์ถูกส่งไปแล้ว"
                : `ส่งอีเมลเชิญสัมภาษณ์ไปยัง ${invitation.recipient} แล้ว`,
            }
          : {
              type: "info",
              text: `บันทึกนัดสัมภาษณ์แล้ว แต่ส่งอีเมลไม่สำเร็จ: ${invitation.error || "ตรวจสอบการตั้งค่าบริการอีเมล"}`,
            },
      );
      if (activeApplication) {
        await refreshApplicationDetails(activeApplication);
      }
    } catch (error: any) {
      setNotice({
        type: "info",
        text: `บันทึกนัดสัมภาษณ์แล้ว แต่เชื่อมต่อบริการอีเมลไม่ได้: ${error.message || "ลองส่งคำเชิญอีกครั้ง"}`,
      });
    }
  };

  const updateOfferStatus = async (offerId: string, status: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const update: Record<string, unknown> = { status };
    if (status === "sent") {
      update.approved_by = authData.user?.id || null;
      update.approved_at = new Date().toISOString();
      update.sent_at = new Date().toISOString();
    }
    if (["accepted", "declined"].includes(status)) {
      update.responded_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("ats_offers")
      .update(update)
      .eq("id", offerId);
    if (error) {
      setNotice({ type: "error", text: error.message });
      return;
    }
    if (activeApplication) {
      await addActivity(
        activeApplication,
        "offer_status_changed",
        `อัปเดตข้อเสนอเป็น ${status}`,
        { status },
      );
      await refreshApplicationDetails(activeApplication);
    }
    await loadWorkspace();
  };

  const updateJobStatus = async (job: Job, status: string) => {
    const { error } = await supabase
      .from("ats_jobs")
      .update({ status })
      .eq("id", job.id);
    if (error) {
      setNotice({ type: "error", text: error.message });
      return;
    }
    setNotice({
      type: "success",
      text: `อัปเดตสถานะตำแหน่ง ${job.job_code} แล้ว`,
    });
    await loadWorkspace();
  };

  const createApplicationLink = async (job: Job) => {
    if (
      job.status !== "open" ||
      (job.close_date && job.close_date < new Date().toISOString().slice(0, 10))
    ) {
      setNotice({
        type: "error",
        text: "ปิดรับสมัครแล้ว ไม่สามารถสร้างลิงก์ใหม่ได้",
      });
      return;
    }
    try {
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(randomBytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      const tokenDigest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token),
      );
      const tokenHash = Array.from(new Uint8Array(tokenDigest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      const { error } = await supabase
        .from("ats_jobs")
        .update({
          public_application_token_hash: tokenHash,
          public_application_enabled: true,
        })
        .eq("id", job.id);
      if (error) throw error;

      const url = `${window.location.origin}/apply/${encodeURIComponent(job.job_code)}?token=${token}`;
      setApplicationLinks((current) => ({ ...current, [job.id]: url }));
      setNotice({
        type: "success",
        text: "สร้างลิงก์สมัครแบบส่วนตัวแล้ว คัดลอกและส่งให้ผู้สมัครได้ ลิงก์เดิมถูกยกเลิก",
      });
    } catch (error: any) {
      setNotice({
        type: "error",
        text: error.message || "สร้างลิงก์สมัครไม่สำเร็จ",
      });
    }
  };

  const copyApplicationLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ type: "success", text: "คัดลอกลิงก์สมัครงานแล้ว" });
    } catch {
      setNotice({
        type: "error",
        text: "เบราว์เซอร์ไม่อนุญาตให้คัดลอก กรุณาคัดลอก URL จากช่องลิงก์",
      });
    }
  };

  const reviewApplication = async (
    application: Application,
    decision: "approved" | "declined",
  ) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setNotice({ type: "error", text: "กรุณาเข้าสู่ระบบก่อนตรวจใบสมัคร" });
      return;
    }

    const nextStage = decision === "approved" ? "screening" : "rejected";
    const { data: reviewedRow, error } = await supabase
      .from("ats_applications")
      .update({
        review_status: decision,
        reviewed_by: authData.user.id,
        reviewed_at: new Date().toISOString(),
        stage: nextStage,
      })
      .eq("id", application.id)
      .eq("review_status", "pending")
      .select("id")
      .maybeSingle();
    if (error) {
      setNotice({ type: "error", text: error.message });
      return;
    }
    if (!reviewedRow) {
      setNotice({
        type: "info",
        text: "ใบสมัครนี้ถูกตรวจโดยผู้ใช้อื่นแล้ว กำลังโหลดสถานะล่าสุด",
      });
      await loadWorkspace();
      return;
    }

    await addActivity(
      application,
      `application_${decision}`,
      decision === "approved"
        ? "อนุมัติใบสมัครเข้าสู่ขั้น Screening"
        : "ปฏิเสธใบสมัคร",
      { review_status: decision },
    );
    setNotice({
      type: "success",
      text:
        decision === "approved" ? "อนุมัติใบสมัครแล้ว" : "ปฏิเสธใบสมัครแล้ว",
    });
    await loadWorkspace();
  };

  const markNotificationRead = async (notification: Record<string, any>) => {
    if (notification.read_at) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from("ats_notifications")
      .update({ read_at: readAt })
      .eq("id", notification.id);
    if (error) {
      setNotice({ type: "error", text: error.message });
      return;
    }
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read_at: readAt } : item,
      ),
    );
  };

  const columns = BOARD_COLUMNS.map((column) => ({
    ...column,
    applications: filteredApplications.filter((application) =>
      (column.stages as readonly string[]).includes(application.stage),
    ),
  }));

  return (
    <div className="mx-auto max-w-400 space-y-6 p-4 text-slate-200 sm:p-6 xl:p-8">
      <header className="flex flex-col gap-5 border-b border-[#253044] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-emerald-400">
            Talent acquisition
          </p>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Candidate pipeline
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Manage requisitions, candidate stages, interviews, and offers in one
            workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            aria-expanded={showNotifications}
            className="relative inline-flex items-center gap-2 rounded-lg border border-[#2A3548] px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5"
            onClick={() => setShowNotifications((current) => !current)}
            type="button"
          >
            <Bell size={16} /> Inbox
            {unreadNotificationCount > 0 && (
              <span className="min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                {unreadNotificationCount}
              </span>
            )}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[#2A3548] px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5"
            onClick={() => setShowTemplates((current) => !current)}
            type="button"
          >
            <FileSpreadsheet size={16} /> Templates & import
            <ChevronDown
              className={`transition-transform ${showTemplates ? "rotate-180" : ""}`}
              size={14}
            />
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[#2A3548] px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5"
            disabled={!hasATSAccess}
            onClick={() => setJobDialogOpen(true)}
            type="button"
          >
            <BriefcaseBusiness size={16} /> New requisition
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2.5 text-sm font-semibold text-[#06120D] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasATSAccess || openJobs.length === 0}
            onClick={() => {
              setCandidateConsent(false);
              setCandidateDialogOpen(true);
            }}
            title={
              openJobs.length === 0
                ? "Create an open requisition first"
                : undefined
            }
            type="button"
          >
            <UserRoundPlus size={16} /> Add applicant
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
            notice.type === "error"
              ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
              : notice.type === "success"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                : "border-sky-500/25 bg-sky-500/10 text-sky-200"
          }`}
          role="status"
        >
          {notice.type === "error" ? (
            <CircleAlert size={17} />
          ) : (
            <Check size={17} />
          )}
          <span>{notice.text}</span>
          {notice.type === "error" &&
            notice.text.includes("ดาวน์โหลด schema SQL") && (
              <a
                className="ml-auto shrink-0 underline underline-offset-4"
                href="/api/ats-schema"
                download
              >
                Schema SQL
              </a>
            )}
        </div>
      )}

      {showNotifications && (
        <section
          aria-label="Admin application notifications"
          className="space-y-3 rounded-lg border border-[#253044] bg-[#111926] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Admin inbox</h2>
              <p className="mt-1 text-xs text-slate-500">
                New public applications appear here automatically.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Refreshes every 30 sec
            </span>
          </div>
          {notifications.length === 0 ? (
            <p className="rounded-md border border-[#253044] px-3 py-5 text-center text-xs text-slate-500">
              No application notifications.
            </p>
          ) : (
            <ul className="divide-y divide-[#253044]">
              {notifications.map((notification) => (
                <li
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={notification.id}
                >
                  <button
                    className="min-w-0 text-left"
                    onClick={() => {
                      void markNotificationRead(notification);
                      const application = applications.find(
                        (item) => item.id === notification.application_id,
                      );
                      if (application) void openApplicationDetails(application);
                    }}
                    type="button"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-white">
                      {!notification.read_at && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      )}
                      {notification.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {notification.message}
                    </span>
                    <time className="mt-1 block text-[11px] text-slate-600">
                      {new Date(notification.created_at).toLocaleString(
                        "en-GB",
                      )}
                    </time>
                  </button>
                  {!notification.read_at && (
                    <button
                      className="self-start text-xs text-emerald-300 hover:text-emerald-200 sm:self-auto"
                      onClick={() => void markNotificationRead(notification)}
                      type="button"
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section
        aria-label="Recruitment overview"
        className="grid grid-cols-2 gap-3 lg:grid-cols-5"
      >
        {[
          {
            label: "Open requisitions",
            value: openJobs.length,
            icon: BriefcaseBusiness,
            tone: "text-sky-300",
          },
          {
            label: "Active applications",
            value: activeApplications,
            icon: UsersRound,
            tone: "text-emerald-300",
          },
          {
            label: "Pending review",
            value: pendingReviewCount,
            icon: UserCheck,
            tone: "text-rose-300",
          },
          {
            label: "Scheduled interviews",
            value: scheduledInterviewCount,
            icon: CalendarClock,
            tone: "text-amber-300",
          },
          {
            label: "Offers in progress",
            value: pendingOfferCount,
            icon: Activity,
            tone: "text-orange-300",
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-lg border border-[#253044] bg-[#111926] p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-400 sm:text-sm">
                  {metric.label}
                </p>
                <Icon className={metric.tone} size={17} />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-white sm:text-3xl">
                {loading ? (
                  <span className="inline-block h-8 w-10 animate-pulse rounded bg-white/5" />
                ) : (
                  metric.value.toLocaleString()
                )}
              </p>
            </div>
          );
        })}
      </section>

      {showTemplates && (
        <section className="space-y-4 rounded-lg border border-[#253044] bg-[#111926] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="font-semibold text-white">ATS import templates</h2>
              <p className="mt-1 text-sm text-slate-400">
                ดาวน์โหลด template เปล่าแล้วกรอกข้อมูล โดยนำเข้า Jobs และ
                Candidates ก่อน Applications
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white">
              {importing ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              {importing ? "Importing..." : "Import CSV / Excel"}
              <input
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                disabled={!hasATSAccess || importing}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImport(file);
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <a
                  className="group flex items-start gap-3 rounded-lg border border-[#29364B] bg-[#0B1220] p-4 transition hover:border-emerald-500/40 hover:bg-emerald-500/3"
                  download={template.filename}
                  href={template.href}
                  key={template.filename}
                >
                  <span className="rounded-md bg-emerald-500/10 p-2 text-emerald-300">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">
                      {template.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                      {template.description}
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                      <Download size={13} /> Download CSV
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
          <p className="flex items-start gap-2 text-xs leading-5 text-amber-200/80">
            <CircleAlert className="mt-0.5 shrink-0" size={14} />
            เก็บรหัส code เป็นข้อความและไม่เปลี่ยนชื่อคอลัมน์
            ผู้สมัครและใบสมัครมีข้อมูลส่วนบุคคล ให้จำกัดสิทธิ์และเก็บตามนโยบาย
            PDPA
          </p>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Applications by stage
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {filteredApplications.length.toLocaleString()} applications in
              current view
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-72">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                className={`${FIELD_CLASS} pl-9`}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search candidate, role, source"
                value={searchTerm}
              />
            </label>
            <label className="relative sm:w-56">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={15}
              />
              <select
                className={`${FIELD_CLASS} appearance-none pl-9 pr-8`}
                onChange={(event) => setJobFilter(event.target.value)}
                value={jobFilter}
              >
                <option value="all">All requisitions</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.job_code} · {job.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center rounded-lg border border-[#253044] bg-[#111926] text-sm text-slate-400">
            <LoaderCircle className="mr-2 animate-spin" size={18} /> Loading ATS
            workspace...
          </div>
        ) : notice?.type === "error" &&
          applications.length === 0 &&
          jobs.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-[#253044] bg-[#111926] px-6 text-center">
            <CircleAlert className="mb-3 text-amber-300" size={24} />
            <p className="text-sm font-medium text-white">
              {notice.text.includes("ยังไม่มี ATS role")
                ? "ATS access is not provisioned"
                : notice.text.includes("เซสชันหมดอายุ")
                  ? "Sign in to continue"
                  : "ATS workspace is not connected yet"}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              {notice.text}
            </p>
          </div>
        ) : (
          <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-3">
            {columns.map((column) => (
              <section
                className="min-h-72 rounded-lg border border-[#253044] bg-[#0E1522]"
                key={column.id}
              >
                <header className="flex items-center justify-between border-b border-[#253044] px-3.5 py-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    {column.label}
                  </h3>
                  <span className="min-w-7 rounded-full bg-white/5 px-2 py-0.5 text-center text-xs tabular-nums text-slate-400">
                    {column.applications.length}
                  </span>
                </header>
                <div className="space-y-2.5 p-2.5">
                  {column.applications.map((application) => (
                    <article
                      className="rounded-lg border border-[#2A3548] bg-[#111926] p-3.5 transition hover:border-slate-500/60"
                      key={application.id}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-white">
                            {application.candidate?.full_name ||
                              "Candidate profile missing"}
                          </h4>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {application.job?.title || "Unknown requisition"}
                          </p>
                        </div>
                        <button
                          aria-label={`Open ${application.candidate?.full_name || "candidate"} details`}
                          className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
                          onClick={() =>
                            void openApplicationDetails(application)
                          }
                          type="button"
                        >
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                        {application.candidate?.email && (
                          <p className="flex min-w-0 items-center gap-1.5 truncate">
                            <Mail size={12} />
                            {application.candidate.email}
                          </p>
                        )}
                        <p className="flex min-w-0 items-center gap-1.5 truncate">
                          <BriefcaseBusiness size={12} />
                          {application.job?.job_code ||
                            application.application_code}
                        </p>
                        {application.candidate?.location && (
                          <p className="flex min-w-0 items-center gap-1.5 truncate">
                            <MapPin size={12} />
                            {application.candidate.location}
                          </p>
                        )}
                        <p className="flex min-w-0 items-center gap-1.5 truncate">
                          <Activity size={12} />
                          {application.source || "Source not recorded"}
                        </p>
                        {application.next_action_at && (
                          <p className="flex min-w-0 items-center gap-1.5 text-amber-300">
                            <Clock3 size={12} />
                            Next:{" "}
                            {new Date(
                              application.next_action_at,
                            ).toLocaleDateString("en-GB")}
                          </p>
                        )}
                      </div>
                      {application.review_status === "pending" && (
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#253044] pt-3">
                          <button
                            className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500/10 px-2 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                            onClick={() =>
                              void reviewApplication(application, "approved")
                            }
                            type="button"
                          >
                            <UserCheck size={14} /> Approve
                          </button>
                          <button
                            className="inline-flex items-center justify-center gap-1 rounded-md bg-rose-500/10 px-2 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                            onClick={() =>
                              void reviewApplication(application, "declined")
                            }
                            type="button"
                          >
                            <UserX size={14} /> Decline
                          </button>
                        </div>
                      )}
                      <div className="mt-3 border-t border-[#253044] pt-3">
                        <label
                          className="sr-only"
                          htmlFor={`stage-${application.id}`}
                        >
                          Application stage
                        </label>
                        <select
                          className="w-full rounded-md border border-[#2A3548] bg-[#0B1220] px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                          id={`stage-${application.id}`}
                          onChange={(event) =>
                            void changeStage(application, event.target.value)
                          }
                          disabled={application.review_status !== "approved"}
                          value={application.stage}
                        >
                          {STAGES.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}
                  {column.applications.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-slate-600">
                      No applications
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-[#253044] bg-[#111926]">
        <div className="flex flex-col gap-3 border-b border-[#253044] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Job requisitions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Openings and hiring ownership
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2A3548] px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            disabled={!hasATSAccess}
            onClick={() => setJobDialogOpen(true)}
            type="button"
          >
            <Plus size={15} /> Create requisition
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-5xl text-left text-sm">
            <thead className="bg-[#0D1420] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Requisition</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Recruiter</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Applicant link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#253044]">
              {jobs.map((job) => (
                <tr className="hover:bg-white/2" key={job.id}>
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-white">{job.title}</span>
                    <span className="mt-1 block font-mono text-xs text-slate-500">
                      {job.job_code} · {job.headcount} opening
                      {job.headcount === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {job.department || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {job.location || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400">
                    {job.recruiter_email || "Unassigned"}
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      className="rounded-md border border-[#2A3548] bg-[#0B1220] px-2 py-1.5 text-xs text-slate-200"
                      disabled={!hasATSAccess}
                      onChange={(event) =>
                        void updateJobStatus(job, event.target.value)
                      }
                      value={job.status}
                    >
                      <option value="open">Open</option>
                      <option value="on_hold">On hold</option>
                      <option value="closed">Closed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="min-w-80 px-4 py-3.5">
                    {applicationLinks[job.id] ? (
                      <div className="flex min-w-72 items-center gap-2">
                        <input
                          aria-label={`Application link for ${job.job_code}`}
                          className="min-w-0 flex-1 rounded-md border border-[#2A3548] bg-[#0B1220] px-2 py-1.5 font-mono text-[11px] text-slate-300"
                          readOnly
                          value={applicationLinks[job.id]}
                        />
                        <button
                          aria-label={`Copy application link for ${job.job_code}`}
                          className="rounded-md border border-[#2A3548] p-2 text-slate-300 hover:bg-white/5"
                          onClick={() =>
                            void copyApplicationLink(applicationLinks[job.id])
                          }
                          title="Copy application link"
                          type="button"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#2A3548] px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={
                          !hasATSAccess ||
                          job.status !== "open" ||
                          Boolean(
                            job.close_date &&
                            job.close_date <
                              new Date().toISOString().slice(0, 10),
                          )
                        }
                        onClick={() => void createApplicationLink(job)}
                        type="button"
                      >
                        <Link2 size={13} /> Generate link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && jobs.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm text-slate-500"
                    colSpan={6}
                  >
                    No requisitions yet. Create a job or import the jobs
                    template.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <CircleAlert className="mt-0.5 shrink-0" size={14} />
        Applicant contact details, interview feedback, and compensation are
        confidential. Use only approved recruiting access and record candidate
        consent before retaining profile data.
      </p>

      {jobDialogOpen && (
        <Dialog
          onClose={() => setJobDialogOpen(false)}
          title="Create job requisition"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => void createJob(event)}
          >
            <label className="block text-sm text-slate-300">
              Job title <span className="text-rose-300">*</span>
              <input
                className={`${FIELD_CLASS} mt-1.5`}
                onChange={(event) =>
                  setJobForm({ ...jobForm, title: event.target.value })
                }
                required
                value={jobForm.title}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Department
                <input
                  className={`${FIELD_CLASS} mt-1.5`}
                  onChange={(event) =>
                    setJobForm({ ...jobForm, department: event.target.value })
                  }
                  value={jobForm.department}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Location
                <input
                  className={`${FIELD_CLASS} mt-1.5`}
                  onChange={(event) =>
                    setJobForm({ ...jobForm, location: event.target.value })
                  }
                  value={jobForm.location}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Recruiter email
                <input
                  autoComplete="email"
                  className={`${FIELD_CLASS} mt-1.5`}
                  onChange={(event) =>
                    setJobForm({
                      ...jobForm,
                      recruiter_email: event.target.value,
                    })
                  }
                  type="email"
                  value={jobForm.recruiter_email}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Hiring manager email
                <input
                  autoComplete="email"
                  className={`${FIELD_CLASS} mt-1.5`}
                  onChange={(event) =>
                    setJobForm({
                      ...jobForm,
                      hiring_manager_email: event.target.value,
                    })
                  }
                  type="email"
                  value={jobForm.hiring_manager_email}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Employment type
                <select
                  className={`${FIELD_CLASS} mt-1.5`}
                  onChange={(event) =>
                    setJobForm({
                      ...jobForm,
                      employment_type: event.target.value,
                    })
                  }
                  value={jobForm.employment_type}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Temporary</option>
                  <option>Internship</option>
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Headcount
                <input
                  className={`${FIELD_CLASS} mt-1.5`}
                  min="1"
                  onChange={(event) =>
                    setJobForm({ ...jobForm, headcount: event.target.value })
                  }
                  required
                  type="number"
                  value={jobForm.headcount}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#253044] pt-4">
              <button
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                onClick={() => setJobDialogOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#06120D] disabled:opacity-50"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving..." : "Create requisition"}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {candidateDialogOpen && (
        <Dialog
          onClose={() => {
            setCandidateDialogOpen(false);
            setCandidateConsent(false);
          }}
          title="Add applicant"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => void createApplication(event)}
          >
            <label className="block text-sm text-slate-300">
              Full name <span className="text-rose-300">*</span>
              <input
                autoFocus
                className={`${FIELD_CLASS} mt-1.5`}
                onChange={(event) =>
                  setCandidateForm({
                    ...candidateForm,
                    full_name: event.target.value,
                  })
                }
                required
                value={candidateForm.full_name}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Email <span className="text-rose-300">*</span>
                <input
                  className={`${FIELD_CLASS} mt-1.5`}
                  onChange={(event) =>
                    setCandidateForm({
                      ...candidateForm,
                      email: event.target.value,
                    })
                  }
                  required
                  type="email"
                  value={candidateForm.email}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Phone
                <input
                  className={`${FIELD_CLASS} mt-1.5`}
                  onChange={(event) =>
                    setCandidateForm({
                      ...candidateForm,
                      phone: event.target.value,
                    })
                  }
                  type="tel"
                  value={candidateForm.phone}
                />
              </label>
            </div>
            <label className="block text-sm text-slate-300">
              Requisition <span className="text-rose-300">*</span>
              <select
                className={`${FIELD_CLASS} mt-1.5`}
                onChange={(event) =>
                  setCandidateForm({
                    ...candidateForm,
                    job_id: event.target.value,
                  })
                }
                required
                value={candidateForm.job_id}
              >
                <option value="">Select open requisition</option>
                {openJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.job_code} · {job.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              Candidate source
              <select
                className={`${FIELD_CLASS} mt-1.5`}
                onChange={(event) =>
                  setCandidateForm({
                    ...candidateForm,
                    source: event.target.value,
                  })
                }
                value={candidateForm.source}
              >
                <option>Company website</option>
                <option>Employee referral</option>
                <option>Job board</option>
                <option>Recruitment agency</option>
                <option>Social media</option>
                <option>Career fair</option>
                <option>Other</option>
              </select>
            </label>
            <label className="flex items-start gap-2.5 rounded-lg border border-[#2A3548] bg-[#0B1220] p-3 text-xs leading-5 text-slate-300">
              <input
                checked={candidateConsent}
                className="mt-0.5 accent-emerald-500"
                onChange={(event) => setCandidateConsent(event.target.checked)}
                type="checkbox"
              />
              <span>
                I confirm that the candidate has received the applicable privacy
                notice and consented to recruitment data processing.
              </span>
            </label>
            <div className="flex justify-end gap-2 border-t border-[#253044] pt-4">
              <button
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                onClick={() => {
                  setCandidateDialogOpen(false);
                  setCandidateConsent(false);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#06120D] disabled:opacity-50"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving..." : "Create application"}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {activeApplication && (
        <Dialog
          onClose={() => setActiveApplicationId(null)}
          title="Application details"
          wide
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="space-y-4">
              <div className="rounded-lg border border-[#263246] bg-[#0B1220] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {activeApplication.candidate?.full_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {activeApplication.job?.title} ·{" "}
                      {activeApplication.job?.job_code}
                    </p>
                  </div>
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                    {stageLabel(activeApplication.stage)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                  <p className="text-xs text-slate-400">
                    Application review: {activeApplication.review_status}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-500" />
                    {activeApplication.candidate?.email || "No email"}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-500" />
                    {activeApplication.candidate?.location ||
                      "Location not recorded"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Source: {activeApplication.source || "Not recorded"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Applied:{" "}
                    {new Date(activeApplication.applied_at).toLocaleDateString(
                      "en-GB",
                    )}
                  </p>
                </div>
                {activeApplication.candidate?.resume_url && (
                  <a
                    className="mt-3 inline-block text-sm text-emerald-300 underline underline-offset-4"
                    href={activeApplication.candidate.resume_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open resume
                  </a>
                )}
              </div>
              <div className="rounded-lg border border-[#263246] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <CalendarClock size={16} className="text-amber-300" />{" "}
                  Schedule interview
                </h3>
                {activeApplication.review_status !== "approved" && (
                  <p className="mb-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                    Approve this application before scheduling an interview.
                  </p>
                )}
                <form
                  className="grid gap-3 sm:grid-cols-2"
                  onSubmit={(event) => void scheduleInterview(event)}
                >
                  <label className="text-xs text-slate-400">
                    Date and time
                    <input
                      className={`${FIELD_CLASS} mt-1`}
                      onChange={(event) =>
                        setInterviewForm({
                          ...interviewForm,
                          starts_at: event.target.value,
                        })
                      }
                      required
                      type="datetime-local"
                      value={interviewForm.starts_at}
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Format
                    <select
                      className={`${FIELD_CLASS} mt-1`}
                      onChange={(event) =>
                        setInterviewForm({
                          ...interviewForm,
                          interview_type: event.target.value,
                        })
                      }
                      value={interviewForm.interview_type}
                    >
                      <option value="video">Video</option>
                      <option value="onsite">On-site</option>
                      <option value="phone">Phone</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-400">
                    Duration (minutes)
                    <input
                      className={`${FIELD_CLASS} mt-1`}
                      max="480"
                      min="15"
                      onChange={(event) =>
                        setInterviewForm({
                          ...interviewForm,
                          duration_minutes: event.target.value,
                        })
                      }
                      required
                      type="number"
                      value={interviewForm.duration_minutes}
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Interviewer email
                    <input
                      className={`${FIELD_CLASS} mt-1`}
                      onChange={(event) =>
                        setInterviewForm({
                          ...interviewForm,
                          interviewer_email: event.target.value,
                        })
                      }
                      type="email"
                      value={interviewForm.interviewer_email}
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Meeting link / location
                    <input
                      className={`${FIELD_CLASS} mt-1`}
                      onChange={(event) =>
                        setInterviewForm({
                          ...interviewForm,
                          location_or_link: event.target.value,
                        })
                      }
                      value={interviewForm.location_or_link}
                    />
                  </label>
                  <button
                    className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-[#171006] disabled:opacity-50 sm:col-span-2"
                    disabled={
                      saving || activeApplication.review_status !== "approved"
                    }
                    type="submit"
                  >
                    {saving
                      ? "Saving..."
                      : activeApplication.review_status !== "approved"
                        ? "Approve application first"
                        : "Schedule interview"}
                  </button>
                </form>
                {interviews.length > 0 && (
                  <ul className="mt-3 divide-y divide-[#253044]">
                    {interviews.map((interview) => (
                      <li className="py-3" key={interview.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-300">
                            {new Date(interview.starts_at).toLocaleString(
                              "en-GB",
                            )}{" "}
                            · {interview.interview_type} ·{" "}
                            {interview.duration_minutes} min
                          </p>
                          {interview.invitation_sent_at ? (
                            <span className="text-[11px] text-emerald-300">
                              Invitation sent
                            </span>
                          ) : interview.status === "scheduled" ? (
                            <button
                              className="rounded-md border border-[#2A3548] px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-white/5"
                              onClick={() =>
                                void sendInterviewInvitation(interview.id)
                              }
                              type="button"
                            >
                              Send invitation
                            </button>
                          ) : null}
                        </div>
                        <form
                          className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_150px_auto]"
                          onSubmit={(event) =>
                            void saveInterviewEvaluation(event, interview)
                          }
                        >
                          <label
                            className="sr-only"
                            htmlFor={`feedback-${interview.id}`}
                          >
                            Interview feedback
                          </label>
                          <input
                            className={`${FIELD_CLASS} text-xs`}
                            defaultValue={interview.feedback || ""}
                            id={`feedback-${interview.id}`}
                            name="feedback"
                            placeholder="Feedback / evaluation notes"
                          />
                          <label
                            className="sr-only"
                            htmlFor={`score-${interview.id}`}
                          >
                            Score out of five
                          </label>
                          <input
                            className={`${FIELD_CLASS} text-xs`}
                            defaultValue={interview.score ?? ""}
                            id={`score-${interview.id}`}
                            max="5"
                            min="1"
                            name="score"
                            placeholder="Score / 5"
                            step="0.5"
                            type="number"
                          />
                          <label
                            className="sr-only"
                            htmlFor={`interview-status-${interview.id}`}
                          >
                            Interview status
                          </label>
                          <select
                            className={`${FIELD_CLASS} text-xs`}
                            defaultValue={interview.status}
                            id={`interview-status-${interview.id}`}
                            name="status"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No-show</option>
                          </select>
                          <button
                            className="rounded-lg border border-[#2A3548] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
                            type="submit"
                          >
                            Save
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
            <section className="space-y-4">
              <div className="rounded-lg border border-[#263246] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <BriefcaseBusiness size={16} className="text-emerald-300" />{" "}
                  Create offer draft
                </h3>
                {activeApplication.review_status !== "approved" && (
                  <p className="mb-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                    Approve this application before creating an offer.
                  </p>
                )}
                <form
                  className="grid gap-3 sm:grid-cols-2"
                  onSubmit={(event) => void createOffer(event)}
                >
                  <label className="text-xs text-slate-400">
                    Base salary
                    <input
                      className={`${FIELD_CLASS} mt-1`}
                      min="0"
                      onChange={(event) =>
                        setOfferForm({
                          ...offerForm,
                          salary_amount: event.target.value,
                        })
                      }
                      required
                      type="number"
                      value={offerForm.salary_amount}
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Currency
                    <input
                      className={`${FIELD_CLASS} mt-1 uppercase`}
                      maxLength={3}
                      onChange={(event) =>
                        setOfferForm({
                          ...offerForm,
                          currency_code: event.target.value,
                        })
                      }
                      required
                      value={offerForm.currency_code}
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Pay period
                    <select
                      className={`${FIELD_CLASS} mt-1`}
                      onChange={(event) =>
                        setOfferForm({
                          ...offerForm,
                          salary_period: event.target.value,
                        })
                      }
                      value={offerForm.salary_period}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-400">
                    Offer expiry
                    <input
                      className={`${FIELD_CLASS} mt-1`}
                      onChange={(event) =>
                        setOfferForm({
                          ...offerForm,
                          expires_at: event.target.value,
                        })
                      }
                      type="date"
                      value={offerForm.expires_at}
                    />
                  </label>
                  <button
                    className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-[#06120D] disabled:opacity-50 sm:col-span-2"
                    disabled={
                      saving || activeApplication.review_status !== "approved"
                    }
                    type="submit"
                  >
                    {saving
                      ? "Saving..."
                      : activeApplication.review_status !== "approved"
                        ? "Approve application first"
                        : "Save offer draft"}
                  </button>
                </form>
                {offers.length > 0 && (
                  <ul className="mt-3 divide-y divide-[#253044]">
                    {offers.map((offer) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                        key={offer.id}
                      >
                        <span className="text-xs text-slate-300">
                          {Number(offer.salary_amount).toLocaleString()}{" "}
                          {offer.currency_code} / {offer.salary_period}
                        </span>
                        <select
                          aria-label="Offer status"
                          className="rounded border border-[#2A3548] bg-[#0B1220] px-2 py-1 text-xs text-slate-200"
                          onChange={(event) =>
                            void updateOfferStatus(offer.id, event.target.value)
                          }
                          value={offer.status}
                        >
                          <option value="draft">Draft</option>
                          <option value="pending_approval">
                            Pending approval
                          </option>
                          <option value="sent">Sent</option>
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                          <option value="withdrawn">Withdrawn</option>
                          <option value="expired">Expired</option>
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-[#263246] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <Activity size={16} className="text-sky-300" /> Activity
                  history
                </h3>
                {activity.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No activity recorded yet.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {activity.map((entry) => (
                      <li
                        className="border-l border-[#334155] pl-3"
                        key={entry.id}
                      >
                        <p className="text-xs text-slate-200">
                          {entry.summary}
                        </p>
                        <time className="mt-1 block text-[11px] text-slate-500">
                          {new Date(entry.created_at).toLocaleString("en-GB")}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>
          </div>
        </Dialog>
      )}
    </div>
  );
}
