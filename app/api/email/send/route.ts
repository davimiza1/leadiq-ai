import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const payload = await request.json() as { leadId?: number; subject?: string; body?: string };
  const subject = payload.subject?.trim() ?? "";
  const body = payload.body?.trim() ?? "";
  if (!payload.leadId || !subject || !body || subject.length > 240 || body.length > 10000) {
    return NextResponse.json({ error: "Provide a valid lead, subject, and message." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userResult.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });

  const { data: lead, error: leadError } = await supabase.from("leads").select("id,name,email").eq("id", payload.leadId).eq("user_id", userResult.user.id).single();
  if (leadError || !lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  let resendId: string | null = null;
  let deliveryStatus = "demo";
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "LeadIQ AI <onboarding@resend.dev>",
      to: lead.email,
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#17352a;max-width:620px;margin:auto"><div style="padding:18px 22px;background:#173f31;color:white;border-radius:12px 12px 0 0;font-weight:700">LeadIQ AI</div><div style="padding:24px;border:1px solid #dce7e1;border-top:0;border-radius:0 0 12px 12px;white-space:pre-wrap">${escapeHtml(body)}</div></div>`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    resendId = data?.id ?? null;
    deliveryStatus = "sent";
  }

  const { data: emailRecord, error: historyError } = await supabase.from("lead_emails").insert({
    user_id: userResult.user.id, lead_id: lead.id, resend_id: resendId,
    recipient: lead.email, subject, body, status: deliveryStatus,
  }).select("id,lead_id,recipient,subject,body,status,created_at").single();
  if (historyError) return NextResponse.json({ error: `Email sent, but history could not be saved: ${historyError.message}` }, { status: 500 });

  await supabase.from("lead_activities").insert({ user_id: userResult.user.id, lead_id: lead.id, kind: "email_sent", description: deliveryStatus === "demo" ? `Demo email saved: ${subject}` : `Email sent: ${subject}` });
  return NextResponse.json({ email: emailRecord, demo: deliveryStatus === "demo" });
}
