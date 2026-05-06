import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Delivery Terms',
};

export default function DeliveryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mw-eyebrow">Digital delivery</p>
      <h1 className="mw-section-title mt-2 text-3xl">Delivery terms</h1>
      <div className="mt-6 space-y-5 text-sm leading-6 text-ig-text-secondary">
        <p>{compliance.serviceDescription}</p>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Delivery method</h2>
          <p>Paid guides are delivered digitally inside the customer account immediately after payment confirmation. Customers can access purchased guides from the Purchases and Purchased guides sections.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Delivery time</h2>
          <p>Digital access is normally available immediately. If payment confirmation is delayed by the payment provider, access is activated after the successful payment status is received.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">No physical shipping</h2>
          <p>Brooks sells digital services and content. There is no courier, postal delivery, or physical shipment unless a product page explicitly states otherwise.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Delivery support</h2>
          <p>If a paid guide does not appear after successful payment, contact {compliance.email} during {compliance.businessHours}.</p>
        </section>
      </div>
    </div>
  );
}
