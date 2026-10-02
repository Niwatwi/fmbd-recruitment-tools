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
          "Interview is saved, but email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL on the server.",
      },
      { status: 503 },
    );
  }

  let body: { interviewId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.interviewId) {
    return Response.json(
      { error: "Interview ID is required" },
      { status: 400 },
    );
  }

  const { data: interview, error: interviewError } = await supabase
    .from("ats_interviews")
    .select(
      "id,application_id,starts_at,duration_minutes,interview_type,interviewer_email,location_or_link,status,invitation_sent_at",
    )
    .eq("id", body.interviewId)
    .maybeSingle();
  if (interviewError || !interview) {
    return Response.json(
      { error: interviewError?.message || "Interview not found" },
      { status: 404 },
    );
  }
  if (interview.status !== "scheduled") {
    return Response.json(
      { error: "Only scheduled interviews can be emailed" },
      { status: 409 },
    );
  }
  if (interview.invitation_sent_at) {
    return Response.json({ sent: true, alreadySent: true });
  }

  const { data: application, error: applicationError } = await supabase
    .from("ats_applications")
    .select("id,application_code,review_status,candidate_id,job_id")
    .eq("id", interview.application_id)
    .maybeSingle();
  if (applicationError || !application) {
    return Response.json(
      { error: applicationError?.message || "Application not found" },
      { status: 404 },
    );
  }
  if (application.review_status !== "approved") {
    return Response.json(
      {
        error: "Approve the application before sending an interview invitation",
      },
      { status: 409 },
    );
  }

  const [
    { data: candidate, error: candidateError },
    { data: job, error: jobError },
  ] = await Promise.all([
    supabase
      .from("ats_candidates")
      .select("full_name,email,consent_status")
      .eq("id", application.candidate_id)
      .maybeSingle(),
    supabase
      .from("ats_jobs")
      .select("title,job_code")
      .eq("id", application.job_id)
      .maybeSingle(),
  ]);
  if (candidateError || jobError || !candidate?.email || !job) {
    return Response.json(
      {
        error:
          candidateError?.message ||
          jobError?.message ||
          "Candidate email or job details are missing",
      },
      { status: 422 },
    );
  }
  if (candidate.consent_status !== "consented") {
    return Response.json(
      {
        error:
          "Candidate consent is not recorded. Confirm the applicable privacy basis before sending email.",
      },
      { status: 409 },
    );
  }

  const interviewDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(interview.starts_at));
  const candidateName = escapeHtml(candidate.full_name);
  const jobTitle = escapeHtml(job.title);
  const meetingDetails = escapeHtml(
    interview.location_or_link ||
      "The recruitment team will share the meeting details separately.",
  );
  const subject = `Interview invitation: ${job.title} at Riverpro`;
  const text = [
    `Dear ${candidate.full_name},`,
    "",
    `We would like to invite you to interview for ${job.title} (${job.job_code}).`,
    `Date and time: ${interviewDate} (Bangkok time)`,
    `Format: ${interview.interview_type}`,
    `Duration: ${interview.duration_minutes} minutes`,
    `Location / meeting link: ${interview.location_or_link || "The recruitment team will share the meeting details separately."}`,
    "",
    "Please reply to this email if you need to request a different time.",
    "Riverpro Recruitment Team",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#18212f;line-height:1.6"><p>Dear ${candidateName},</p><p>We would like to invite you to interview for <strong>${jobTitle}</strong> (${escapeHtml(job.job_code)}).</p><ul><li><strong>Date and time:</strong> ${escapeHtml(interviewDate)} (Bangkok time)</li><li><strong>Format:</strong> ${escapeHtml(interview.interview_type)}</li><li><strong>Duration:</strong> ${interview.duration_minutes} minutes</li><li><strong>Location / meeting link:</strong> ${meetingDetails}</li></ul><p>Please reply to this email if you need to request a different time.</p><p>Riverpro Recruitment Team</p></div>`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `riverpro-interview-${interview.id}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [candidate.email],
      subject,
      text,
      html,
    }),
  });
  if (!resendResponse.ok) {
    const result = await resendResponse.json().catch(() => ({}));
    console.error(
      "Interview email provider rejected the request",
      resendResponse.status,
    );
    return Response.json(
      {
        error:
          result.message ||
          "Interview is saved, but the email provider could not send the invitation",
      },
      { status: 502 },
    );
  }

  const resendResult = await resendResponse.json().catch(() => ({}));
  const sentAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("ats_interviews")
    .update({
      invitation_sent_at: sentAt,
      invitation_email_id: resendResult.id || null,
    })
    .eq("id", interview.id);
  if (updateError) {
    console.error(
      "Interview invitation was sent, but delivery status could not be saved",
    );
    return Response.json(
      {
        error:
          "Email was sent, but delivery status could not be saved. Retry is safe.",
      },
      { status: 502 },
    );
  }

  await supabase.from("ats_activity").insert({
    application_id: application.id,
    candidate_id: application.candidate_id,
    job_id: application.job_id,
    event_type: "interview_invitation_sent",
    summary: `ส่งอีเมลนัดสัมภาษณ์ไปยัง ${candidate.email}`,
    metadata: { interview_id: interview.id, email_id: resendResult.id || null },
  });

  return Response.json({ sent: true, recipient: candidate.email });
}
