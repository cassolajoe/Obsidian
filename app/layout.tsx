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
      <head>
        {/* Tailwind CDN Backup Fail-Safe para garantir renderização perfeita em qualquer ambiente */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: 'class',
                theme: {
                  extend: {
                    colors: {
                      obsidian: {
                        bg: '#0A0A0A',
                        card: '#121212',
                        cardHover: '#1A1A1A',
                        neon: '#7CFF4F',
                        neonGlow: 'rgba(124, 255, 79, 0.2)',
                        cyan: '#00F0FF',
                        crystal: '#FFFFFF',
                      }
                    }
                  }
                }
              }
            `,
          }}
        />
      </head>
      <body className="bg-[#0A0A0A] text-white selection:bg-[#7CFF4F] selection:text-black min-h-screen">
        {children}
      </body>
    </html>
  );
}
