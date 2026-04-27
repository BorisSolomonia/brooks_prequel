import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Refund Policy',
};

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold uppercase text-brand-500">Customer protection</p>
      <h1 className="mt-2 text-3xl font-semibold text-ig-text-primary">Refund policy</h1>
      <div className="mt-6 space-y-5 text-sm leading-6 text-ig-text-secondary">
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Refund window</h2>
          <p>Customers may request a refund within 14 calendar days of purchase if the digital guide was not accessed, the product was not delivered, or there was a duplicate or incorrect charge.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Non-refundable cases</h2>
          <p>Refunds may be declined after the customer has accessed or used the purchased digital content, except where required by applicable law or where the product was defective or unavailable.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">How to request a refund</h2>
          <p>Email {compliance.email} with the account email, purchase date, guide title, payment reference if available, and refund reason.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Processing time</h2>
          <p>Approved refunds are submitted back to the original payment method within 5 business days. Bank or card processing times may add additional delay.</p>
        </section>
      </div>
    </div>
  );
}
