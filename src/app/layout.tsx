import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PartyHub — Mini-jeux entre amis',
  description: 'Crée un salon, partage le code et affronte tes amis en temps réel : quiz, blind test, compose ton 11…',
};

export const viewport: Viewport = {
  themeColor: '#07070d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
