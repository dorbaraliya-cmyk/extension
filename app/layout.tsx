import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DealHub Doc Builder',
  description: 'Upload a document and automatically recreate it as a DealHub output document template.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen antialiased">{children}</body>
    </html>
  );
}
