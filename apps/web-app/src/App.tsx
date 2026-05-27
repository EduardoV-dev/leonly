import { DemoCard } from '@/features/demo/components/DemoCard';

export default function App() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-zinc-100 to-stone-200 px-6 py-10">
      <section className="mx-auto w-full max-w-3xl">
        <header className="mb-6 space-y-2 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">web-app ready</h1>
          <p className="text-sm text-slate-600">
            Shadcn + feature architecture + axios + react-query baseline complete.
          </p>
        </header>
        <DemoCard />
      </section>
    </main>
  );
}
