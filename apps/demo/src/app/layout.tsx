import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { ReactNode } from 'react';
import { BrandLogo } from './brand-logo';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
});

export const metadata: Metadata = {
  title: 'DashSpec',
  description: 'Declaratively define dashboards in YAML and render visualizations with PQL.'
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={spaceGrotesk.variable}>
        <div className="site-shell">
          <header className="site-header">
            <div className="site-header-inner">
              <div className="site-header-left">
                <a className="brand-link" href="/" aria-label="DashSpec home">
                  <BrandLogo compact />
                </a>
                <nav className="site-header-nav" aria-label="Primary">
                  <a className="site-header-nav-link" href="/">
                    Home
                  </a>
                  <a className="site-header-nav-link" href="/demo">
                    Demo
                  </a>
                  <a className="site-header-nav-link" href="/docs">
                    Docs
                  </a>
                </nav>
              </div>
              <div className="site-header-right">
                <div className="site-header-copy">
                  <span className="site-eyebrow">Declarative dashboard library</span>
                  <span className="site-tagline">YAML-defined dashboards with PQL-powered visualizations.</span>
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
