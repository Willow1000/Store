"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

interface Slide {
  id: number;
  image: string;
  imageWebp: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  description: string;
}

/**
 * Hero photos are 2752px wide; phones were downloading all of it to fill a
 * 400px-wide banner. Each has 828, 1280 and 1920px versions beside it
 * ("name-828.avif"), offered through srcset.
 */
const HERO_WIDTHS = [828, 1280, 1920];

function heroVariant(path: string, width: number): string {
  return path.replace(/\.(avif|webp)$/, `-${width}.$1`);
}

function heroSrcSet(path: string): string {
  return [
    ...HERO_WIDTHS.map(width => `${heroVariant(path, width)} ${width}w`),
    `${path} 2752w`,
  ].join(", ");
}

const slides: Slide[] = [
  {
    id: 1,
    image: "/images/hero/premium-european-auto-parts-hero.avif",
    imageWebp: "/images/hero/premium-european-auto-parts-hero.webp",
    imageAlt: "Car parts including OEM and aftermarket components",
    title: "Find The Right Part First Time",
    subtitle: "VIN-aware sourcing, fitment support, and clear options",
    cta: "Start with fitment-safe parts",
    ctaLink: "/products",
    description:
      "Not sure about exact model details? Shop with confidence using compatibility-focused listings and support.",
  },
  {
    id: 2,
    image: "/images/hero/certified-auto-parts-inspection-hero.avif",
    imageWebp: "/images/hero/certified-auto-parts-inspection-hero.webp",
    imageAlt: "Technicians inspecting auto parts for quality assurance",
    title: "OEM, Aftermarket, or Used?",
    subtitle: "Choose by quality tier, budget, and repair priority",
    cta: "Compare part options",
    ctaLink: "/faq",
    description:
      "Understand the real differences before you buy, including where premium options make the most sense.",
  },
  {
    id: 3,
    image: "/images/hero/professional-auto-parts-installation-hero.avif",
    imageWebp: "/images/hero/professional-auto-parts-installation-hero.webp",
    imageAlt: "Professional mechanic installing automotive replacement parts",
    title: "DIY Or Mechanic?",
    subtitle: "Know when to install yourself and when to get pro help",
    cta: "See practical guidance",
    ctaLink: "/help",
    description:
      "Use clearer buying and installation decisions for safety-critical and specification-sensitive parts.",
  },
  {
    id: 4,
    image: "/images/hero/home-hero-section-last-image.avif",
    imageWebp: "/images/hero/home-hero-section-last-image.avif",
    imageAlt: "Featured automotive parts displayed in a showroom setting",
    title: "Know Returns, Warranty, and Delivery Upfront",
    subtitle: "Transparent policies before you commit",
    cta: "Review key FAQs",
    ctaLink: "/products",
    description:
      "See fitment support, shipping expectations, and return guidance so there are fewer surprises after purchase.",
  },
];

export function HeroSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance slides every 6 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of user interaction
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % slides.length);
  };

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  };

  const activeSlide = slides[currentSlide];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative h-[380px] w-full overflow-hidden bg-gray-950 sm:h-[480px] lg:h-[540px]"
    >
      {/* Slides Container */}
      <div className="relative h-full w-full">
        <div
          key={activeSlide.id}
          className="absolute inset-0 animate-in fade-in duration-700"
        >
          {/* Background Image */}
          {/* The first slide is the page's largest paint. Its image sits
              inside <picture>, which React does not preload on its own. */}
          {currentSlide === 0 && (
            <link
              rel="preload"
              as="image"
              type="image/avif"
              imageSrcSet={heroSrcSet(activeSlide.image)}
              imageSizes="100vw"
              fetchPriority="high"
            />
          )}
          <picture>
            <source
              srcSet={heroSrcSet(activeSlide.image)}
              sizes="100vw"
              type="image/avif"
            />
            <source
              srcSet={heroSrcSet(activeSlide.imageWebp)}
              sizes="100vw"
              type={
                activeSlide.imageWebp.endsWith(".avif")
                  ? "image/avif"
                  : "image/webp"
              }
            />
            <img
              src={heroVariant(activeSlide.imageWebp, 1280)}
              alt={activeSlide.imageAlt}
              width={2752}
              height={1536}
              className="h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>

          {/* Scrim: dark on the text side, clear on the photo side */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/55 to-gray-950/30 md:bg-gradient-to-r md:from-gray-950/90 md:via-gray-950/60 md:to-transparent" />
        </div>
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-end md:items-center">
        <div className="container pb-16 text-white md:pb-0">
          {/* The page's single, stable H1. Slide copy below rotates, so it is
              display text rather than a heading. */}
          <h1 className="eyebrow !text-white/80">
            OEM and aftermarket auto parts online
          </h1>
          <div
            key={activeSlide.id}
            className="max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {/* Slide title */}
            <p className="mt-3 font-display text-[2rem] font-extrabold leading-[1.05] tracking-[-0.015em] sm:text-5xl lg:text-[3.5rem]">
              {activeSlide.title}
            </p>

            {/* Subtitle */}
            <p className="mt-4 max-w-lg text-[15px] font-medium leading-snug text-white sm:text-lg">
              {activeSlide.subtitle}
            </p>

            {/* Description */}
            <p className="mt-2 hidden max-w-lg text-[15px] leading-relaxed text-white/80 sm:block">
              {activeSlide.description}
            </p>

            {/* CTA Button */}
            <Link
              href={activeSlide.ctaLink}
              className="btn-accent btn-lg mt-6 max-w-full whitespace-normal py-2 text-left"
            >
              {activeSlide.cta}
              <ChevronRight className="h-4 w-4 flex-none" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* Controls: slide position + arrows, grouped out of the way of the copy */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="container flex items-center justify-between pb-4">
          <div className="flex items-center">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="flex h-11 w-9 items-center justify-center first:-ml-3"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide ? "true" : undefined}
              >
                <span
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "w-7 bg-white"
                      : "w-4 bg-white/40 hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
            <span className="price ml-2 hidden text-xs font-medium text-white/70 sm:inline">
              {currentSlide + 1} / {slides.length}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={prevSlide}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-ink"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextSlide}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-ink"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
