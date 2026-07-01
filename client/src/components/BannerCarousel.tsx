'use client';

import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export interface BannerSlide {
  image: string;
  imageWebp?: string;
  imageAlt?: string;
  title: string;
  subtitle: string;
  cta?: string;
  ctaLink?: string;
}

interface BannerCarouselProps {
  title?: string;
  subtitle?: string;
  slides: BannerSlide[];
  tone?: 'dark' | 'light';
}

export function BannerCarousel({ title, subtitle, slides, tone = 'dark' }: BannerCarouselProps) {
  const [api, setApi] = useState<any>(null);

  useEffect(() => {
    if (!api || slides.length <= 1) return;

    const timer = window.setInterval(() => {
      if (api.canScrollNext?.()) {
        api.scrollNext();
      } else {
        api.scrollTo?.(0);
      }
    }, 5500);

    return () => window.clearInterval(timer);
  }, [api, slides.length]);

  return (
    <section className="w-full">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        {(title || subtitle) ? (
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {title ? <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-700">{title}</p> : null}
              {subtitle ? <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">{subtitle}</h2> : null}
            </div>
          </div>
        ) : null}

        <Carousel className="w-full" opts={{ loop: true }} setApi={setApi}>
          <CarouselContent>
            {slides.map((slide) => (
              <CarouselItem key={slide.image}>
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]">
                  <div className="grid gap-0 lg:grid-cols-[1fr_0.95fr]">
                    <div className="relative min-h-[260px] sm:min-h-[340px] lg:min-h-[440px]">
                      <picture>
                        {slide.image.endsWith('.avif') && slide.imageWebp ? (
                          <source srcSet={slide.image} type="image/avif" />
                        ) : null}
                        {slide.imageWebp ? <source srcSet={slide.imageWebp} type="image/webp" /> : null}
                        <img
                          src={slide.imageWebp || slide.image}
                          alt={slide.imageAlt || slide.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </picture>
                      <div
                        className={`absolute inset-0 ${
                          tone === 'dark'
                            ? 'bg-gradient-to-r from-slate-950/60 via-slate-950/15 to-transparent'
                            : 'bg-gradient-to-r from-white/30 via-white/0 to-transparent'
                        }`}
                      />
                    </div>
                    <div
                      className={`flex items-center p-8 sm:p-10 lg:p-12 ${
                        tone === 'dark'
                          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white'
                          : 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-950'
                      }`}
                    >
                      <div className="max-w-xl">
                        <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">{slide.title}</h3>
                        <p className={`mt-4 text-base sm:text-lg leading-relaxed ${tone === 'dark' ? 'text-white/80' : 'text-slate-700'}`}>
                          {slide.subtitle}
                        </p>
                        {slide.cta && slide.ctaLink ? (
                          <div className="mt-7">
                            <Link
                              href={slide.ctaLink}
                              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
                                tone === 'dark'
                                  ? 'bg-white text-slate-950 hover:bg-slate-100'
                                  : 'bg-slate-950 text-white hover:bg-slate-800'
                              }`}
                            >
                              {slide.cta}
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4 border-white/20 bg-white/80 text-slate-950 shadow-lg hover:bg-white" />
          <CarouselNext className="right-4 border-white/20 bg-white/80 text-slate-950 shadow-lg hover:bg-white" />
        </Carousel>
      </div>
    </section>
  );
}
