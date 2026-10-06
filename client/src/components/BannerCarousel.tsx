"use client";

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
  tone?: "dark" | "light";
}

export function BannerCarousel({
  title,
  subtitle,
  slides,
  tone = "dark",
}: BannerCarouselProps) {
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
      <div className="container">
        {title || subtitle ? (
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {title ? <p className="eyebrow">{title}</p> : null}
              {subtitle ? (
                <h2 className="mt-1.5 text-[1.375rem] font-bold leading-tight text-ink sm:text-2xl">
                  {subtitle}
                </h2>
              ) : null}
            </div>
          </div>
        ) : null}

        <Carousel className="w-full" opts={{ loop: true }} setApi={setApi}>
          <CarouselContent>
            {slides.map(slide => (
              <CarouselItem key={slide.image}>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="grid gap-0 md:grid-cols-2">
                    <div className="relative min-h-[200px] sm:min-h-[260px] md:min-h-[340px] lg:min-h-[380px]">
                      <picture>
                        {slide.image.endsWith(".avif") && slide.imageWebp ? (
                          <source srcSet={slide.image} type="image/avif" />
                        ) : null}
                        {slide.imageWebp ? (
                          <source srcSet={slide.imageWebp} type="image/webp" />
                        ) : null}
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
                          tone === "dark"
                            ? "bg-gradient-to-t from-gray-950/40 to-transparent md:bg-gradient-to-l"
                            : "bg-gradient-to-r from-white/30 via-white/0 to-transparent"
                        }`}
                      />
                    </div>
                    <div
                      className={`flex items-center p-6 sm:p-8 lg:p-12 ${
                        tone === "dark"
                          ? "bg-gray-950 text-white"
                          : "bg-gray-50 text-ink"
                      }`}
                    >
                      <div className="max-w-xl">
                        <h3 className="text-2xl font-bold leading-[1.1] sm:text-3xl lg:text-4xl">
                          {slide.title}
                        </h3>
                        <p
                          className={`mt-3 text-[15px] leading-relaxed sm:text-base ${tone === "dark" ? "text-white/75" : "text-gray-700"}`}
                        >
                          {slide.subtitle}
                        </p>
                        {slide.cta && slide.ctaLink ? (
                          <div className="mt-6">
                            <Link
                              href={slide.ctaLink}
                              className={`inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors ${
                                tone === "dark"
                                  ? "bg-white text-ink hover:bg-gray-200"
                                  : "bg-ink text-white hover:bg-gray-800"
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
          <CarouselPrevious className="left-auto right-14 top-auto bottom-4 size-9 translate-y-0 border-gray-200 bg-white text-ink shadow-sm hover:bg-gray-100 sm:right-16 sm:bottom-5" />
          <CarouselNext className="right-4 top-auto bottom-4 size-9 translate-y-0 border-gray-200 bg-white text-ink shadow-sm hover:bg-gray-100 sm:right-5 sm:bottom-5" />
        </Carousel>
      </div>
    </section>
  );
}
