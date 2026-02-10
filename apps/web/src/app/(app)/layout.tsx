import { AuthProvider } from '../../lib/auth-context';
import { AppShell } from '../../components/AppShell';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}