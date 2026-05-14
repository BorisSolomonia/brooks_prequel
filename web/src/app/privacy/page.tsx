import Link from 'next/link';
import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mw-eyebrow">Legal</p>
      <h1 className="mw-section-title mt-2 text-3xl">Privacy policy</h1>
      <div className="mt-6 space-y-5 text-sm leading-6 text-ig-text-secondary">
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Who we are</h2>
          <p>{compliance.legalEntity} (&ldquo;Brooks&rdquo;) operates the Brooks marketplace at {compliance.domain}. Legal identifier: {compliance.legalIdentifier}. Contact: {compliance.email}.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Information we collect</h2>
          <p>Account information: email address, display name, and authentication identifier provided by Auth0 when you sign in. Profile information: any avatar, bio, region, interests, and location coordinates you choose to add. Purchase information: items purchased, price paid, transaction identifier from Bank of Georgia iPay. Content you create: guides, days, blocks, places, photos, and reviews. Trip data: scheduled times, visited markers, and skip flags you set on purchased trips. Technical information: server logs that record your IP address, request path, and timestamp for security and reliability.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">How we use information</h2>
          <p>To provide the service: authenticating you, showing your purchased guides, syncing your trip data, and delivering purchases. To process payments through Bank of Georgia iPay. To prevent fraud and abuse. To respond to support requests. To improve the product based on aggregate usage patterns.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Service providers we use</h2>
          <p>Auth0 (Okta) handles authentication and stores your account credentials. Bank of Georgia iPay processes card payments. Google Cloud Platform hosts the application, database, and media files. Mapbox renders interactive maps when you view location-based features. Google Calendar (optional) receives trip events when you connect your calendar. These providers receive only the information necessary to perform their function and are bound by their own privacy policies.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Google user data — limited use disclosure</h2>
          <p>Brooks&rsquo;s use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-brand-500 hover:text-brand-400">Google API Services User Data Policy</a>, including the Limited Use requirements. Specifically: when you connect Google Calendar, we request only the calendar and email scopes needed to create a dedicated &ldquo;Brooks Trips&rdquo; calendar in your account and write the events for trips you have purchased. We never sell or share Google user data with third parties for advertising, do not transfer it for unrelated purposes, do not allow humans to read it except for support cases you initiate, and store the refresh token encrypted at rest. You can disconnect Google Calendar at any time from the Add-to-Calendar dialog, which deletes the stored refresh token from our database.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Cookies and similar technologies</h2>
          <p>We use first-party cookies that are strictly necessary to keep you signed in and to remember short-lived state during the OAuth and payment flows. We do not use third-party advertising cookies.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Your rights</h2>
          <p>You can request access to, correction of, or deletion of your account data by writing to {compliance.email}. We will respond within {compliance.supportResponseTime}. You can disconnect optional integrations (such as Google Calendar) from inside the app at any time. Deleting your account removes your profile, purchases, and uploaded content from our active database; backup copies may persist for up to 30 days before being purged.</p>
          <p className="mt-2">Self-service account deletion: signed-in users can delete from <Link href="/settings/account/delete" className="text-brand-500 underline hover:text-brand-400">Settings &rarr; Delete account</Link>. If you have lost access, request deletion at <Link href="/account/delete" className="text-brand-500 underline hover:text-brand-400">{compliance.domain}/account/delete</Link> — we email a confirmation link to the address on file.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Brooks Android app</h2>
          <p>The Brooks Android application (package <code>uk.brooksweb.app</code>) is a thin shell that loads {compliance.domain} inside a secure WebView. The native shell additionally requests, only when relevant: notification permission (to deliver booking and trip reminders), and location permission (to centre the map on your current position). Neither permission is required to use the app. Location coordinates sent to Mapbox to render tiles are subject to Mapbox&rsquo;s privacy policy. Apple/Google Play Store identifiers (install ID, device language, OS version) are processed by the respective store and not collected by Brooks beyond standard crash reporting.</p>
          <p className="mt-2">In-app payments inside the Brooks Android app use the same Bank of Georgia iPay processor as the web site; Google Pay, where offered, is a wallet that tokenises your card and forwards the token to Bank of Georgia iPay for the actual charge — Brooks never receives or stores your card details.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Data retention</h2>
          <p>We retain account and purchase information for as long as your account is active or as required to comply with tax and accounting law. Server logs are retained for up to 90 days. Encrypted OAuth refresh tokens are deleted immediately upon disconnect or account deletion.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Security</h2>
          <p>Data in transit is encrypted with TLS. Sensitive credentials such as third-party API keys and OAuth refresh tokens are encrypted at rest with AES before storage. Access to production systems is restricted to authorised personnel. No system is perfectly secure; please contact us at {compliance.email} if you believe your data has been compromised.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Children</h2>
          <p>Brooks is not directed to children under 13 (or under 16 in jurisdictions where that is the applicable threshold). We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact {compliance.email} and we will delete it.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Changes to this policy</h2>
          <p>We may update this policy from time to time. Material changes will be communicated via the email address associated with your account. Continued use of the service after the update constitutes acceptance of the revised policy.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Contact</h2>
          <p>Questions about this policy: {compliance.email}. Standard response time is {compliance.supportResponseTime} during {compliance.businessHours}.</p>
        </section>
      </div>
    </div>
  );
}
