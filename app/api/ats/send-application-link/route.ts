import { createHash, timingSafeEqual } from "node:crypto";
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
  if (!resendApiKey || !fromEmail) {
    return Response.json(
      {
        error:
          "Application link is ready, but email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL on the server.",
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

  let body: { jobCode?: string; applicationUrl?: string; recipient?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const jobCode = String(body.jobCode || "")
    .trim()
    .toUpperCase();
  const recipient = String(body.recipient || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return Response.json(
      { error: "Enter a valid applicant email address" },
      { status: 400 },
    );
  }

  let applicationUrl: URL;
  try {
    applicationUrl = new URL(String(body.applicationUrl || ""));
  } catch {
    return Response.json(
      { error: "Application link is invalid" },
      { status: 400 },
    );
  }
  const expectedPath = `/apply/${encodeURIComponent(jobCode)}`;
  const token = applicationUrl.searchParams.get("token") || "";
  if (
    applicationUrl.origin !== new URL(request.url).origin ||
    applicationUrl.pathname !== expectedPath ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return Response.json(
      { error: "Application link is invalid" },
      { status: 400 },
    );
  }

  const { data: job, error: jobError } = await supabase
    .from("ats_jobs")
    .select(
      "id,job_code,title,status,close_date,public_application_enabled,public_application_token_hash",
    )
    .eq("job_code", jobCode)
    .maybeSingle();
  if (jobError || !job) {
    return Response.json(
      { error: jobError?.message || "Requisition not found" },
      { status: 404 },
    );
  }
  const actualHash = createHash("sha256").update(token).digest();
  const expectedHash = Buffer.from(
    job.public_application_token_hash || "",
    "hex",
  );
  const tokenMatches =
    expectedHash.length === actualHash.length &&
    timingSafeEqual(expectedHash, actualHash);
  if (
    job.status !== "open" ||
    !job.public_application_enabled ||
    (job.close_date &&
      job.close_date < new Date().toISOString().slice(0, 10)) ||
    !tokenMatches
  ) {
    return Response.json(
      { error: "This application link has expired or been replaced" },
      { status: 409 },
    );
  }

  const title = escapeHtml(job.title);
  const escapedJobCode = escapeHtml(job.job_code);
  const escapedUrl = escapeHtml(applicationUrl.toString());
  const text = [
    "Dear applicant,",
    "",
    `You are invited to apply for ${job.title} (${job.job_code}) at Riverpro Intertrade Co., Ltd.`,
    `Complete your application securely here: ${applicationUrl.toString()}`,
    job.close_date ? `Application closes: ${job.close_date}` : "",
    "",
    "If you have questions, reply to this email to contact the recruitment team.",
  ]
    .filter(Boolean)
    .join("\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#18212f;line-height:1.6"><p>Dear applicant,</p><p>You are invited to apply for <strong>${title}</strong> (${escapedJobCode}) at Riverpro Intertrade Co., Ltd.</p><p><a href="${escapedUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Open application form</a></p>${job.close_date ? `<p>Application closes: ${escapeHtml(job.close_date)}</p>` : ""}<p>If you have questions, reply to this email to contact the recruitment team.</p></div>`;
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `riverpro-application-link-${job.id}-${actualHash.toString("hex").slice(0, 20)}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject: `Application invitation: ${job.title} at Riverpro`,
      text,
      html,
    }),
  });
  if (!resendResponse.ok) {
    const result = await resendResponse.json().catch(() => ({}));
    const providerMessage = String(result.message || "");
    const error =
      resendResponse.status === 401 ||
      /api key is invalid|invalid api key/i.test(providerMessage)
        ? "Resend rejected RESEND_API_KEY. Create a new API key in the correct Resend account, update the Vercel Production variable, then redeploy."
        : /domain.*(not verified|not allowed)|from.*(not verified|not allowed)/i.test(
              providerMessage,
            )
          ? "Resend rejected RESEND_FROM_EMAIL. Verify its sender domain in Resend and use an address on that domain, then redeploy."
          : providerMessage ||
            `The email provider could not send the application link (HTTP ${resendResponse.status})`;
    return Response.json(
      {
        error,
      },
      { status: 502 },
    );
  }

  const resendResult = await resendResponse.json().catch(() => ({}));
  await supabase.from("ats_activity").insert({
    job_id: job.id,
    event_type: "public_application_link_sent",
    summary: `ส่งลิงก์สมัครงาน ${job.job_code} ไปยัง ${recipient}`,
    metadata: { email_id: resendResult.id || null },
  });
  return Response.json({ sent: true, recipient });
}
