import Link from 'next/link';
import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Contact Brooks',
};

// Pre-filled mailto so tapping opens the user's mail compose with the deletion
// request ready to send.
const DELETION_MAILTO = `mailto:${compliance.email}`
  + `?subject=${encodeURIComponent('Data deletion request')}`
  + `&body=${encodeURIComponent('Please delete my Brooks account and all associated data.\n\nAccount email: ')}`;

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mw-eyebrow">Customer support</p>
      <h1 className="mw-section-title mt-2 text-3xl">Contact information</h1>
      <div className="mw-card mt-6 p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ig-text-tertiary">Company</dt>
            <dd className="mt-1 text-ig-text-primary">{compliance.legalEntity}</dd>
          </div>
          <div>
            <dt className="text-sm text-ig-text-tertiary">Legal ID</dt>
            <dd className="mt-1 text-ig-text-primary">{compliance.legalIdentifier}</dd>
          </div>
          <div>
            <dt className="text-sm text-ig-text-tertiary">Email</dt>
            <dd className="mt-1 text-ig-text-primary">
              <a href={`mailto:${compliance.email}`} className="font-semibold text-brand-500 hover:text-brand-400">{compliance.email}</a>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ig-text-tertiary">Phone</dt>
            <dd className="mt-1 text-ig-text-primary">{compliance.phone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-ig-text-tertiary">Business hours</dt>
            <dd className="mt-1 text-ig-text-primary">{compliance.businessHours}</dd>
          </div>
        </dl>
      </div>

      {/* Data deletion — surfaced on the support page so users who come here to
          "contact us" can also request removal of their data. */}
      <div className="mw-card mt-6 p-5">
        <h2 className="mw-section-title text-xl">Delete your data</h2>
        <p className="mt-2 text-sm leading-6 text-ig-text-secondary">
          You can request deletion of your Brooks account and all associated data at any time.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-ig-text-secondary">
          <li>
            <Link href="/account/delete" className="font-semibold text-brand-500 hover:text-brand-400">
              Request data deletion →
            </Link>
            <span className="block text-ig-text-tertiary">Works even if you can&apos;t sign in — we email a confirmation link.</span>
          </li>
          <li>
            <Link href="/settings/account/delete" className="font-semibold text-brand-500 hover:text-brand-400">
              Delete from the app →
            </Link>
            <span className="block text-ig-text-tertiary">Signed in? Delete immediately in Settings → Account.</span>
          </li>
          <li>
            <a href={DELETION_MAILTO} className="font-semibold text-brand-500 hover:text-brand-400">
              Email a deletion request →
            </a>
            <span className="block text-ig-text-tertiary">Tap to open your mail app with the request pre-filled.</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-ig-text-tertiary">
          Deletion removes your profile, purchases, uploaded content and sign-in tokens; backups are purged within
          30 days. Details in the{' '}
          <Link href="/privacy" className="underline hover:text-brand-400">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
