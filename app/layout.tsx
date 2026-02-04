import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import AnalyticsInit from './analytics-init';

export const metadata: Metadata = {
  title: 'Shorts Mission Control',
  description: '유튜브 숏츠 제작과 업로드 상태를 한 곳에서 관리하세요.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          {children}
          <AnalyticsInit />
        </Providers>
      </body>
    </html>
  );
}
