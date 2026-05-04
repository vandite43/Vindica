import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  await getResend().emails.send({
    from: 'Vyndico <noreply@vyndico.com>',
    to,
    subject,
    text,
  });
}
