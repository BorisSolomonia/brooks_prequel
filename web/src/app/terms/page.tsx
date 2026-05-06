import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Terms and Conditions',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mw-eyebrow">Legal</p>
      <h1 className="mw-section-title mt-2 text-3xl">Terms and conditions</h1>
      <div className="mt-6 space-y-5 text-sm leading-6 text-ig-text-secondary">
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Service provider</h2>
          <p>{compliance.legalEntity} provides the Brooks marketplace at {compliance.domain}. Legal identifier: {compliance.legalIdentifier}.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Governing law and jurisdiction</h2>
          <p>These Terms and any non-contractual obligations arising out of or in connection with them are governed by the laws of Georgia. Disputes that cannot be resolved bilaterally are subject to the exclusive jurisdiction of the competent courts of Tbilisi, Georgia. The customer&rsquo;s mandatory consumer-protection rights under their country of residence remain unaffected.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Nature of the digital licence</h2>
          <p>Each purchase grants the customer a non-exclusive, non-transferable, revocable personal licence to access and use the purchased digital travel guide for their own personal travel planning. The customer does not acquire ownership of the guide content, may not resell, sublicense, or commercially redistribute it, and may not republish substantial portions of the content outside the Brooks application without prior written permission. The licence remains valid for as long as the customer&rsquo;s account is in good standing, subject to the refund policy.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Products and prices</h2>
          <p>Products are digital travel guides. Each guide page and the products and prices page show the guide title, delivery format, currency, full price, and active sale price when applicable.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Registration and accounts</h2>
          <p>Customers may browse public content without registration. Purchasing, saving, creating, or accessing paid guide content requires account registration and authentication.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Privacy and confidentiality</h2>
          <p>Account, purchase, and profile information is used to provide the service, process payments, deliver purchases, prevent fraud, and provide customer support. Brooks does not sell customer account data.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Payment</h2>
          <p>Payments are processed through Bank of Georgia iPay. Prices are charged in Georgian Lari (GEL). A purchase is completed only after successful payment confirmation.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Support</h2>
          <p>Customers can contact support at {compliance.email}. Standard response time is {compliance.supportResponseTime} during business hours.</p>
        </section>
      </div>
    </div>
  );
}
