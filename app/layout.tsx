import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vindica — Dental Claim Denial Predictor',
  description: 'AI-powered dental insurance claim denial predictor and auto-appeal generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
