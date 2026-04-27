export const compliance = {
  companyName: 'Brooks Prequel',
  legalEntity: 'Brooks Prequel',
  legalIdentifier: 'To be updated with registered business ID',
  domain: 'https://brooksweb.uk',
  email: 'borissolomoniaphone@gmail.com',
  phone: 'To be updated with a customer support phone number',
  businessHours: 'Monday-Friday, 10:00-18:00 Asia/Tbilisi time',
  supportResponseTime: 'within 1 business day',
  serviceDescription: 'Digital travel guides, itinerary content, and related travel planning tools sold through the Brooks marketplace.',
};

export function formatMoney(cents: number, currency = 'USD') {
  if (cents <= 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
