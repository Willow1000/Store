import { Link } from 'wouter';
import { SEOHead } from '@/components/SEOHead';

export default function AutoMotorblokkenNederland() {
  return (
    <>
      <SEOHead
        pageType="category"
        title="Auto Motorblokken Kopen in Nederland | MotorVault"
        description="Zoek je motorblokken auto of auto motorblok kopen in Nederland? MotorVault helpt met fitment-check, OEM en aftermarket opties, en snelle leveringsondersteuning."
        canonical="/nl/auto-motorblokken"
        keywords={[
          'motorblokken auto',
          'auto motorblokken',
          'motorparts nederland',
          'auto motorblok kopen',
          'motorvault',
        ]}
        faqData={[
          {
            question: 'Waar kan ik een auto motorblok kopen in Nederland?',
            answer:
              'Bij MotorVault kun je aanvragen doen voor motorblokken auto met ondersteuning op basis van voertuiggegevens en onderdeelreferenties.',
          },
          {
            question: 'Heeft MotorVault OEM en aftermarket motorblokken?',
            answer:
              'Ja. We helpen je vergelijken tussen OEM en aftermarket opties op beschikbaarheid, conditie en budget.',
          },
          {
            question: 'Hoe controleer ik fitment voor een motorblok?',
            answer:
              'Deel VIN, model, bouwjaar, motorcode en bestaande partnummers. Zo kunnen we compatibiliteit vooraf controleren.',
          },
        ]}
      />

      <main className="min-h-screen bg-white">
        <section className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-12 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nederland</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
            Motorblokken auto en motorparts Nederland
          </h1>
          <p className="mt-4 text-base text-slate-700 max-w-3xl">
            Zoek je auto motorblokken of wil je een auto motorblok kopen met minder risico op verkeerde fitment?
            MotorVault gebruikt een fitment-first aanpak met voertuigdetails, partnummers en ondersteunende checks
            voordat je bestelt.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/products" className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
              Bekijk beschikbare onderdelen
            </Link>
            <Link href="/contact" className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors">
              Vraag een fitment-check aan
            </Link>
          </div>
        </section>

        <section className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 pb-14">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">1. Voertuigmatching</h2>
              <p className="mt-2 text-sm text-slate-700">
                Deel VIN, model, bouwjaar en motorcode zodat we auto motorblokken kunnen filteren op fitment.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">2. OEM of aftermarket</h2>
              <p className="mt-2 text-sm text-slate-700">
                Kies op basis van kwaliteit, levertijd en budget. We laten duidelijke trade-offs zien.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">3. Bestellen met zekerheid</h2>
              <p className="mt-2 text-sm text-slate-700">
                Je krijgt heldere informatie over levering, retourbeleid en vervolgstappen na aankoop.
              </p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
