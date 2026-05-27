import { FaHeart } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';

const memoryCards = [
  {
    id: 'card-1',
    src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=800&q=80',
    alt: 'Couple smiling while wrapped in blankets',
    className:
      'auth-card auth-card-top auth-float-slow w-[12.6rem] md:w-[13.4rem] lg:w-[16rem] xl:w-[17.2rem]',
  },
  {
    id: 'card-2',
    src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
    alt: 'Hands holding each other over coffee table',
    className:
      'auth-card auth-card-middle auth-float-medium w-[10.8rem] md:w-[12.2rem] lg:w-[13.6rem] xl:w-[14.4rem]',
  },
  {
    id: 'card-3',
    src: 'https://images.unsplash.com/photo-1518398046578-8cca57782e17?auto=format&fit=crop&w=800&q=80',
    alt: 'Phone showing couple walking through tunnel',
    className:
      'auth-card auth-card-bottom auth-float-fast w-[11.4rem] md:w-[12.6rem] lg:w-[15rem] xl:w-[16rem]',
  },
];

export default function App() {
  return (
    <main className="min-h-screen bg-auth-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[78rem] overflow-hidden rounded-[1.45rem] border border-auth-border bg-auth-surface shadow-auth md:min-h-[calc(100vh-3rem)] md:rounded-[1.75rem]">
        <div className="grid w-full gap-8 p-8 sm:p-10 lg:grid-cols-[1fr_1.03fr] lg:gap-6 lg:px-14 lg:py-12 xl:px-16">
          <div className="flex flex-col justify-center">
            <div className="mb-8 text-center lg:mb-10 lg:text-left">
              <p className="inline-flex items-center gap-3 font-serif text-[2.1rem] leading-none tracking-[-0.02em] text-auth-brand sm:text-[2.45rem]">
                <FaHeart className="text-[0.78em]" aria-hidden="true" />
                <span>Leonly</span>
              </p>
            </div>

            <div className="mx-auto w-full max-w-[31rem] text-center lg:mx-0 lg:text-left">
              <h1 className="font-display text-[2.8rem] leading-[0.95] tracking-[-0.02em] text-auth-heading sm:text-[3.2rem] md:text-[3.35rem] lg:text-[3.7rem]">
                Every moment with you.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-auth-copy sm:text-[1.36rem] md:max-w-[30rem]">
                A private, elegant sanctuary designed exclusively for our shared memories,
                inside jokes, and the beautiful journey we are building together.
              </p>

              <button
                type="button"
                className="mt-10 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-auth-button-border bg-auth-button px-6 text-[1.25rem] font-semibold text-auth-button-text shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
              >
                <FcGoogle className="h-6 w-6" aria-hidden="true" />
                Continue with Google
              </button>

              <p className="mt-8 text-xs uppercase tracking-[0.13em] text-auth-legal sm:text-[0.82rem]">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>

          <div className="relative mx-auto h-[20.5rem] w-full max-w-[24rem] sm:h-[22rem] sm:max-w-[26rem] md:h-[23.5rem] md:max-w-[31rem] lg:h-auto lg:max-w-none">
            {memoryCards.map((card) => (
              <figure key={card.id} className={card.className}>
                <img src={card.src} alt={card.alt} loading="lazy" className="auth-card-image" />
              </figure>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
