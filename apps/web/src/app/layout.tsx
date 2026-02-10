import './global.css';
import { ThemeProvider } from '../lib/theme';

export const metadata = {
  title: 'Nabora — Your Community, Connected',
  description:
    'Nabora brings your neighbourhood together. Events, notices, local services, and everything your community needs — in one place.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}