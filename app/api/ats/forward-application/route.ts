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

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!accessToken || !supabaseUrl || !anonKey) {
    return Response.json(
      { error: "Authentication is required" },
      { status: 401 },
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } =
    await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return Response.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }
  const { data: roles, error: roleError } = await supabase
    .from("ats_user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .in("role", ["admin", "recruiter"]);
  if (roleError || !roles?.length) {
    return Response.json(
      { error: "ATS recruiter access is required" },
      { status: 403 },
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const hrEmail = process.env.HR_RECRUITMENT_EMAIL?.trim();
  if (!resendApiKey || !fromEmail || !hrEmail) {
    return Response.json(
      {
        error:
          "HR handoff email is not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and HR_RECRUITMENT_EMAIL on the server.",
      },
      { status: 503 },
    );
  }
  if (/your_key|placeholder|example/i.test(resendApiKey)) {
    return Response.json(
      {
        error:
          "RESEND_API_KEY is still a placeholder. Add a valid Resend API key to .env.local, then restart the dev server.",
      },
      { status: 503 },
    );
  }

  let body: { applicationId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const applicationId = String(body.applicationId || "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      applicationId,
    )
  ) {
    return Response.json(
      { error: "Application ID is invalid" },
      { status: 400 },
    );
  }

  const { data: application, error: applicationError } = await supabase
    .from("ats_applications")
    .select(
      "id,application_code,stage,review_status,candidate_id,job_id,applied_at,candidate_details",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError || !application) {
    return Response.json(
      { error: applicationError?.message || "Application not found" },
      { status: 404 },
    );
  }
  if (
    application.stage !== "hired" ||
    application.review_status !== "approved"
  ) {
    return Response.json(
      { error: "Only an approved, hired application can be forwarded to HR" },
      { status: 409 },
    );
  }

  const [candidateResult, jobResult] = await Promise.all([
    supabase
      .from("ats_candidates")
      .select(
        "candidate_code,full_name,email,phone,location,linkedin_url,resume_url,consent_status",
      )
      .eq("id", application.candidate_id)
      .maybeSingle(),
    supabase
      .from("ats_jobs")
      .select("job_code,title,department,location,employment_type")
      .eq("id", application.job_id)
      .maybeSingle(),
  ]);
  const candidate = candidateResult.data;
  const job = jobResult.data;
  if (candidateResult.error || jobResult.error || !candidate || !job) {
    return Response.json(
      {
        error:
          candidateResult.error?.message ||
          jobResult.error?.message ||
          "Candidate or requisition details are missing",
      },
      { status: 404 },
    );
  }
  if (candidate.consent_status !== "consented") {
    return Response.json(
      { error: "Candidate consent is not recorded; HR handoff is blocked" },
      { status: 409 },
    );
  }

  const details =
    application.candidate_details &&
    typeof application.candidate_details === "object"
      ? (application.candidate_details as Record<string, unknown>)
      : {};
  const detailEntries = Object.entries(details).filter(
    ([, value]) => value !== null && value !== "",
  );
  const detailText = detailEntries
    .map(
      ([key, value]) =>
        `${key.replace(/[._]+/g, " ")}: ${Array.isArray(value) ? value.join(", ") : String(value)}`,
    )
    .join("\n");
  const rows = [
    ["Application", application.application_code],
    ["Candidate code", candidate.candidate_code],
    ["Candidate", candidate.full_name],
    ["Email", candidate.email || "-"],
    ["Phone", candidate.phone || "-"],
    ["Location", candidate.location || "-"],
    ["LinkedIn", candidate.linkedin_url || "-"],
    ["Resume", candidate.resume_url || "-"],
    ["Position", `${job.title} (${job.job_code})`],
    ["Department", job.department || "-"],
    ["Employment type", job.employment_type || "-"],
    [
      "Applied at",
      new Date(application.applied_at).toLocaleString("en-GB", {
        timeZone: "Asia/Bangkok",
      }),
    ],
    ...detailEntries.map(([key, value]) => [
      key.replace(/[._]+/g, " "),
      Array.isArray(value) ? value.join(", ") : String(value),
    ]),
  ];
  const text = [
    `Hired candidate handoff: ${candidate.full_name}`,
    `Position: ${job.title} (${job.job_code})`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Applicant consent is recorded in the ATS. Please access the ATS for the authoritative application record and linked resume.",
  ].join("\n");
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th style="background:#eff6ff;text-align:left;padding:8px;border:1px solid #bfdbfe">${escapeHtml(label)}</th><td style="padding:8px;border:1px solid #bfdbfe;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#18212f;line-height:1.5"><h2>Hired candidate handoff</h2><p>Application ${escapeHtml(application.application_code)} · ${escapeHtml(job.title)} (${escapeHtml(job.job_code)})</p><table style="width:100%;border-collapse:collapse">${htmlRows}</table><p>Applicant consent is recorded in the ATS. Please use the ATS as the authoritative application record.</p></div>`;
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `riverpro-hr-handoff-${application.id}-${Date.now()}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [hrEmail],
      subject: `Hired candidate: ${candidate.full_name} · ${job.title} · ${application.application_code}`,
      text,
      html,
    }),
  });
  if (!resendResponse.ok) {
    const result = await resendResponse.json().catch(() => ({}));
    return Response.json(
      {
        error:
          result.message ||
          "The email provider could not forward the application",
      },
      { status: 502 },
    );
  }

  const resendResult = await resendResponse.json().catch(() => ({}));
  const { error: activityError } = await supabase.from("ats_activity").insert({
    application_id: application.id,
    candidate_id: application.candidate_id,
    job_id: application.job_id,
    event_type: "application_forwarded_to_hr",
    summary: `ส่งใบสมัคร ${application.application_code} ให้ HR แล้ว`,
    metadata: { email_id: resendResult.id || null },
  });
  if (activityError)
    console.error("HR handoff email sent, but activity logging failed");
  return Response.json({ sent: true, recipient: hrEmail });
}
