import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Contact Brooks',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold uppercase text-brand-500">Customer support</p>
      <h1 className="mt-2 text-3xl font-semibold text-ig-text-primary">Contact information</h1>
      <div className="mt-6 rounded-lg border border-ig-border bg-ig-elevated p-5">
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
              <a href={`mailto:${compliance.email}`} className="text-ig-blue hover:underline">{compliance.email}</a>
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
    </div>
  );
}
