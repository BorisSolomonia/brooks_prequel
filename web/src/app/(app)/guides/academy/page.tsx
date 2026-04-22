export default function CreatorAcademyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-ig-text-primary mb-2">Creator Academy</h1>
      <p className="text-ig-text-secondary mb-8">
        Everything you need to publish guides that sell. Follow these standards and your guide will stand out.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold text-ig-text-primary mb-3">Photography standards</h2>
          <ul className="space-y-2 text-sm text-ig-text-secondary">
            <li>— Use RAW or high-resolution JPEG files. Avoid heavy filters.</li>
            <li>— Shoot in natural light. Golden hour (1 hour after sunrise / before sunset) gives the best results.</li>
            <li>— Landscape 16:9 works best for cover images. Portrait works for place cards.</li>
            <li>— Show people experiencing the place, not just the place itself.</li>
            <li>— Avoid stock photos — authenticity drives purchases.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ig-text-primary mb-3">Writing for engagement</h2>
          <div className="space-y-4 text-sm text-ig-text-secondary">
            <div>
              <p className="font-medium text-ig-text-primary mb-1">Curiosity Gap</p>
              <p>Withhold just enough to make readers want more. Instead of &ldquo;A good street food area,&rdquo; try &ldquo;The one stall most tourists walk straight past.&rdquo;</p>
            </div>
            <div>
              <p className="font-medium text-ig-text-primary mb-1">Sensory Language</p>
              <p>Replace generic adjectives (beautiful, nice, amazing) with sensory specifics — smell, sound, taste, texture, temperature. &ldquo;Salt-crusted evening breeze&rdquo; beats &ldquo;beautiful beach.&rdquo;</p>
            </div>
            <div>
              <p className="font-medium text-ig-text-primary mb-1">Contrarian Angle</p>
              <p>Break the expected pattern with one surprising take. &ldquo;Skip the main square — here&rsquo;s why the side street is better&rdquo; creates instant intrigue.</p>
            </div>
            <div>
              <p className="font-medium text-ig-text-primary mb-1">Peak-End Rule</p>
              <p>End every day — and the guide — on an emotional high. The last place visitors experience shapes their entire memory of the trip.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ig-text-primary mb-3">Guide structure</h2>
          <p className="text-sm text-ig-text-secondary mb-3">Use these block categories to build a complete guide:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: '🗺️', name: 'Activity', desc: 'The core experiences' },
              { icon: '🛡️', name: 'Safety', desc: 'Local laws, scams, health' },
              { icon: '🚌', name: 'Transport', desc: 'Getting around' },
              { icon: '🏨', name: 'Accommodation', desc: 'Where to stay' },
              { icon: '🛍️', name: 'Shopping', desc: 'Markets, souvenirs' },
              { icon: '📅', name: 'Seasonal', desc: 'Time-sensitive tips' },
              { icon: '🚨', name: 'Emergency', desc: 'Contacts, hospitals' },
              { icon: '🔑', name: 'Secret', desc: 'Exclusive insider tips' },
            ].map((b) => (
              <div key={b.name} className="flex items-start gap-2 p-2 rounded-lg bg-ig-elevated border border-ig-border">
                <span className="text-base">{b.icon}</span>
                <div>
                  <p className="font-medium text-ig-text-primary text-xs">{b.name}</p>
                  <p className="text-ig-text-tertiary text-xs">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ig-text-tertiary">Secret blocks are only visible to buyers — use them for your best insider tips to drive purchases.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ig-text-primary mb-3">Pricing guidance</h2>
          <ul className="space-y-2 text-sm text-ig-text-secondary">
            <li>— Single-city guides: $5–$15. Multi-city or niche expertise: $15–$30.</li>
            <li>— Price below what a travel agent would charge for 30 minutes of the same advice.</li>
            <li>— Launch at a lower price to collect reviews, then raise once you have social proof.</li>
            <li>— Limited-time sales (24–72 hours) create urgency and drive initial purchases.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
