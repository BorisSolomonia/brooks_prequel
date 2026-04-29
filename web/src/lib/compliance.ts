export const compliance = {
  companyName: 'Brooks Prequel',
  legalEntity: 'Brooks Prequel',
  legalIdentifier: '405713777',
  domain: 'https://brooksweb.uk',
  email: 'info@brooksweb.uk',
  phone: '+995595036076',
  businessHours: 'Monday-Friday, 10:00-18:00 Asia/Tbilisi time',
  supportResponseTime: 'within 1 business day',
  serviceDescription: 'Digital travel guides, itinerary content, and related travel planning tools sold through the Brooks marketplace.',
};

export function formatMoney(cents: number, currency = 'USD') {
  if (cents <= 0) return 'Free';
  const symbol = currency === 'GEL' ? '₾' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}
