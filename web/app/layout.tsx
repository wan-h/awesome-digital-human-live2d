import clsx from 'clsx';
import {Inter} from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import {Providers} from "./providers";
import { getSrcPath } from '@/lib/path';
import type { Metadata } from 'next';
import "@/styles/globals.css";
// export const dynamic = 'error'
const inter = Inter({subsets: ['latin']});

export const metadata: Metadata = {
  title: '沐光而行',
  icons: 'favicon.icon',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className='dark'>
      <head>
        <script src={getSrcPath('sentio/core/live2dcubismcore.min.js')} />
      </head>
      <body className={clsx(inter.className)}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <main>
              {children}
            </main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}