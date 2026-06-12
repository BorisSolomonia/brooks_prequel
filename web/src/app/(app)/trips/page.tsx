import { redirect } from 'next/navigation';

// The standalone "Purchased guides" list (/trips) was retired in favour of the
// unified "My Guides" library at /guides, which has a Purchased tab (and opens
// on it by default). This route now redirects there so any old links/bookmarks
// land on the correct page. The per-trip detail view (/trips/[id]) — where the
// post-purchase / "use this guide" flow lands — is intentionally unchanged.
export default function PurchasedGuidesRedirect() {
  redirect('/guides');
}
