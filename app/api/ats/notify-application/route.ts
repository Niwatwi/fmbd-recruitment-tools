import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const detailValue = (value: unknown) =>
  Array.isArray(value) ? value.join(", ") : String(value ?? "");

export async function POST(request: Request) {
  let body: {
    jobCode?: string;
    token?: string;
    applicationCode?: string;
    applicantEmail?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const jobCode = String(body.jobCode || "")
    .trim()
    .toUpperCase();
  const token = String(body.token || "");
  const applicationCode = String(body.applicationCode || "")
    .trim()
    .toUpperCase();
  const applicantEmail = String(body.applicantEmail || "")
    .trim()
    .toLowerCase();
  if (
    !jobCode ||
    !/^[a-f0-9]{64}$/.test(token) ||
    (applicationCode && !/^APP-[A-F0-9]{12}$/.test(applicationCode)) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail)
  ) {
    return Response.json(
      { error: "Application notification details are invalid" },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const hrEmail = process.env.HR_RECRUITMENT_EMAIL?.trim();
  if (!supabaseUrl || !anonKey || !resendApiKey || !fromEmail || !hrEmail) {
    return Response.json(
      {
        error:
          "ใบสมัครบันทึกแล้ว แต่ยังไม่ได้ตั้งค่าอีเมลแจ้ง HR ให้ครบ: RESEND_API_KEY, RESEND_FROM_EMAIL และ HR_RECRUITMENT_EMAIL",
      },
      { status: 503 },
    );
  }
  if (/your_key|placeholder|example/i.test(resendApiKey)) {
    return Response.json(
      {
        error:
          "RESEND_API_KEY ยังเป็นค่า placeholder กรุณาตั้งค่า API key ที่ใช้งานได้บน server",
      },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: result, error: lookupError } = await supabase.rpc(
    "ats_get_public_application_notification",
    {
      p_job_code: jobCode,
      p_token: token,
      p_application_code: applicationCode,
      p_applicant_email: applicantEmail,
    },
  );
  const application = Array.isArray(result) ? result[0] : null;
  if (lookupError || !application) {
    const functionMissing =
      lookupError?.code === "PGRST202" ||
      lookupError?.message?.includes("ats_get_public_application_notification");
    return Response.json(
      {
        error: functionMissing
          ? "ใบสมัครบันทึกแล้ว แต่ Supabase ยังไม่มีฟังก์ชันแจ้ง HR เวอร์ชันล่าสุด กรุณารันส่วน ats_get_public_application_notification จาก supabase/ats_schema.sql แล้วลองส่งใหม่"
          : lookupError?.message ||
            "ไม่พบใบสมัครที่ตรงกับลิงก์และข้อมูลผู้สมัคร",
      },
      { status: functionMissing ? 503 : 404 },
    );
  }

  const details =
    application.candidate_details &&
    typeof application.candidate_details === "object"
      ? (application.candidate_details as Record<string, unknown>)
      : {};
  const rows: [string, string][] = [
    ["Application code", application.application_code],
    ["Candidate", application.candidate_name],
    ["Applicant email", application.candidate_email],
    ["Phone", application.candidate_phone || "-"],
    ["Location", application.candidate_location || "-"],
    ["Position", `${application.job_title} (${application.job_code})`],
    ["Department", application.department || "-"],
    ["Employment type", application.employment_type || "-"],
    ["LinkedIn", application.linkedin_url || "-"],
    ["Resume / portfolio", application.resume_url || "-"],
    ...Object.entries(details)
      .filter(([, value]) => value !== null && value !== "")
      .map(
        ([key, value]) =>
          [key.replace(/[._]+/g, " "), detailValue(value)] as [string, string],
      ),
  ];
  const text = [
    `ใบสมัครใหม่: ${application.candidate_name}`,
    `ตำแหน่ง: ${application.job_title} (${application.job_code})`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "เปิดดูใบสมัครและดำเนินการได้ใน Talent Pipeline Inbox",
  ].join("\n");
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th style="background:#eff6ff;text-align:left;padding:8px;border:1px solid #bfdbfe">${escapeHtml(label)}</th><td style="padding:8px;border:1px solid #bfdbfe;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#18212f;line-height:1.5"><h2>ใบสมัครใหม่รอตรวจสอบ</h2><p>${escapeHtml(application.candidate_name)} สมัครตำแหน่ง ${escapeHtml(application.job_title)} (${escapeHtml(application.job_code)})</p><table style="width:100%;border-collapse:collapse">${htmlRows}</table><p>เปิด Talent Pipeline เพื่อดูสถานะและดำเนินการกับใบสมัคร</p></div>`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `riverpro-new-application-${application.application_id}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [hrEmail],
      subject: `ใบสมัครใหม่ ${application.candidate_name} · ${application.job_title} · ${application.application_code}`,
      text,
      html,
    }),
  });
  if (!resendResponse.ok) {
    const providerError = await resendResponse.json().catch(() => ({}));
    const providerMessage = String(providerError.message || "");
    const error =
      resendResponse.status === 401 ||
      /api key is invalid|invalid api key/i.test(providerMessage)
        ? "Resend rejected RESEND_API_KEY. Create a new API key in the correct Resend account, update the Vercel Production variable, then redeploy."
        : /domain.*(not verified|not allowed)|from.*(not verified|not allowed)/i.test(
              providerMessage,
            )
          ? "Resend rejected RESEND_FROM_EMAIL. Verify its sender domain in Resend and use an address on that domain, then redeploy."
          : providerMessage ||
            `ส่งอีเมลไม่สำเร็จ (Resend HTTP ${resendResponse.status})`;
    return Response.json(
      {
        error,
        applicationCode: application.application_code,
      },
      { status: 502 },
    );
  }

  return Response.json({
    sent: true,
    recipient: hrEmail,
    applicationCode: application.application_code,
  });
}
