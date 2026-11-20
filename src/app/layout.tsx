import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'opsdeck — operations console',
  description:
    'An intentionally vulnerable ops dashboard for practising privilege escalation (CWE-284).',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted-foreground">
          opsdeck is an intentionally vulnerable lab — run it locally, never expose it.
        </footer>
      </body>
    </html>
  );
}
