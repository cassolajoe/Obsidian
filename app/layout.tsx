import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OBSIDIAN NEXUS — Where Data Becomes Power',
  description: 'Next-Generation Enterprise BI & Analytics Platform with Glassmorphism UI & AI Insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0A0A0A] text-white selection:bg-[#7CFF4F] selection:text-black">
        {children}
      </body>
    </html>
  );
}
