import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  await resend.emails.send({
    from: 'Vindica <noreply@hsnhgroup.com>',
    to,
    subject,
    text,
  });
}
