import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

/** SMTP mailer (server only). Configure SMTP_HOST/PORT/SECURE/USER/PASS and MAIL_FROM. */
const g = globalThis as unknown as { __mail?: Transporter };
export const mailConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function transport() {
  return (g.__mail ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function layout(title: string, bodyHtml: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;background:#f1f5fa;padding:24px"><div style="max-width:480px;margin:auto;background:#fff;border-radius:16px;padding:28px;color:#0f172a">
<p style="font-weight:800;font-size:18px;color:#1d4ed8;margin:0 0 16px">Kanaku</p><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${bodyHtml}
<p style="font-size:12px;color:#64748b;margin-top:24px">If you didn't expect this email you can safely ignore it.</p></div></div>`;
}
const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700;display:inline-block">${esc(label)}</a></p>`;
const codeBox = (code: string) =>
  `<p style="font-size:30px;letter-spacing:8px;font-weight:800;background:#f1f5fa;border-radius:12px;padding:14px;text-align:center">${esc(code)}</p>`;

/** Tests the SMTP login and the sender address WITHOUT sending anything (used by /api/health?mail=1). */
export async function verifyMail(): Promise<{ ok: boolean; problem?: string }> {
  if (!mailConfigured())
    return { ok: false, problem: 'SMTP_HOST, SMTP_USER or SMTP_PASS is not set.' };
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER ?? '';
  if (!/<[^<>\s]+@[^<>\s]+>|^[^<>\s"]+@[^<>\s"]+$/.test(from))
    return {
      ok: false,
      problem:
        'MAIL_FROM is not a valid sender. Use: Kanaku <you@gmail.com> (no surrounding quotes).',
    };
  if (/[<>]/.test(process.env.SMTP_PASS ?? '') && /^</.test(process.env.SMTP_PASS ?? ''))
    return {
      ok: false,
      problem: 'SMTP_PASS is still a <PLACEHOLDER>. Put the real Gmail app password.',
    };
  try {
    await transport().verify();
    return { ok: true };
  } catch (e) {
    const err = e as { code?: string; responseCode?: number };
    return {
      ok: false,
      problem: `The mail server refused the login (${err.code ?? 'error'}${err.responseCode ? ` ${err.responseCode}` : ''}). Check SMTP_USER and that SMTP_PASS is a CURRENT Gmail app password (no spaces needed).`,
    };
  }
}

/** Sends one email. Returns false (and logs) instead of throwing, so a mail outage never breaks the request. */
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments?: Array<{ filename: string; content: Buffer; cid: string; contentType: string }>,
): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
      ...(attachments?.length ? { attachments } : {}),
    });
    return true;
  } catch (e) {
    console.error('[mail] send failed:', (e as Error).message);
    return false;
  }
}

export const sendTeamInvite = (to: string, name: string, link: string) =>
  sendMail(
    to,
    "You've been invited to the Kanaku admin console",
    layout(
      `Welcome, ${name}`,
      `<p>You've been invited to the Kanaku admin console. Use the single-use link below to choose a password and set up two-step verification. It expires in 72 hours.</p>${button(link, 'Accept invitation')}<p style="font-size:12px;word-break:break-all;color:#64748b">${esc(link)}</p>`,
    ),
    `Hi ${name}, you've been invited to the Kanaku admin console. Accept (valid 72 hours): ${link}`,
  );

/** Invites an end user (created in the console) to sign up on the User App. */
export const sendUserInvite = (to: string, name: string, signupUrl: string) =>
  sendMail(
    to,
    "You've been invited to Kanaku",
    layout(
      `Welcome to Kanaku, ${name}`,
      `<p>An account has been set up for you on Kanaku. Create your login with <b>this email address</b> (${esc(to)}), verify it with the code we send you, and you're ready to start tracking your money.</p>${button(signupUrl, 'Create my account')}<p style="font-size:12px;word-break:break-all;color:#64748b">${esc(signupUrl)}</p>`,
    ),
    `Hi ${name}, you've been invited to Kanaku. Create your account with this email address (${to}): ${signupUrl}`,
  );

/** Tells the support team a new conversation has started (restores the alert the User App used to send). */
export const sendNewTicketAlert = (
  to: string,
  t: {
    id: string;
    subject: string;
    topic: string;
    userName: string;
    plan: string;
    message: string;
    consoleUrl: string;
  },
) =>
  sendMail(
    to,
    `New ${t.topic} ticket ${t.id}: ${t.subject}`,
    layout(
      `New support ticket ${t.id}`,
      `<p><b>${esc(t.userName)}</b> (${esc(t.plan)} plan) · ${esc(t.topic)}</p><p style="font-weight:700">${esc(t.subject)}</p><p style="white-space:pre-line;background:#f1f5fa;border-radius:12px;padding:12px">${esc(t.message.slice(0, 600))}</p>${button(t.consoleUrl, 'Open in the console')}`,
    ),
    `New ${t.topic} ticket ${t.id} from ${t.userName} (${t.plan}): ${t.subject}\n\n${t.message.slice(0, 600)}\n\nOpen: ${t.consoleUrl}`,
  );

/** Sent when an admin triggers "Reset password" for a customer: points them at the User App's own reset page (code by e-mail). */
export const sendUserPasswordHelp = (to: string, name: string, resetUrl: string) =>
  sendMail(
    to,
    'Reset your Kanaku password',
    layout(
      `Hi ${name}, let's reset your password`,
      `<p>Our support team started a password reset for your Kanaku account. Open the page below, enter <b>${esc(to)}</b>, and we'll email you a 6-digit code to choose a new password.</p>${button(resetUrl, 'Reset my password')}<p style="font-size:12px;word-break:break-all;color:#64748b">${esc(resetUrl)}</p><p style="font-size:12px;color:#64748b">If you didn't ask for this you can ignore this email: nothing changes unless you complete the reset.</p>`,
    ),
    `Hi ${name}, our support team started a password reset for your Kanaku account. Open ${resetUrl}, enter ${to}, and we'll email you a code to choose a new password.`,
  );

export const sendResetCode = (to: string, code: string) =>
  sendMail(
    to,
    'Your Kanaku password reset code',
    layout(
      'Reset your password',
      `<p>Enter this code to reset your password. It expires in 15 minutes.</p>${codeBox(code)}`,
    ),
    `Your Kanaku password reset code is ${code}. It expires in 15 minutes.`,
  );

export const sendSignInCode = (to: string, code: string) =>
  sendMail(
    to,
    'Your Kanaku sign-in code',
    layout(
      'Your sign-in code',
      `<p>Use this code to finish signing in. It expires in 10 minutes.</p>${codeBox(code)}`,
    ),
    `Your Kanaku sign-in code is ${code}. It expires in 10 minutes.`,
  );

/** Announcement e-mail. The picture travels as an inline attachment (mail clients block data: images in the body). */
export const sendAnnouncementEmail = (
  to: string,
  a: {
    title: string;
    message: string;
    ctaLabel?: string;
    ctaHref?: string;
    image?: { dataUrl: string; alt: string } | null;
  },
) => {
  const m =
    a.image && /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(a.image.dataUrl);
  const ext = m ? m[1].replace('image/', '').replace('jpeg', 'jpg') : '';
  const img =
    a.image && m
      ? `<p style="margin:0 0 16px"><img src="cid:announcement-image" alt="${esc(a.image.alt)}" style="max-width:100%;border-radius:12px;display:block"></p>`
      : '';
  return sendMail(
    to,
    a.title,
    layout(
      a.title,
      `${img}<p style="white-space:pre-line">${esc(a.message)}</p>${a.ctaLabel && a.ctaHref ? button(a.ctaHref, a.ctaLabel) : ''}`,
    ),
    `${a.title}\n\n${a.message}${a.ctaHref ? `\n\n${a.ctaLabel ?? 'Open'}: ${a.ctaHref}` : ''}`,
    m
      ? [
          {
            filename: `announcement.${ext}`,
            content: Buffer.from(m[2], 'base64'),
            cid: 'announcement-image',
            contentType: m[1],
          },
        ]
      : undefined,
  );
};
