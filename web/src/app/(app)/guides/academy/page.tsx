'use client';

import { useTranslation } from 'react-i18next';

export default function CreatorAcademyPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-ig-text-primary mb-2">{t('guidePages.academy.title')}</h1>
      <p className="text-ig-text-secondary mb-8">
        {t('guidePages.academy.intro')}
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold text-ig-text-primary mb-3">{t('guidePages.academy.photoTitle')}</h2>
          <ul className="space-y-2 text-sm text-ig-text-secondary">
            <li>— {t('guidePages.academy.photo1')}</li>
            <li>— {t('guidePages.academy.photo2')}</li>
            <li>— {t('guidePages.academy.photo3')}</li>
            <li>— {t('guidePages.academy.photo4')}</li>
            <li>— {t('guidePages.academy.photo5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ig-text-primary mb-3">{t('guidePages.academy.writingTitle')}</h2>
          <div className="space-y-4 text-sm text-ig-text-secondary">
            <div>
              <p className="font-medium text-ig-text-primary mb-1">{t('guidePages.academy.writingCuriosityGapLabel')}</p>
              <p>{t('guidePages.academy.writingCuriosityGapDesc')}</p>
            </div>
            <div>
              <p className="font-medium text-ig-text-primary mb-1">{t('guidePages.academy.writingSensoryLabel')}</p>
              <p>{t('guidePages.academy.writingSensoryDesc')}</p>
            </div>
            <div>
              <p className="font-medium text-ig-text-primary mb-1">{t('guidePages.academy.writingContrarianLabel')}</p>
              <p>{t('guidePages.academy.writingContrarianDesc')}</p>
            </div>
            <div>
              <p className="font-medium text-ig-text-primary mb-1">{t('guidePages.academy.writingPeakEndLabel')}</p>
              <p>{t('guidePages.academy.writingPeakEndDesc')}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ig-text-primary mb-3">{t('guidePages.academy.structureTitle')}</h2>
          <p className="text-sm text-ig-text-secondary mb-3">{t('guidePages.academy.structureIntro')}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: '🗺️', name: t('guidePages.academy.blockActivity'), desc: t('guidePages.academy.blockActivityDesc') },
              { icon: '🛡️', name: t('guidePages.academy.blockSafety'), desc: t('guidePages.academy.blockSafetyDesc') },
              { icon: '🚌', name: t('guidePages.academy.blockTransport'), desc: t('guidePages.academy.blockTransportDesc') },
              { icon: '🏨', name: t('guidePages.academy.blockAccommodation'), desc: t('guidePages.academy.blockAccommodationDesc') },
              { icon: '🛍️', name: t('guidePages.academy.blockShopping'), desc: t('guidePages.academy.blockShoppingDesc') },
              { icon: '📅', name: t('guidePages.academy.blockSeasonal'), desc: t('guidePages.academy.blockSeasonalDesc') },
              { icon: '🚨', name: t('guidePages.academy.blockEmergency'), desc: t('guidePages.academy.blockEmergencyDesc') },
              { icon: '🔑', name: t('guidePages.academy.blockSecret'), desc: t('guidePages.academy.blockSecretDesc') },
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
          <p className="mt-3 text-xs text-ig-text-tertiary">{t('guidePages.academy.secretNote')}</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ig-text-primary mb-3">{t('guidePages.academy.pricingTitle')}</h2>
          <ul className="space-y-2 text-sm text-ig-text-secondary">
            <li>— {t('guidePages.academy.pricing1')}</li>
            <li>— {t('guidePages.academy.pricing2')}</li>
            <li>— {t('guidePages.academy.pricing3')}</li>
            <li>— {t('guidePages.academy.pricing4')}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
