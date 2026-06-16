import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { PersonaProvider } from '@/lib/persona-context';
import { SessionIntentProvider } from '@/lib/session-intent';
import { Header } from '@/components/Header';
import { CategoryNav } from '@/components/CategoryNav';
import { CartDrawer } from '@/components/CartDrawer';

export const metadata: Metadata = {
  title: 'BuildRight — Adaptive Home Improvement',
  description: 'One catalog. The storefront rebuilds around what you came to do.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionIntentProvider>
          <PersonaProvider>
            <CartProvider>
              <Header />
              <CategoryNav />
              <main>{children}</main>
              <CartDrawer />
            </CartProvider>
          </PersonaProvider>
        </SessionIntentProvider>
      </body>
    </html>
  );
}
