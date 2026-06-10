'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { compliance } from '@/lib/compliance';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import SettingsLanguageSection from '@/components/i18n/SettingsLanguageSection';

// Settings landing page. Three-tier IA per the May 2026 mobile-first cleanup:
//   1. Account — what's mine to manage
//   2. Support — how to get help (replaces Footer Help link)
//   3. Legal & company — what I'm agreeing to (Terms, Privacy, etc.,
//      previously only reachable via the desktop fat footer)
//
// On mobile the Footer is hidden — this page is the canonical home for those
// items. On desktop the Footer still renders, so these items exist in two
// places; that's intentional (mobile-first + desktop convention).

interface RowProps {
  href?: string;
  onClick?: () => void;
  title: string;
  body?: string;
  destructive?: boolean;
  testid?: string;
  /** Optional `data-tour` attribute so the onboarding spotlight can target this row. */
  tourId?: string;
}

function SettingsRow({ href, onClick, title, body, destructive, testid, tourId }: RowProps) {
  const className =
    'mw-ripple flex min-h-touch w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition hover:bg-ig-hover ' +
    (destructive
      ? 'border-ig-error/40 hover:border-ig-error'
      : 'border-ig-border');

  const content = (
    <>
      <div className="flex-1">
        <p
          className={
            'text-base font-semibold ' +
            (destructive ? 'text-ig-error' : 'text-ig-text-primary')
          }
        >
          {title}
        </p>
        {body ? (
          <p className="mt-1 text-sm leading-5 text-ig-text-secondary">{body}</p>
        ) : null}
      </div>
      <span className="shrink-0 self-center text-ig-text-tertiary" aria-hidden>
        →
      </span>
    </>
  );

  if (href) {
    return (
      <li>
        <Link href={href} className={className} data-testid={testid} data-tour={tourId}>
          {content}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={onClick} className={className} data-testid={testid} data-tour={tourId}>
        {content}
      </button>
    </li>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mw-eyebrow">{title}</h2>
      <ul className="mt-3 space-y-2">{children}</ul>
    </section>
  );
}

export default function SettingsPage() {
  // Help button invokes the in-app onboarding tour. Replaces the Footer's
  // Help link 1:1 — same behaviour, more discoverable on mobile.
  const { start: startOnboarding } = useOnboarding();

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8 pb-24 md:py-12">
      <p className="mw-eyebrow">Account</p>
      <h1 className="mw-section-title mt-2 text-3xl">Settings</h1>
      <p className="mt-3 text-sm text-ig-text-secondary">
        Manage your Brooks account, find help, and review legal documents. For
        anything else, write to{' '}
        <a className="text-brand-500 underline hover:text-brand-400" href={`mailto:${compliance.email}`}>
          {compliance.email}
        </a>
        .
      </p>

      {/* — Account group — */}
      <Group title="Account">
        <SettingsRow
          href="/profile/edit"
          title="Profile"
          body="Update your display name, avatar, bio, and region."
        />
        <SettingsRow
          href="/settings/ai-keys"
          title="AI keys"
          body="Manage personal AI provider keys used by the assistant."
        />
        <SettingsRow
          href="/settings/account/delete"
          title="Delete account"
          body="Permanently remove your profile, purchases, and uploaded content."
          destructive
        />
      </Group>

      {/* — Language group (BOR-41): same selector as the navbar Globe — */}
      <Group title="Language">
        <SettingsLanguageSection />
      </Group>

      {/* — Support group — */}
      <Group title="Support">
        <SettingsRow
          onClick={startOnboarding}
          title="Help & tour"
          body="Restart the in-app onboarding walkthrough."
          testid="settings-help-tour"
          tourId="help-tour-button"
        />
        <SettingsRow
          href="/contact"
          title="Contact us"
          body={`Email ${compliance.email} or write through the form.`}
        />
        <SettingsRow
          href="/guides/academy"
          title="Creator Academy"
          body="Standards and tips for publishing guides that sell."
        />
      </Group>

      {/* — Legal & company group — */}
      <Group title="Legal & company">
        <SettingsRow href="/terms" title="Terms of Service" />
        <SettingsRow href="/privacy" title="Privacy Policy" />
        <SettingsRow href="/refund" title="Refund Policy" />
        <SettingsRow href="/delivery" title="Delivery & access" />
        <SettingsRow href="/about" title={`About ${compliance.companyName}`} />
      </Group>

      <p className="mt-8 text-xs leading-5 text-ig-text-tertiary">
        {compliance.legalEntity} · ID {compliance.legalIdentifier}
        <br />
        Support: {compliance.email} · {compliance.phone}
        <br />
        Lost access? Request deletion at{' '}
        <Link className="underline" href="/account/delete">
          {compliance.domain.replace('https://', '')}/account/delete
        </Link>{' '}
        without signing in.
      </p>
    </main>
  );
}
