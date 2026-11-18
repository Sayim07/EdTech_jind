// Minimal transactional mailer. Uses Resend's HTTP API when RESEND_API_KEY and MAIL_FROM are set;
// otherwise the message is printed to the server console so the flow can be tested locally.

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function mailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(mail: Mail): Promise<boolean> {
  if (!mailConfigured()) {
    console.log(`\n[mail not configured] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });

  if (!res.ok) {
    console.error('Mail send failed:', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}
