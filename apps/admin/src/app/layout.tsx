import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RedKS Admin',
  description: 'Har Dukaan, Ghar Tak.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
