import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";

export default function AutoMotorblokkenNederland() {
  return (
    <>
      <SEOHead
        pageType="category"
        title="Auto Motorblokken Kopen in Nederland | MotorVault"
        description="Zoek je motorblokken auto of auto motorblok kopen in Nederland? MotorVault helpt met fitment-check, OEM en aftermarket opties, en snelle leveringsondersteuning."
        canonical="/nl/auto-motorblokken"
        keywords={[
          "motorblokken auto",
          "auto motorblokken",
          "motorparts nederland",
          "auto motorblok kopen",
          "motorvault",
        ]}
        faqData={[
          {
            question: "Waar kan ik een auto motorblok kopen in Nederland?",
            answer:
              "Bij MotorVault kun je aanvragen doen voor motorblokken auto met ondersteuning op basis van voertuiggegevens en onderdeelreferenties.",
          },
          {
            question: "Heeft MotorVault OEM en aftermarket motorblokken?",
            answer:
              "Ja. We helpen je vergelijken tussen OEM en aftermarket opties op beschikbaarheid, conditie en budget.",
          },
          {
            question: "Hoe controleer ik fitment voor een motorblok?",
            answer:
              "Deel VIN, model, bouwjaar, motorcode en bestaande partnummers. Zo kunnen we compatibiliteit vooraf controleren.",
          },
        ]}
      />

      <div className="min-h-screen bg-white">
        <section className="border-b border-gray-200 bg-gray-50">
          <div className="container py-8 sm:py-12">
            <p className="eyebrow">Nederland</p>
            <h1 className="mt-2 text-ink">
              Motorblokken auto en motorparts Nederland
            </h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-gray-700 sm:text-base">
              Zoek je auto motorblokken of wil je een auto motorblok kopen met
              minder risico op verkeerde fitment? MotorVault gebruikt een
              fitment-first aanpak met voertuigdetails, partnummers en
              ondersteunende checks voordat je bestelt.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/products" className="btn-accent btn-lg">
                Bekijk beschikbare onderdelen
              </Link>
              <Link href="/contact" className="btn-secondary btn-lg">
                Vraag een fitment-check aan
              </Link>
            </div>
          </div>
        </section>

        <section className="container section">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-ink">
                1. Voertuigmatching
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
                Deel VIN, model, bouwjaar en motorcode zodat we auto
                motorblokken kunnen filteren op fitment.
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-ink">
                2. OEM of aftermarket
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
                Kies op basis van kwaliteit, levertijd en budget. We laten
                duidelijke trade-offs zien.
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-ink">
                3. Bestellen met zekerheid
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
                Je krijgt heldere informatie over levering, retourbeleid en
                vervolgstappen na aankoop.
              </p>
            </article>
          </div>
        </section>
      </div>
    </>
  );
}
