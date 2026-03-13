import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gold Monitor',
  description: 'Мониторинг цен на золото и USD/RUB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-[#0f1117] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
