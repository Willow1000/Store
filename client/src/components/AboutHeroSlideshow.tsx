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
}

const slides: Slide[] = [
  {
    id: 1,
    image: "/images/hero/global-auto-parts-sourcing-team-hero.avif",
    imageWebp: "/images/hero/global-auto-parts-sourcing-team-hero.webp",
    imageAlt: "Automotive sourcing team handling car parts procurement",
    title: "Fitment Confidence Starts Here",
    subtitle:
      "Use VIN and part identifiers to reduce wrong-part risk before checkout.",
  },
  {
    id: 2,
    image: "/images/hero/worldwide-auto-parts-shipping-team-hero.avif",
    imageWebp: "/images/hero/worldwide-auto-parts-shipping-team-hero.webp",
    imageAlt: "Shipping support team for auto spare parts delivery",
    title: "Know OEM vs Aftermarket vs Used",
    subtitle:
      "Choose the right quality tier for your budget, labor cost, and reliability target.",
  },
  {
    id: 3,
    image: "/images/hero/trusted-automotive-parts-network-hero.avif",
    imageWebp: "/images/hero/trusted-automotive-parts-network-hero.webp",
    imageAlt: "Automotive parts network supporting garages and drivers",
    title: "Clear Policy Answers Before You Buy",
    subtitle:
      "Understand returns, warranty coverage, and delivery expectations up front.",
  },
  {
    id: 4,
    image: "/images/hero/about-hero-section-last-image.avif",
    imageWebp: "/images/hero/about-hero-section-last-image.avif",
    imageAlt:
      "MotorVault team coordinating sourcing, support, and quality checks for automotive parts",
    title: "Built To Answer Real Buyer Questions",
    subtitle:
      "From part identification to post-purchase support, we keep the process transparent.",
  },
];

export function AboutHeroSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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
      aria-label="About MotorVault"
      className="relative h-[400px] w-full overflow-hidden bg-gray-950 sm:h-[440px] lg:h-[480px]"
    >
      {/* Slides Container */}
      <div className="relative h-full w-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Background Image */}
            <picture>
              <source srcSet={slide.image} type="image/avif" />
              <source srcSet={slide.imageWebp} type="image/webp" />
              <img
                src={slide.imageWebp}
                alt={slide.imageAlt}
                className="h-full w-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
              />
            </picture>

            {/* Scrim: dark on the text side, clear on the photo side */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/55 to-gray-950/30 md:bg-gradient-to-r md:from-gray-950/90 md:via-gray-950/60 md:to-transparent" />
          </div>
        ))}
      </div>

      {/* Content Overlay. The slide copy is display text, not a heading: the
          page's single H1 is the "About MotorVault" statement below. */}
      <div className="absolute inset-0 flex items-end md:items-center">
        <div className="container pb-16 text-white md:pb-0">
          <div
            key={activeSlide.id}
            className="max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <p className="eyebrow !text-white/80">About MotorVault</p>

            {/* Main Title */}
            <p className="mt-3 font-display text-[2rem] font-extrabold leading-[1.05] tracking-[-0.015em] sm:text-5xl lg:text-[3.5rem]">
              {activeSlide.title}
            </p>

            {/* Subtitle */}
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85 sm:text-lg">
              {activeSlide.subtitle}
            </p>

            <Link
              href="/products"
              className="btn-accent btn-lg mt-6 max-w-full whitespace-normal py-2 text-left"
            >
              All Products
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
