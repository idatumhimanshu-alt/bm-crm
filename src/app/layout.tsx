import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'B&M CRM — Soil to Structure',
  description: 'Broker & Manager property search database',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container header-inner">
            <a href="/" className="header-logo">
              B&M <span>CRM</span>
            </a>
            <nav className="header-nav">
              <a href="/" className="btn btn-outline btn-sm">Properties</a>
              <a href="/properties/new" className="btn btn-primary btn-sm">+ Add Property</a>
            </nav>
          </div>
        </header>
        <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
