import { compliance } from '@/lib/compliance';

export const metadata = {
  title: 'Refund Policy',
};

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mw-eyebrow">Customer protection</p>
      <h1 className="mw-section-title mt-2 text-3xl">Refund policy</h1>
      <div className="mt-6 space-y-5 text-sm leading-6 text-ig-text-secondary">
        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Eligibility</h2>
          <p>{compliance.legalEntity} sells digital travel guides. Because purchased guides are delivered immediately on payment confirmation and can be downloaded or viewed in full from that moment, digital purchases are by default non-refundable once accessed. A refund will be granted in the following situations: the purchased guide was not delivered to your account within 24 hours of a successful payment; you were charged twice for the same order or charged for an order you did not place; the purchased guide is materially defective (broken images, missing days, unreadable content) and we are unable to remedy the defect within a reasonable time; the law applicable to your residence requires a refund under a statutory cooling-off period that has not been waived. Refund requests submitted in good faith outside these cases are reviewed individually but are not guaranteed.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">How to request a refund</h2>
          <p>Send an email to {compliance.email} from the email address associated with your Brooks account. Include the following so the refund team can verify and process the request: order or purchase identifier (visible on the Purchases page in your account); guide title and creator name; date of purchase; brief description of the reason for the refund and any supporting screenshots or evidence. We may ask follow-up questions or request that you log in to confirm account ownership.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Timeline</h2>
          <p>Refund requests are reviewed within 7 business days of receipt at {compliance.email}. You will receive an email decision within that window. If the refund is approved, the payment is sent back to the original payment method within a further 14 business days from approval. Bank or card processing on the customer&rsquo;s side may add additional delay outside our control.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Refund method</h2>
          <p>Approved refunds are returned to the original payment method used at checkout, which for the Brooks marketplace is Bank of Georgia iPay (card or bank transfer through the iPay gateway). We do not refund to a different card, bank account, or third party. Where the original method is no longer available (for example, a closed card), we will work with you and Bank of Georgia to identify an acceptable alternative permitted by the payment provider. We do not issue store credit.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Exceptions</h2>
          <p>The following purchases are not refundable: guides whose content has been substantially viewed or downloaded (for example, the trip has been opened, dates have been set, places have been marked visited, or the trip has been synced to a calendar); promotional or discounted bundles where one or more items in the bundle has been used or where the discounted price is below the cost of remaining items; chargebacks initiated through the customer&rsquo;s bank without first contacting us (we will respond to the chargeback through the payment provider rather than process a parallel refund); purchases older than 90 calendar days, except where required by applicable law.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Partial refunds</h2>
          <p>Partial refunds may be offered at our discretion in cases such as: a multi-day guide where only a portion of the days were delivered or accessible due to a technical defect; a bundle where exactly one item is materially defective and the customer wishes to keep the remaining items; an accidental over-charge that did not result in a duplicate full purchase. The partial refund amount is calculated proportionally to the affected portion and is communicated in the refund decision email.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Disputes and escalation</h2>
          <p>If you disagree with a refund decision, reply to the original decision email at {compliance.email} within 14 days, including any new information you would like considered. The escalation is reviewed by a different reviewer where staffing allows, and you will receive an updated decision {compliance.supportResponseTime}. If the matter cannot be resolved bilaterally, you may pursue any rights available to you under the consumer protection law applicable to your residence, or through Bank of Georgia&rsquo;s payment-dispute process.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-ig-text-primary">Contact</h2>
          <p>All refund correspondence: {compliance.email}. Standard response time is {compliance.supportResponseTime} during {compliance.businessHours}. Postal address and registration details are listed on the {compliance.domain} contact page.</p>
        </section>
      </div>
    </div>
  );
}
