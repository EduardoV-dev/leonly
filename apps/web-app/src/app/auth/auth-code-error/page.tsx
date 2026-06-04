import Link from 'next/link';
import { FaHeart } from 'react-icons/fa6';

export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen bg-auth-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[78rem] items-center justify-center overflow-hidden rounded-[1.45rem] border border-auth-border bg-auth-surface px-5 py-10 shadow-auth md:min-h-[calc(100vh-3rem)] md:rounded-[1.75rem]">
        <div className="w-full max-w-[32rem] text-center">
          <p className="inline-flex items-center gap-3 font-serif text-[2.1rem] leading-none tracking-[-0.02em] text-auth-brand sm:text-[2.45rem]">
            <FaHeart className="text-[0.78em]" aria-hidden="true" />
            <span>Leonly</span>
          </p>

          <div className="mt-10 rounded-[1.25rem] border border-auth-border bg-white/45 px-5 py-8 shadow-sm sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.13em] text-auth-legal">
              Authentication error
            </p>
            <h1 className="mt-4 font-display text-[2.5rem] leading-none tracking-[-0.02em] text-auth-heading sm:text-[3rem]">
              Sign-in failed
            </h1>
            <p className="mt-5 text-base leading-relaxed text-auth-copy sm:text-lg">
              We could not complete your Google sign-in. The link may have expired, or the
              authentication request may have been interrupted.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/auth"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-auth-button-border bg-auth-button px-5 text-base font-semibold text-auth-button-text shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5"
              >
                Try again
              </Link>
              <Link
                href="/"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-auth-button-border/45 bg-white/60 px-5 text-base font-semibold text-auth-brand shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/80"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
