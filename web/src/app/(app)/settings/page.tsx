'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { compliance } from '@/lib/compliance';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import SettingsLanguageSection from '@/components/i18n/SettingsLanguageSection';
import SettingsThemeSection from '@/components/theme/SettingsThemeSection';

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
  const { t } = useTranslation();
  // Help button invokes the in-app onboarding tour. Replaces the Footer's
  // Help link 1:1 — same behaviour, more discoverable on mobile.
  const { start: startOnboarding } = useOnboarding();

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8 pb-24 md:py-12">
      <p className="mw-eyebrow">{t('account.settings.eyebrow')}</p>
      <h1 className="mw-section-title mt-2 text-3xl">{t('account.settings.title')}</h1>
      <p className="mt-3 text-sm text-ig-text-secondary">
        {t('account.settings.description', { email: compliance.email })}
      </p>

      {/* — Account group — */}
      <Group title={t('account.settings.groups.account')}>
        <SettingsRow
          href="/profile/edit"
          title={t('account.settings.rows.profile.title')}
          body={t('account.settings.rows.profile.body')}
        />
        <SettingsRow
          href="/settings/ai-keys"
          title={t('account.settings.rows.aiKeys.title')}
          body={t('account.settings.rows.aiKeys.body')}
        />
        <SettingsRow
          href="/settings/account/delete"
          title={t('account.settings.rows.deleteAccount.title')}
          body={t('account.settings.rows.deleteAccount.body')}
          destructive
        />
      </Group>

      {/* — Appearance group (BOR-57): Light / Dark / Dim / System theme. — */}
      <Group title={t('account.settings.groups.appearance')}>
        <SettingsThemeSection />
      </Group>

      {/* — Language group (BOR-41/BOR-52): the app's sole language selector,
          relocated here from the global header per BOR-52. — */}
      <Group title={t('account.settings.groups.language')}>
        <SettingsLanguageSection />
      </Group>

      {/* — Support group — */}
      <Group title={t('account.settings.groups.support')}>
        <SettingsRow
          onClick={startOnboarding}
          title={t('account.settings.rows.helpTour.title')}
          body={t('account.settings.rows.helpTour.body')}
          testid="settings-help-tour"
          tourId="help-tour-button"
        />
        <SettingsRow
          href="/contact"
          title={t('account.settings.rows.contactUs.title')}
          body={t('account.settings.rows.contactUs.body', { email: compliance.email })}
        />
        <SettingsRow
          href="/guides/academy"
          title={t('account.settings.rows.creatorAcademy.title')}
          body={t('account.settings.rows.creatorAcademy.body')}
        />
      </Group>

      {/* — Legal & company group — */}
      <Group title={t('account.settings.groups.legal')}>
        <SettingsRow href="/terms" title={t('account.settings.rows.terms.title')} />
        <SettingsRow href="/privacy" title={t('account.settings.rows.privacy.title')} />
        <SettingsRow href="/refund" title={t('account.settings.rows.refund.title')} />
        <SettingsRow href="/delivery" title={t('account.settings.rows.delivery.title')} />
        <SettingsRow href="/about" title={t('account.settings.rows.about.title', { company: compliance.companyName })} />
      </Group>

      <p className="mt-8 text-xs leading-5 text-ig-text-tertiary">
        {compliance.legalEntity} · ID {compliance.legalIdentifier}
        <br />
        {t('account.settings.supportLine', { email: compliance.email, phone: compliance.phone })}
        <br />
        {t('account.settings.lostAccess')}{' '}
        <Link className="underline" href="/account/delete">
          {compliance.domain.replace('https://', '')}/account/delete
        </Link>{' '}
        {t('account.settings.withoutSigningIn')}
      </p>
    </main>
  );
}
