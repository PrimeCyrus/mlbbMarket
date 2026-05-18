import { Resend } from "resend"
import { renderSellerStatusEmail } from "@/lib/email"

// Helper to safely pull values from various webhook payload shapes.
function pick<T = any>(obj: any, path: string[]): T | undefined {
  return path.reduce<any>((acc, k) => (acc && k in acc ? acc[k] : undefined), obj)
}

function extractDoc(obj: any): { email?: string; sellerStatus?: string; fullName?: string } {
  // Plain JSON
  const email1 = obj?.email
  const status1 = obj?.sellerStatus
  const fullName1 = obj?.fullName

  // Firestore "fields" encoding (extensions can send this shape)
  const email2 = pick<string>(obj, ["fields", "email", "stringValue"])
  const status2 = pick<string>(obj, ["fields", "sellerStatus", "stringValue"])
  const fullName2 = pick<string>(obj, ["fields", "fullName", "stringValue"])

  return {
    email: email1 ?? email2,
    sellerStatus: status1 ?? status2,
    fullName: fullName1 ?? fullName2,
  }
}

function getBeforeAfter(body: any) {
  // Common shapes we might receive from an extension or a function:
  // { before: {...}, after: {...} }
  // { oldValue: {...}, value: {...} }
  // { value: { oldValue: {...}, newValue: {...} } }
  // { data: { before: {...}, after: {...} } }
  const before = body?.before ?? body?.oldValue ?? body?.value?.oldValue ?? body?.data?.before
  const after = body?.after ?? body?.value ?? body?.value?.newValue ?? body?.data?.after
  const b = extractDoc(before || {})
  const a = extractDoc(after || {})
  return { before: b, after: a }
}

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-webhook-secret")
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { before, after } = getBeforeAfter(body)

    const prev = before.sellerStatus
    const next = after.sellerStatus
    const email = after.email || before.email
    const fullName = after.fullName || before.fullName

    if (!email || !next) {
      return Response.json({ ok: true, skipped: "missing email or sellerStatus" })
    }
    if (prev === next) {
      return Response.json({ ok: true, skipped: "status did not change" })
    }

    // Only notify for these statuses; adjust as needed
    const allowed = new Set(["approved", "rejected", "pending"])
    if (!allowed.has(next)) {
      return Response.json({ ok: true, skipped: "unhandled status " + next })
    }

    if (!process.env.RESEND_API_KEY) {
      return new Response("Missing RESEND_API_KEY", { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, text, html } = renderSellerStatusEmail(next as any, { fullName })

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "MLBB Trade Hub <noreply@mlbb.example.com>",
      to: email,
      subject,
      text,
      html,
    })

    return Response.json({ ok: true, notified: email, status: next })
  } catch (err: any) {
    console.error("seller-status webhook error", err)
    return new Response("Internal Server Error", { status: 500 })
  }
}
