'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import GetStartedButton from '@/components/landing/GetStartedButton';
import styles from './page.module.css';

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z" /><circle cx="12" cy="9" r="2.4" /></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>;
}

function FeatureCard({ index, title, body, tone }: { index: string; title: string; body: string; tone: 'pink' | 'ink' | 'gold' }) {
  return (
    <article className={`${styles.featureCard} ${styles[`featureCard${tone}`]}`}>
      <span className={styles.featureIndex}>{index}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <span className={styles.featureArrow}><ArrowIcon /></span>
    </article>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Brooks home">
          <span className={styles.brandPin}><PinIcon /></span><span>brooks</span><small>PREQUEL</small>
        </Link>
        <nav className={styles.nav} aria-label="Public navigation">
          <Link href="/search/guides">{t('nav.links.guides')}</Link><Link href="/about">{t('nav.links.about')}</Link><Link href="/privacy">{t('footer.links.privacy')}</Link><Link href="/terms">{t('footer.links.terms')}</Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>For the places you will talk about later</p>
            <h1>{t('landing.hero.line1')}<br />{t('landing.hero.line2')}<br /><em>{t('landing.hero.line3')}</em></h1>
            <p className={styles.intro}>{t('landing.hero.subA')}<br />{t('landing.hero.subB')}</p>
            <div className={styles.actions}>
              <GetStartedButton mobile={false} variant="postcard" />
              <Link href="/search/guides" className={styles.secondaryAction}>{t('landing.guides.button')} <ArrowIcon /></Link>
            </div>
            <div className={styles.postmark} aria-hidden="true"><span>TBILISI</span><span>LOCAL / 01</span></div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.postcardFrame}>
              <Image src="/images/brooks-hero-bg.webp" alt="Travellers discovering Tbilisi" fill priority fetchPriority="high" sizes="(max-width: 900px) 92vw, 52vw" className={styles.heroImage} />
              <span className={styles.photoCaption}>A city full of things to notice.</span>
            </div>
            <div className={styles.noteCard}>
              <p className={styles.eyebrow}><span className={styles.noteDot} />Local perspective</p>
              <strong>{t('landing.memory.title')}</strong><span>{t('landing.memory.eyebrow')}</span>
            </div>
          </div>
        </section>

        <section className={styles.featureSection} aria-labelledby="what-brooks-offers">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>Pick a different point of view</p><h2 id="what-brooks-offers">The city is better when it feels like yours.</h2></div>
          <div className={styles.featureGrid}>
            <FeatureCard index="01" title={t('landing.strip.discoverTitle')} body={t('landing.strip.discoverBody')} tone="pink" />
            <FeatureCard index="02" title={t('landing.strip.herdTitle')} body={t('landing.strip.herdBody')} tone="gold" />
            <FeatureCard index="03" title={t('landing.strip.connectTitle')} body={t('landing.strip.connectBody')} tone="ink" />
          </div>
        </section>

        <section className={styles.closing}>
          <p className={styles.eyebrow}>Bring the story with you</p><h2>{t('landing.strip.shareTitle')}</h2><p>{t('landing.strip.shareBody')}</p>
          <Link href="/search/guides" className={styles.closingLink}>{t('landing.guides.button')} <ArrowIcon /></Link>
        </section>
      </main>
    </div>
  );
}
