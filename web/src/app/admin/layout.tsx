import { getAccessToken } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import AdminNav from './AdminNav';

const API_INTERNAL = process.env.API_INTERNAL_BASE_URL ?? 'http://backend:8080';

// Server-side gate. Backend already enforces ROLE_ADMIN on every /api/admin/** call,
// but rendering the admin shell to non-admins on the client briefly leaks layout +
// links and produces a flash of unauthorized UI. Resolving the role server-side here
// means non-admins never see the shell at all.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let accessToken: string | undefined;
  try {
    ({ accessToken } = await getAccessToken());
  } catch {
    redirect('/');
  }
  if (!accessToken) redirect('/');

  let role: string | null = null;
  try {
    const res = await fetch(`${API_INTERNAL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const me = (await res.json()) as { role?: string };
      role = me.role ?? null;
    }
  } catch {
    redirect('/');
  }
  if (role !== 'ADMIN') redirect('/');

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r-2 border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-6">
        <p className="mw-eyebrow mb-4">Admin</p>
        <AdminNav />
      </aside>
      <div className="flex-1 overflow-auto p-8">{children}</div>
    </div>
  );
}
