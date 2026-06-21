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
    image: '/images/banners/Your_destination_for_autor_&_motor_parts_Aboutpage.jpeg',
    title: 'Your Destination for Hard-to-Find Parts',
    subtitle: 'A clear promise of sourcing help, straight answers, and the right part when the job cannot wait.',
    cta: 'Read FAQs',
    ctaLink: '/faq',
  },
  {
    image: '/images/banners/we_deliver_all_over_europe_banner_for_aboutpage.jpeg',
    title: 'Delivered Across Europe, Without the Guesswork',
    subtitle: 'We keep delivery practical and transparent so customers know what to expect before they order.',
    cta: 'Contact us',
    ctaLink: '/contact',
  },
];

const sourcingSteps = [
  {
    title: 'Trusted sourcing network',
    description:
      'We work with vetted vendors, distributors, suppliers, and individuals when the part and market conditions make sense.',
    icon: Globe2,
  },
  {
    title: 'Expert scrutiny',
    description:
      'Every part is reviewed by our team for quality, condition, compatibility, and listing accuracy before it goes live.',
    icon: PackageSearch,
  },
  {
    title: 'Transparent listing details',
    description:
      'We publish origin, specifications, and any available certification details so customers can make informed decisions.',
    icon: ClipboardList,
  },
];

const serviceHighlights = [
  {
    title: 'Europe-first, globally open',
    description:
      'We mainly operate within Europe, while remaining open to sourcing parts from other regions when that benefits availability or value.',
    icon: Truck,
  },
  {
    title: 'Warranty and support',
    description:
      'We stand behind what we sell with warranty coverage and a support team that helps resolve issues promptly and fairly.',
    icon: ShieldCheck,
  },
  {
    title: 'Customer-led inventory growth',
    description:
      'If a customer needs a specific part listed, we invite them to reach out so we can review the request and explore sourcing it.',
    icon: Users,
  },
];

const trustPoints = [
  'Transparent product details and origin information',
  'Inspection before listing, not after the fact',
  'Clear support for shipping, returns, and warranty claims',
  'Practical sourcing for European cars and parts platforms',
];

const partners = [
  {
    name: 'The Scrappers Ltd',
    logo: '/images/partners/the-scrappers.jpg',
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

  return (
    <>
      <SEOHead
        title="About MotorVault - Trusted Automotive Parts Sourcing"
        description="Learn how MotorVault sources, inspects, and lists automotive parts with transparency, warranty support, and customer-first service."
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
                Quality parts, clear sourcing, and support you can trust.
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-700 leading-relaxed">
                MotorVault exists to make buying automotive parts feel straightforward and reliable. We source from trusted vendors and suppliers, including individuals when appropriate, then inspect every item before it is listed. Our focus is transparency: product origin, specifications, and relevant certifications are presented as clearly as possible so customers know what they are buying.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/faq">
                  <a className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800">
                    Read FAQs
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Link>
                <Link href={listingRequestHref}>
                  <a className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-gray-900 hover:bg-gray-50">
                    Request a part
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
                  We do not want customers to guess. We want them to have enough information to compare, verify, and purchase with confidence.
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
                  We mainly operate within Europe, but we are open to sourcing from other regions when demand, availability, or quality makes that the better option.
                </p>
                <p>
                  Our process is designed to reduce surprises. We verify the part, confirm condition, capture the right details, and only then publish it on the platform.
                </p>
                <p>
                  If something goes wrong after delivery, we do not hide behind vague policies. We provide warranty support, claims handling, and practical help for shortages, fitment issues, damaged items, or incorrect shipments.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700 mb-4">
                Why choose us
              </p>
              <h2 className="text-3xl font-bold text-gray-950">Built around transparency.</h2>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Our customers should not need to chase basic information. That is why we aim to clearly show what a part is, where it came from, how it was checked, and what support exists if they need help later.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Authenticity and quality concerns addressed up front',
                  'Clear return and warranty expectations',
                  'Fast response when a customer needs support',
                  'Room for custom sourcing requests when the right part is missing',
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
                  Visit the FAQs for sourcing, warranty, returns, shipping, and payment answers, or contact us directly with a specific part request and we will review it.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/faq">
                  <a className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-blue-800 transition-colors hover:bg-blue-50">
                    Visit FAQs
                    <CircleHelp className="h-4 w-4" />
                  </a>
                </Link>
                <Link href={listingRequestHref}>
                  <a className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10">
                    Request listing
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
                        alt={`${partner.name} logo`}
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
        </section>
      </div>
    </>
  );
}
