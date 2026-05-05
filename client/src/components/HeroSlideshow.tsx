'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

interface Slide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  description: string;
}

const slides: Slide[] = [
  {
    id: 1,
    image: '/images/hero/high_quality_motor_parts_2K_202605050023.jpeg',
    title: 'Premium Motor Parts Quality',
    subtitle: 'Precision-engineered components for peak performance',
    cta: 'Shop Motor Parts',
    ctaLink: '/products',
    description: 'Discover our extensive collection of high-quality motor parts and components'
  },
  {
    id: 2,
    image: '/images/hero/professionals_inspecting_the_motor_parts_202605050024.jpeg',
    title: 'Expert Inspection & Certification',
    subtitle: 'Every part verified by certified professionals',
    cta: 'Learn More',
    ctaLink: '/about',
    description: 'Trust in quality - all parts meet industry standards'
  },
  {
    id: 3,
    image: '/images/hero/professional_installation_of_motor_parts_202605050032.jpeg',
    title: 'Professional Installation Support',
    subtitle: 'Expert guidance from certified mechanics',
    cta: 'Get Support',
    ctaLink: '/help',
    description: 'We help you every step of the way with installation tips and expert advice'
  },
];

export function HeroSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance slides every 6 seconds
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
    <div className="relative w-full h-screen max-h-[600px] bg-gray-900 overflow-hidden -mt-0">
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
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
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
          <p className="text-lg sm:text-xl md:text-2xl text-gray-100 mb-6 drop-shadow-md">
            {activeSlide.subtitle}
          </p>

          {/* Description */}
          <p className="text-base sm:text-lg text-gray-200 mb-8 drop-shadow-md max-w-xl mx-auto">
            {activeSlide.description}
          </p>

          {/* CTA Button */}
          <Link href={activeSlide.ctaLink}>
            <a className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl">
              {activeSlide.cta}
            </a>
          </Link>
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
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Mobile Hint */}
      <div className="absolute top-4 right-4 text-white text-xs bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm hidden sm:block">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  );
}
