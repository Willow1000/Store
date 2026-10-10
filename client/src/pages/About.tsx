import { SEOHead } from "@/components/SEOHead";
import { AboutHeroSlideshow } from "@/components/AboutHeroSlideshow";
import { Link } from "wouter";
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
} from "lucide-react";
import { BannerCarousel } from "@/components/BannerCarousel";
import { SectionHeader } from "@/components/SectionHeader";

const aboutBannerSlides = [
  {
    image: "/images/banners/rare-european-auto-parts-about-banner.avif",
    imageWebp: "/images/banners/rare-european-auto-parts-about-banner.webp",
    imageAlt:
      "Auto parts sourcing support and buyer guidance for hard-to-find components",
    title: "Fitment Confidence Before Checkout",
    subtitle:
      "Start with VIN, part numbers, and compatibility guidance so you avoid wrong-part orders.",
    cta: "Check fitment FAQs",
    ctaLink: "/faq",
  },
  {
    image: "/images/banners/europe-wide-auto-parts-shipping-about-banner.avif",
    imageWebp:
      "/images/banners/europe-wide-auto-parts-shipping-about-banner.webp",
    imageAlt:
      "Europe-wide automotive spare parts shipping and logistics coverage for fast delivery",
    title: "Clear Shipping, Returns, and Warranty Expectations",
    subtitle:
      "Know timing, policy coverage, and support steps before you place your order.",
    cta: "Talk to support",
    ctaLink: "/contact",
  },
];

const sourcingSteps = [
  {
    title: "Fitment-first sourcing",
    description:
      "We prioritize compatibility evidence first: VIN context, part numbers, model/year/engine data, and supplier notes before recommending options.",
    icon: Globe2,
  },
  {
    title: "Practical quality selection",
    description:
      "We help customers choose between OEM, premium aftermarket, standard aftermarket, and verified used options based on risk, labor cost, and budget.",
    icon: PackageSearch,
  },
  {
    title: "Transparent buying details",
    description:
      "Listings are built to answer the questions buyers ask most: fitment certainty, what is included, return eligibility, and warranty expectations.",
    icon: ClipboardList,
  },
];

const serviceHighlights = [
  {
    title: "Fitment help for uncertain buyers",
    description:
      "If you are not sure what to buy, we can guide you using VIN and part details so you are not forced to guess based on generic listings.",
    icon: Truck,
  },
  {
    title: "Warranty and returns clarity",
    description:
      "We explain return and warranty expectations clearly because policy clarity is one of the biggest concerns in auto-parts buying.",
    icon: ShieldCheck,
  },
  {
    title: "Customer-led part discovery",
    description:
      "When parts are hard to identify or unavailable, customers can request sourcing directly with vehicle and part references.",
    icon: Users,
  },
];

const trustPoints = [
  "VIN and fitment-minded guidance before purchase",
  "Clear OEM vs aftermarket vs used part positioning",
  "Upfront support on returns, warranty, and delivery timing",
  "Sourcing help for hard-to-find OEM and used parts for European makes",
];

function buildFitmentCheckHref() {
  const subject = "VIN fitment check before purchase";
  const message =
    "Hello MotorVault team,\n\nPlease help confirm fitment before I buy.\n\nVehicle details:\n- VIN:\n- Make/Model/Year:\n- Engine/Trim:\n\nPart details:\n- Part name:\n- Part number (if known):\n- Photos (if available):\n\nThank you.";
  const params = new URLSearchParams({
    subject,
    message,
    enquiry: "1",
  });
  return `/contact?${params.toString()}`;
}

const transparencyPoints = [
  "Fitment and compatibility concerns addressed up front",
  "OEM vs aftermarket vs used tradeoffs explained clearly",
  "Return, warranty, and delivery expectations made visible early",
  "Direct support for custom sourcing and unknown part identification",
];

// Existing policy and help pages, linked from the support section.
const policyLinks = [
  { href: "/shipping", label: "Shipping Info" },
  { href: "/returns", label: "Returns" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact Us" },
  { href: "/vin-decoder", label: "VIN Decoder" },
  { href: "/blog", label: "Blog" },
];

const partners = [
  {
    name: "The Scrappers Ltd",
    logo: "/images/partners/trusted-auto-parts-recycling-partner-the-scrappers.webp",
    url: "https://www.thescrappers.co.uk/",
  },
];

function buildListingRequestHref() {
  const subject = "Request to list a specific part";
  const message =
    "Hello MotorVault team,\n\nI would like to request that a specific part be listed on your platform.\n\nPart details:\n- Part name:\n- Vehicle make/model/year:\n- OEM or aftermarket preference:\n- Any part numbers or photos:\n\nThank you.";
  const params = new URLSearchParams({
    subject,
    message,
    enquiry: "1",
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
        title="About MotorVault | Auto Parts Sourcing & Fitment Checks"
        description="MotorVault sells accessories and parts for trucks, Jeeps and Teslas, plus OEM and used parts for European makes. Learn how we check fitment and handle shipping and returns."
        keywords={[
          "motorvault",
          "automotive parts sourcing",
          "motorblokken auto",
          "auto motorblokken",
          "motorparts nederland",
          "auto motorblok kopen",
        ]}
        faqData={[
          {
            question:
              "Kan ik via MotorVault auto motorblokken aanvragen in Nederland?",
            answer:
              "Ja. MotorVault ondersteunt Nederlandse klanten met fitment-first begeleiding voor motorblokken auto op basis van voertuigdetails.",
          },
          {
            question:
              "Biedt MotorVault motorparts Nederland met OEM en aftermarket keuzes?",
            answer:
              "Ja. We helpen je OEM en aftermarket opties vergelijken op beschikbaarheid, prijs en fitment-risico.",
          },
        ]}
        canonical="/about"
      />

      <div className="min-h-screen w-full overflow-x-clip bg-white">
        <AboutHeroSlideshow />

        {/* 1. Who we are */}
        <section className="section bg-white">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-14">
              <div>
                <p className="eyebrow">About MotorVault</p>
                <h1 className="mt-3 text-ink">
                  Answers first: fitment, part quality, and post-purchase
                  support.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-700 sm:text-lg">
                  MotorVault exists to reduce costly guesswork in auto-parts
                  buying. We focus on fitment confidence, realistic part-option
                  guidance (OEM vs aftermarket vs used), and transparent policy
                  support on returns, warranty, and delivery.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href={fitmentCheckHref} className="btn-primary btn-lg">
                    Request VIN fitment check
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href="/faq" className="btn-secondary btn-lg">
                    Compare buying FAQs
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="bg-white p-5 sm:p-6">
                  <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">
                    What customers can expect
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {trustPoints.map(point => (
                      <li
                        key={point}
                        className="flex gap-3 text-[15px] leading-snug text-gray-700"
                      >
                        <BadgeCheck
                          className="mt-0.5 h-5 w-5 flex-none text-success"
                          aria-hidden="true"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-950 p-5 text-white sm:p-6">
                  <p className="eyebrow !text-white/60">Our promise</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/90">
                    We do not want customers to guess. We want them to know
                    fitment confidence, part-type tradeoffs, and support terms
                    before they pay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. What we sell and how we source and check it */}
        <section className="section border-t border-gray-200 bg-gray-50">
          <div className="container">
            <SectionHeader
              eyebrow="How we work"
              title="Simple, careful, and accountable."
              description="Our process is designed to reduce wrong-part orders. We validate identifiers and listing details so buyers can make decisions with less uncertainty."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {sourcingSteps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-ink">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span
                        className="price text-sm font-semibold text-gray-400"
                        aria-hidden="true"
                      >
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. Why choose us + where we operate */}
        <section className="section bg-white">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <p className="eyebrow">Why choose us</p>
                <h2 className="mt-2 text-ink">Built around transparency.</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-700 sm:text-base">
                  Our customers should not need to chase basic answers. We
                  structure content around the questions buyers ask most before
                  ordering.
                </p>
                <ul className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
                  {transparencyPoints.map(item => (
                    <li
                      key={item}
                      className="flex items-start gap-3 py-3.5 text-[15px] text-gray-800"
                    >
                      <ShieldCheck
                        className="mt-0.5 h-5 w-5 flex-none text-ink"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="self-start rounded-xl bg-gray-950 p-6 text-white sm:p-8">
                <p className="eyebrow !text-white/60">Where we operate</p>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  We operate across Europe, including Albania, Andorra, Armenia,
                  Austria, Azerbaijan, Belarus, Belgium, Bosnia and Herzegovina,
                  Bulgaria, Croatia, Cyprus, Czechia, Denmark, Estonia, Finland,
                  France, Georgia, Germany, Greece, Hungary, Iceland, Ireland,
                  Italy, Kosovo, Latvia, Liechtenstein, Lithuania, Luxembourg,
                  Malta, Moldova, Monaco, Montenegro, Netherlands, North
                  Macedonia, Norway, Poland, Portugal, Romania, Russia, San
                  Marino, Serbia, Slovakia, Slovenia, Spain, Sweden,
                  Switzerland, Turkey, Ukraine, United Kingdom, and Vatican
                  City.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Shipping, returns and support */}
        <section className="section border-t border-gray-200 bg-gray-50">
          <div className="container">
            <SectionHeader
              eyebrow="Support"
              title="Shipping, returns, and help after you order."
              description="If something goes wrong after delivery, we provide practical support for fitment issues, damaged shipments, and eligible returns/warranty claims."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {serviceHighlights.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-ink">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {policyLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
                >
                  {link.label}
                  <ArrowRight
                    className="h-3.5 w-3.5 text-gray-500"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section bg-white">
          <BannerCarousel slides={aboutBannerSlides} tone="dark" />
        </section>

        {/* 5. Partners */}
        <section className="section border-t border-gray-200 bg-white">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14">
              <div>
                <p className="eyebrow">Partners</p>
                <h2 className="mt-2 text-ink">
                  Working with trusted automotive partners.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-700 sm:text-base">
                  Our partner network helps us strengthen sourcing,
                  availability, and specialist automotive support for customers
                  looking for the right parts.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {partners.map(partner => (
                  <a
                    key={partner.name}
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-400"
                  >
                    <div className="flex min-h-24 items-center justify-center rounded-lg bg-gray-50 px-4 py-5">
                      <img
                        src={partner.logo}
                        alt={`${partner.name} trusted automotive recycling partner logo`}
                        className="h-auto max-h-20 w-full max-w-[280px] object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-ink">
                        {partner.name}
                      </span>
                      <ExternalLink
                        className="h-4 w-4 flex-none text-gray-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                        aria-hidden="true"
                      />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Dutch support */}
            <div className="mt-10 flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <p className="eyebrow">Dutch Support</p>
                <h2 className="mt-1.5 text-lg font-bold text-ink sm:text-xl">
                  Netherlands-focused sourcing guidance
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-gray-700">
                  Looking for a replacement engine (motorblok) in the
                  Netherlands? Our Dutch-language page explains how we check
                  fitment before you order.
                </p>
              </div>
              <Link
                href="/nl/auto-motorblokken"
                className="btn-secondary flex-none whitespace-normal py-2"
              >
                View Dutch motorblokken page
                <ArrowRight className="h-4 w-4 flex-none" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* 6. Next step */}
        <section className="bg-gray-950 text-white">
          <div className="container py-12 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-14">
              <div>
                <p className="eyebrow !text-white/60">Next step</p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
                  Need a part listed or want to ask a question?
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">
                  Visit FAQs for fitment, part-quality options, pricing
                  confidence, and returns/warranty guidance, or contact us
                  directly for a VIN-based fitment check.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/products" className="btn-accent btn-lg">
                  All Products
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href={fitmentCheckHref}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-gray-200"
                  >
                    Request fitment check
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/faq"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Visit FAQs
                    <CircleHelp className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <Link
                  href={listingRequestHref}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 text-sm font-medium text-white/80 underline underline-offset-4 hover:text-white"
                >
                  Request to list a specific part
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
