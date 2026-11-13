import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
type Sent = {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ cid: string; contentType: string; content: Buffer }>;
};
const sent: Sent[] = [];
let failSend = false;
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      verify: async () => true,
      sendMail: async (m: Sent) => {
        if (failSend) throw new Error('smtp down');
        sent.push(m);
        return {};
      },
    }),
  },
}));

const PROD = {
  SMTP_HOST: 'smtp.example.com',
  SMTP_USER: 'noreply@example.com',
  SMTP_PASS: 'secret-app-password',
  MAIL_FROM: 'Kanaku <noreply@example.com>',
  USER_APP_URL: 'https://growwithkanaku-user.vercel.app',
};
const mailer = () => import('./mailer');
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

beforeEach(() => {
  sent.length = 0;
  failSend = false;
  for (const [k, v] of Object.entries(PROD)) vi.stubEnv(k, v);
});

describe('admin e-mails', () => {
  it('team invitation: right recipient/subject, the link, no localhost', async () => {
    const { sendTeamInvite } = await mailer();
    expect(
      await sendTeamInvite(
        'new.admin@example.com',
        'Asha',
        'https://admin-kanaku.vercel.app/accept-invite?token=abc',
      ),
    ).toBe(true);
    const m = sent[0];
    expect(m).toMatchObject({ to: 'new.admin@example.com', from: 'Kanaku <noreply@example.com>' });
    expect(m.subject).toMatch(/invited/i);
    expect(m.html).toContain('https://admin-kanaku.vercel.app/accept-invite?token=abc');
    expect(m.text).toContain('accept-invite?token=abc');
    expect(m.html + m.text).not.toContain('localhost');
  });
  it('user invitation points at the User App signup page and asks for the same address', async () => {
    const { sendUserInvite } = await mailer();
    await sendUserInvite(
      'priya@example.com',
      'Priya',
      'https://growwithkanaku-user.vercel.app/signup',
    );
    expect(sent[0].to).toBe('priya@example.com');
    expect(sent[0].html).toContain('https://growwithkanaku-user.vercel.app/signup');
    expect(sent[0].html).toContain('priya@example.com');
  });
  it('customer password help points at the User App reset page and never contains a password', async () => {
    const { sendUserPasswordHelp } = await mailer();
    await sendUserPasswordHelp(
      'cust@example.com',
      'Cust',
      'https://growwithkanaku-user.vercel.app/forgot-password',
    );
    expect(sent[0]).toMatchObject({ to: 'cust@example.com' });
    expect(sent[0].html).toContain('https://growwithkanaku-user.vercel.app/forgot-password');
    expect(sent[0].html + sent[0].text).not.toContain('localhost');
  });
  it('reset and sign-in codes carry the code', async () => {
    const { sendResetCode, sendSignInCode } = await mailer();
    await sendResetCode('a@example.com', '482913');
    await sendSignInCode('a@example.com', '730158');
    expect(sent[0].html + sent[0].text).toContain('482913');
    expect(sent[1].html + sent[1].text).toContain('730158');
  });
  it('announcement: message, button, and the picture as an inline attachment', async () => {
    const { sendAnnouncementEmail } = await mailer();
    await sendAnnouncementEmail('u@example.com', {
      title: 'Big news',
      message: 'Line one\nLine two',
      ctaLabel: 'Open',
      ctaHref: 'https://growwithkanaku-user.vercel.app/billing',
      image: { dataUrl: PNG, alt: 'A picture' },
    });
    const m = sent[0];
    expect(m.html).toContain('cid:announcement-image');
    expect(m.attachments?.[0]).toMatchObject({
      cid: 'announcement-image',
      contentType: 'image/png',
    });
    expect(m.attachments![0].content.length).toBeGreaterThan(10);
    expect(m.html).toContain('https://growwithkanaku-user.vercel.app/billing');
  });
  it('announcement without a picture sends no attachment; a bad data URL is ignored, not attached', async () => {
    const { sendAnnouncementEmail } = await mailer();
    await sendAnnouncementEmail('u@example.com', { title: 'T', message: 'm' });
    await sendAnnouncementEmail('u@example.com', {
      title: 'T',
      message: 'm',
      image: { dataUrl: 'javascript:alert(1)', alt: 'x' },
    });
    expect(sent.every((m) => !m.attachments?.length)).toBe(true);
  });
  it('new-ticket alert includes the ticket and a console link', async () => {
    const { sendNewTicketAlert } = await mailer();
    await sendNewTicketAlert('agent@example.com', {
      id: '#1042',
      subject: 'Refund?',
      topic: 'Billing',
      userName: 'Cust',
      plan: 'starter',
      message: 'Please help',
      consoleUrl: 'https://admin-kanaku.vercel.app/support?ticket=%231042',
    });
    expect(sent[0].subject).toContain('#1042');
    expect(sent[0].html).toContain('https://admin-kanaku.vercel.app/support?ticket=%231042');
  });
  it('user-written text can never inject HTML', async () => {
    const { sendNewTicketAlert, sendUserInvite } = await mailer();
    await sendNewTicketAlert('a@example.com', {
      id: '#1',
      subject: '<img src=x onerror=alert(1)>',
      topic: 'T',
      userName: '<script>x</script>',
      plan: 'p',
      message: '<b onmouseover=1>hi</b>',
      consoleUrl: 'https://x.test/',
    });
    await sendUserInvite('a@example.com', '"><script>alert(1)</script>', 'https://x.test/signup');
    for (const m of sent) {
      expect(m.html).not.toContain('<script>');
      expect(m.html).not.toMatch(/<img src=x/);
      expect(m.html).not.toContain('<b onmouseover');
    }
  });
  it('reports failure (false) instead of throwing when the mail server is down', async () => {
    const { sendTeamInvite } = await mailer();
    failSend = true;
    expect(await sendTeamInvite('a@example.com', 'A', 'https://x.test')).toBe(false);
  });
  it('does nothing (false) when SMTP is not configured', async () => {
    vi.stubEnv('SMTP_PASS', '');
    const { sendResetCode } = await mailer();
    expect(await sendResetCode('a@example.com', '111111')).toBe(false);
    expect(sent).toHaveLength(0);
  });
  it('verifyMail catches a placeholder password and a malformed sender', async () => {
    const { verifyMail } = await mailer();
    vi.stubEnv('SMTP_PASS', '<NEW_GMAIL_APP_PASSWORD>');
    expect((await verifyMail()).problem).toMatch(/PLACEHOLDER/);
    vi.stubEnv('SMTP_PASS', 'real');
    vi.stubEnv('MAIL_FROM', 'not a sender');
    expect((await verifyMail()).problem).toMatch(/MAIL_FROM/);
    vi.stubEnv('MAIL_FROM', 'Kanaku <noreply@example.com>');
    expect((await verifyMail()).ok).toBe(true);
  });
});
