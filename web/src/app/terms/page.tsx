import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Terms and Conditions',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold uppercase text-brand-500">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold text-ig-text-primary">Terms and conditions</h1>
      <div className="mt-6 space-y-5 text-sm leading-6 text-ig-text-secondary">
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Service provider</h2>
          <p>{compliance.legalEntity} provides the Brooks marketplace at {compliance.domain}. Legal identifier: {compliance.legalIdentifier}.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Products and prices</h2>
          <p>Products are digital travel guides. Each guide page and the products and prices page show the guide title, delivery format, currency, full price, and active sale price when applicable.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Registration and accounts</h2>
          <p>Customers may browse public content without registration. Purchasing, saving, creating, or accessing paid guide content requires account registration and authentication.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Privacy and confidentiality</h2>
          <p>Account, purchase, and profile information is used to provide the service, process payments, deliver purchases, prevent fraud, and provide customer support. Brooks does not sell customer account data.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Payment</h2>
          <p>Payments are processed through UniPay or the active payment provider shown during checkout. A purchase is completed only after successful payment confirmation.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ig-text-primary">Support</h2>
          <p>Customers can contact support at {compliance.email}. Standard response time is {compliance.supportResponseTime} during business hours.</p>
        </section>
      </div>
    </div>
  );
}
