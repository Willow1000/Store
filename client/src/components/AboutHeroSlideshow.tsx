'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    image: '/images/hero/global-auto-parts-sourcing-team-hero.avif',
    imageWebp: '/images/hero/global-auto-parts-sourcing-team-hero.webp',
    imageAlt: 'Automotive sourcing team handling rare European car parts procurement',
    title: 'Global Auto Parts Sourcing',
    subtitle: 'Connecting customers worldwide with trusted OEM and aftermarket vehicle parts',
  },
  {
    id: 2,
    image: '/images/hero/worldwide-auto-parts-shipping-team-hero.avif',
    imageWebp: '/images/hero/worldwide-auto-parts-shipping-team-hero.webp',
    imageAlt: 'Worldwide shipping support team for European auto spare parts delivery',
    title: 'Worldwide Shipping Solutions',
    subtitle: 'Fast, reliable international delivery for new and used automotive spare parts',
  },
  {
    id: 3,
    image: '/images/hero/trusted-automotive-parts-network-hero.avif',
    imageWebp: '/images/hero/trusted-automotive-parts-network-hero.webp',
    imageAlt: 'Trusted European automotive parts network supporting garages and drivers',
    title: 'Trusted Automotive Network',
    subtitle: 'Helping drivers, garages, and dealers source quality vehicle components globally',
  },
  {
    id: 4,
    image: '/images/hero/about-hero-section-last-image.avif',
    imageWebp: '/images/hero/about-hero-section-last-image.avif',
    imageAlt: 'MotorVault team coordinating sourcing, support, and quality checks for automotive parts',
    title: 'Built Around Clarity and Support',
    subtitle: 'From sourcing to delivery, our team keeps every step transparent',
  },
];

export function AboutHeroSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
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
    <div className="relative w-full h-screen max-h-[600px] bg-gray-900 overflow-hidden">
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Image */}
            <picture>
              <source srcSet={slide.image} type="image/avif" />
              <source srcSet={slide.imageWebp} type="image/webp" />
              <img
                src={slide.imageWebp}
                alt={slide.imageAlt}
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            </picture>

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/50 mix-blend-multiply" />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white px-4 sm:px-6 lg:px-8 max-w-2xl">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">
            {activeSlide.title}
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-100 drop-shadow-md">
            {activeSlide.subtitle}
          </p>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-colors duration-200 backdrop-blur-sm"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-colors duration-200 backdrop-blur-sm"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`relative p-4 -m-4 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-300 ${
              index === currentSlide
                ? ''
                : ''
            }`}
            aria-label={`Go to slide ${index + 1}`}
          >
            <span
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Mobile Hint */}
      <div className="absolute top-4 right-4 text-white text-xs bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm hidden sm:block">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  );
}
