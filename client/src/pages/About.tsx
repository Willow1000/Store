import { SEOHead } from '@/components/SEOHead';
import { AboutHeroSlideshow } from '@/components/AboutHeroSlideshow';
import { Link } from 'wouter';
import {
  ArrowRight,
  BadgeCheck,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  Globe2,
  PackageSearch,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import { BannerCarousel } from '@/components/BannerCarousel';

const aboutBannerSlides = [
  {
    image: '/images/banners/rare-european-auto-parts-about-banner.avif',
    imageWebp: '/images/banners/rare-european-auto-parts-about-banner.webp',
    imageAlt: 'Rare European auto parts sourcing support and buyer guidance for hard-to-find components',
    title: 'Fitment Confidence Before Checkout',
    subtitle: 'Start with VIN, part numbers, and compatibility guidance so you avoid wrong-part orders.',
    cta: 'Check fitment FAQs',
    ctaLink: '/faq',
  },
  {
    image: '/images/banners/europe-wide-auto-parts-shipping-about-banner.avif',
    imageWebp: '/images/banners/europe-wide-auto-parts-shipping-about-banner.webp',
    imageAlt: 'Europe-wide automotive spare parts shipping and logistics coverage for fast delivery',
    title: 'Clear Shipping, Returns, and Warranty Expectations',
    subtitle: 'Know timing, policy coverage, and support steps before you place your order.',
    cta: 'Talk to support',
    ctaLink: '/contact',
  },
];

const sourcingSteps = [
  {
    title: 'Fitment-first sourcing',
    description:
      'We prioritize compatibility evidence first: VIN context, part numbers, model/year/engine data, and supplier notes before recommending options.',
    icon: Globe2,
  },
  {
    title: 'Practical quality selection',
    description:
      'We help customers choose between OEM, premium aftermarket, standard aftermarket, and verified used options based on risk, labor cost, and budget.',
    icon: PackageSearch,
  },
  {
    title: 'Transparent buying details',
    description:
      'Listings are built to answer the questions buyers ask most: fitment certainty, what is included, return eligibility, and warranty expectations.',
    icon: ClipboardList,
  },
];

const serviceHighlights = [
  {
    title: 'Fitment help for uncertain buyers',
    description:
      'If you are not sure what to buy, we can guide you using VIN and part details so you are not forced to guess based on generic listings.',
    icon: Truck,
  },
  {
    title: 'Warranty and returns clarity',
    description:
      'We explain return and warranty expectations clearly because policy clarity is one of the biggest concerns in auto-parts buying.',
    icon: ShieldCheck,
  },
  {
    title: 'Customer-led part discovery',
    description:
      'When parts are hard to identify or unavailable, customers can request sourcing directly with vehicle and part references.',
    icon: Users,
  },
];

const trustPoints = [
  'VIN and fitment-minded guidance before purchase',
  'Clear OEM vs aftermarket vs used part positioning',
  'Upfront support on returns, warranty, and delivery timing',
  'Practical sourcing for hard-to-find European vehicle parts',
];

function buildFitmentCheckHref() {
  const subject = 'VIN fitment check before purchase';
  const message =
    'Hello MotorVault team,\n\nPlease help confirm fitment before I buy.\n\nVehicle details:\n- VIN:\n- Make/Model/Year:\n- Engine/Trim:\n\nPart details:\n- Part name:\n- Part number (if known):\n- Photos (if available):\n\nThank you.';
  const params = new URLSearchParams({
    subject,
    message,
    enquiry: '1',
  });
  return `/contact?${params.toString()}`;
}

const partners = [
  {
    name: 'The Scrappers Ltd',
    logo: '/images/partners/trusted-auto-parts-recycling-partner-the-scrappers.webp',
    url: 'https://www.thescrappers.co.uk/',
  },
];

function buildListingRequestHref() {
  const subject = 'Request to list a specific part';
  const message =
    'Hello MotorVault team,\n\nI would like to request that a specific part be listed on your platform.\n\nPart details:\n- Part name:\n- Vehicle make/model/year:\n- OEM or aftermarket preference:\n- Any part numbers or photos:\n\nThank you.';
  const params = new URLSearchParams({
    subject,
    message,
    enquiry: '1',
  });
  return `/contact?${params.toString()}`;
}

export default function About() {
  const listingRequestHref = buildListingRequestHref();
  const fitmentCheckHref = buildFitmentCheckHref();

  return (
    <>
      <SEOHead
        pageType="about"
        title="About MotorVault - Trusted Automotive Parts Sourcing in Europe"
        description="Learn how MotorVault supports fitment-first automotive parts sourcing across Europe, including guidance for Dutch searches such as motorblokken auto and auto motorblok kopen."
        keywords={[
          'motorvault',
          'automotive parts sourcing',
          'motorblokken auto',
          'auto motorblokken',
          'motorparts nederland',
          'auto motorblok kopen',
        ]}
        faqData={[
          {
            question: 'Kan ik via MotorVault auto motorblokken aanvragen in Nederland?',
            answer:
              'Ja. MotorVault ondersteunt Nederlandse klanten met fitment-first begeleiding voor motorblokken auto op basis van voertuigdetails.',
          },
          {
            question: 'Biedt MotorVault motorparts Nederland met OEM en aftermarket keuzes?',
            answer:
              'Ja. We helpen je OEM en aftermarket opties vergelijken op beschikbaarheid, prijs en fitment-risico.',
          },
        ]}
        canonical="/about"
      />

      <div className="min-h-screen bg-white">
        <AboutHeroSlideshow />

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700 mb-4">
                About MotorVault
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-950 leading-tight">
                Answers first: fitment, part quality, and post-purchase support.
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-700 leading-relaxed">
                MotorVault exists to reduce costly guesswork in auto-parts buying. We focus on fitment confidence, realistic part-option guidance (OEM vs aftermarket vs used), and transparent policy support on returns, warranty, and delivery.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href={fitmentCheckHref}>
                  <a className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800">
                    Request VIN fitment check
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Link>
                <Link href="/faq">
                  <a className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-50">
                    Compare buying FAQs
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 sm:p-8 shadow-sm">
              <div className="rounded-2xl bg-white p-6 border border-gray-200">
                <p className="text-sm font-semibold text-blue-700 mb-2">What customers can expect</p>
                <ul className="space-y-4">
                  {trustPoints.map((point) => (
                    <li key={point} className="flex gap-3 text-gray-700">
                      <BadgeCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 rounded-2xl bg-gray-950 p-6 text-white">
                <p className="text-sm uppercase tracking-[0.25em] text-white/60 mb-3">Our promise</p>
                <p className="text-base leading-relaxed text-white/90">
                  We do not want customers to guess. We want them to know fitment confidence, part-type tradeoffs, and support terms before they pay.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {sourcingSteps.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-950">{item.title}</h2>
                  <p className="mt-3 text-gray-700 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-slate-950 p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60 mb-4">
                How we work
              </p>
              <h2 className="text-3xl font-bold">Simple, careful, and accountable.</h2>
              <div className="mt-6 space-y-5 text-white/85 leading-relaxed">
                <p>
                  We operate across Europe, including Albania, Andorra, Armenia, Austria, Azerbaijan, Belarus, Belgium, Bosnia and Herzegovina, Bulgaria, Croatia, Cyprus, Czechia, Denmark, Estonia, Finland, France, Georgia, Germany, Greece, Hungary, Iceland, Ireland, Italy, Kosovo, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Moldova, Monaco, Montenegro, Netherlands, North Macedonia, Norway, Poland, Portugal, Romania, Russia, San Marino, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, Turkey, Ukraine, United Kingdom, and Vatican City.
                </p>
                <p>
                  Our process is designed to reduce wrong-part orders. We validate identifiers and listing details so buyers can make decisions with less uncertainty.
                </p>
                <p>
                  If something goes wrong after delivery, we provide practical support for fitment issues, damaged shipments, and eligible returns/warranty claims.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700 mb-4">
                Why choose us
              </p>
              <h2 className="text-3xl font-bold text-gray-950">Built around transparency.</h2>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Our customers should not need to chase basic answers. We structure content around the questions buyers ask most before ordering.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Fitment and compatibility concerns addressed up front',
                  'OEM vs aftermarket vs used tradeoffs explained clearly',
                  'Return, warranty, and delivery expectations made visible early',
                  'Direct support for custom sourcing and unknown part identification',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-blue-700" />
                    <span className="text-gray-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {serviceHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                  <Icon className="h-8 w-8 text-blue-700" />
                  <h3 className="mt-4 text-xl font-bold text-gray-950">{item.title}</h3>
                  <p className="mt-3 text-gray-700 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-16 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-700 to-slate-900 p-8 sm:p-10 text-white">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60 mb-3">
                  Next step
                </p>
                <h2 className="text-3xl sm:text-4xl font-black">Need a part listed or want to ask a question?</h2>
                <p className="mt-4 text-white/85 leading-relaxed">
                  Visit FAQs for fitment, part-quality options, pricing confidence, and returns/warranty guidance, or contact us directly for a VIN-based fitment check.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/faq">
                  <a className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-blue-800 transition-colors hover:bg-blue-50">
                    Visit FAQs
                    <CircleHelp className="h-4 w-4" />
                  </a>
                </Link>
                <Link href={fitmentCheckHref}>
                  <a className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10">
                    Request fitment check
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Link>
              </div>
            </div>
          </div>

          <section className="mt-18 py-12 sm:py-16 lg:py-18">
            <BannerCarousel
              slides={aboutBannerSlides}
              tone="dark"
            />
          </section>

          <section className="mt-4 border-t border-gray-200 pt-12 sm:pt-14">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700 mb-3">
                  Partners
                </p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-950">
                  Working with trusted automotive partners.
                </h2>
                <p className="mt-4 text-gray-700 leading-relaxed">
                  Our partner network helps us strengthen sourcing, availability, and specialist automotive support for customers looking for the right parts.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {partners.map((partner) => (
                  <a
                    key={partner.name}
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[190px] flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 sm:p-8"
                  >
                    <div className="flex min-h-24 items-center justify-center rounded-2xl bg-gray-50 px-4 py-5">
                      <img
                        src={partner.logo}
                        alt={`${partner.name} trusted automotive recycling partner logo`}
                        className="h-auto max-h-24 w-full max-w-[320px] object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <span className="font-semibold text-gray-950">{partner.name}</span>
                      <ExternalLink className="h-4 w-4 flex-none text-blue-700 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-10 border-t border-gray-200 pt-8 sm:pt-10">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dutch Support</p>
              <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">
                Netherlands-focused sourcing guidance
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-700 max-w-3xl">
                For users searching terms like motorblokken auto, auto motorblokken, or auto motorblok kopen, we provide a dedicated Dutch page with fitment-focused guidance.
              </p>
              <div className="mt-4">
                <Link href="/nl/auto-motorblokken">
                  <a className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                    View Dutch motorblokken page
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Link>
              </div>
            </div>
          </section>
        </section>
      </div>
    </>
  );
}
