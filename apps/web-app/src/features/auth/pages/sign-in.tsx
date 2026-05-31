'use client';

import { Button } from '@/components/ui/button';
import { type AppLanguage, setLanguage } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { FaHeart } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';

const memoryCards = [
  {
    id: 'card-1',
    src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=800&q=80',
    altKey: 'cards.card1Alt',
    className:
      'auth-card auth-card-top auth-float-slow w-[12.6rem] md:w-[13.4rem] lg:w-[16rem] xl:w-[17.2rem]',
  },
  {
    id: 'card-2',
    src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
    altKey: 'cards.card2Alt',
    className:
      'auth-card auth-card-middle auth-float-medium w-[10.8rem] md:w-[12.2rem] lg:w-[13.6rem] xl:w-[14.4rem]',
  },
  {
    id: 'card-3',
    src: 'https://images.unsplash.com/photo-1518398046578-8cca57782e17?auto=format&fit=crop&w=800&q=80',
    altKey: 'cards.card3Alt',
    className:
      'auth-card auth-card-bottom auth-float-fast w-[11.4rem] md:w-[12.6rem] lg:w-[15rem] xl:w-[16rem]',
  },
] as const;

const languageOptions: Array<{
  code: AppLanguage;
  flag: string;
  labelKey: 'language.english' | 'language.spanish';
  shortLabel: 'EN' | 'ES';
}> = [
  { code: 'en', flag: '🇺🇸', labelKey: 'language.english', shortLabel: 'EN' },
  { code: 'es', flag: '🇳🇮', labelKey: 'language.spanish', shortLabel: 'ES' },
];

export function SignInPage() {
  const { t, i18n } = useTranslation('auth');

  const currentLanguage: AppLanguage = i18n.language.startsWith('es') ? 'es' : 'en';

  return (
    <main className="min-h-screen bg-auth-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[78rem] overflow-hidden rounded-[1.45rem] border border-auth-border bg-auth-surface shadow-auth md:min-h-[calc(100vh-3rem)] md:rounded-[1.75rem]">
        <div className="grid w-full gap-8 p-8 sm:p-10 lg:grid-cols-[1fr_1.03fr] lg:gap-6 lg:px-14 lg:py-12 xl:px-16">
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex justify-center lg:justify-end">
              <div className="inline-flex rounded-full border border-auth-button-border/60 bg-white/65 p-1 shadow-sm backdrop-blur">
                {languageOptions.map((option) => {
                  const isActive = currentLanguage === option.code;

                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => setLanguage(option.code)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4 sm:text-sm ${
                        isActive
                          ? 'bg-auth-button text-auth-button-text'
                          : 'text-auth-brand hover:bg-auth-brand/10'
                      }`}
                      aria-label={t(option.labelKey)}
                    >
                      <span aria-hidden="true">{option.flag}</span>
                      <span>{option.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8 text-center lg:mb-10 lg:text-left">
              <p className="inline-flex items-center gap-3 font-serif text-[2.1rem] leading-none tracking-[-0.02em] text-auth-brand sm:text-[2.45rem]">
                <FaHeart className="text-[0.78em]" aria-hidden="true" />
                <span>{t('brand')}</span>
              </p>
            </div>

            <div className="mx-auto w-full max-w-[31rem] text-center lg:mx-0 lg:text-left">
              <h1 className="font-display text-[2.8rem] leading-[0.95] tracking-[-0.02em] text-auth-heading sm:text-[3.2rem] md:text-[3.35rem] lg:text-[3.7rem]">
                {t('heading')}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-auth-copy sm:text-[1.36rem] md:max-w-[30rem]">
                {t('description')}
              </p>

              <Button className="mt-10">
                <FcGoogle className="h-6 w-6" aria-hidden="true" />
                {t('continueWithGoogle')}
              </Button>

              <p className="mt-8 text-xs uppercase tracking-[0.13em] text-auth-legal sm:text-[0.82rem]">
                {t('legal')}
              </p>
            </div>
          </div>

          <div className="relative mx-auto h-[20.5rem] w-full max-w-[24rem] sm:h-[22rem] sm:max-w-[26rem] md:h-[23.5rem] md:max-w-[31rem] lg:h-auto lg:max-w-none">
            {memoryCards.map((card) => (
              <figure key={card.id} className={card.className}>
                <img
                  src={card.src}
                  alt={t(card.altKey)}
                  loading="lazy"
                  className="auth-card-image"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
