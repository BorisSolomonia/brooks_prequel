import Link from 'next/link';
import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Settings',
};

interface SettingCard {
  href: string;
  title: string;
  body: string;
  destructive?: boolean;
}

const cards: SettingCard[] = [
  {
    href: '/profile/edit',
    title: 'Profile',
    body: 'Update your display name, avatar, bio, and region.',
  },
  {
    href: '/settings/ai-keys',
    title: 'AI keys',
    body: 'Manage personal AI provider keys used by the assistant.',
  },
  {
    href: '/settings/account/delete',
    title: 'Delete account',
    body: 'Permanently remove your profile, purchases, and uploaded content.',
    destructive: true,
  },
];

// Settings landing — small index page so the in-app delete-account flow
// has a discoverable entry point. Required by Play Console policy: the
// path "Settings → Delete account" must exist inside the app.
export default function SettingsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8 pb-24 md:py-12">
      <p className="mw-eyebrow">Account</p>
      <h1 className="mw-section-title mt-2 text-3xl">Settings</h1>
      <p className="mt-3 text-sm text-ig-text-secondary">
        Quick links to manage your Brooks account. For anything else, write to{' '}
        <a className="text-brand-500 underline hover:text-brand-400" href={`mailto:${compliance.email}`}>
          {compliance.email}
        </a>
        .
      </p>

      <ul className="mt-6 space-y-3">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className={
                'mw-card flex min-h-touch items-start gap-3 rounded-2xl border-2 p-4 transition hover:bg-ig-hover ' +
                (card.destructive
                  ? 'border-ig-error/40 hover:border-ig-error'
                  : 'border-ig-border')
              }
            >
              <div className="flex-1">
                <p
                  className={
                    'text-base font-semibold ' +
                    (card.destructive ? 'text-ig-error' : 'text-ig-text-primary')
                  }
                >
                  {card.title}
                </p>
                <p className="mt-1 text-sm leading-5 text-ig-text-secondary">{card.body}</p>
              </div>
              <span className="shrink-0 self-center text-ig-text-tertiary" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-ig-text-tertiary">
        Lost access? You can also request deletion from{' '}
        <Link className="underline" href="/account/delete">
          brooksweb.uk/account/delete
        </Link>
        {' '}without signing in.
      </p>
    </main>
  );
}
