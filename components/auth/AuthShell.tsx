'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?fm=jpg&q=75&w=1600&auto=format&fit=crop`;

const SLIDES = [
  { src: unsplash('1663335654781-5ff2b8e2ec6a'), title: 'Catching Fire', course: 'The Origin of Food & Human Evolution', text: 'How mastering fire reshaped our bodies, our brains and the way we eat.', alt: 'A fire burning inside a brick oven' },
  { src: unsplash('1717518213121-0fea9afe8311'), title: 'Power at the Roman Table', course: 'Ancient Civilizations & Their Food Traditions', text: 'Banquets, grain and empire: how food built and held Rome together.', alt: 'Ruins of a Roman city covered in vegetation' },
  { src: unsplash('1753866551936-998e5fcf6d5f'), title: 'The First Harvests', course: 'The Origin of Food & Human Evolution', text: 'Wild grasses became crops, and settled civilizations followed.', alt: 'A golden wheat field ready for harvest' },
  { src: unsplash('1771747886583-477a35c6a0c7'), title: 'Markets and Trade', course: 'Ancient Civilizations & Their Food Traditions', text: 'Spices, grain and dried goods that travelled the ancient world.', alt: 'A market stall with dried goods' },
  { src: unsplash('1717518215340-0d1184c493fa'), title: 'A Taste of Antiquity', course: 'Ancient Civilizations & Their Food Traditions', text: 'Cuisine and customs of the Mediterranean, from Greece to Rome.', alt: 'Ruins of an ancient Mediterranean city' },
];

function CourseCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-rotate every 5s; restarts after manual navigation, pauses on hover.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [paused, index]);

  const go = (d: number) => setIndex((i) => (i + d + SLIDES.length) % SLIDES.length);
  const slide = SLIDES[index];

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-amber-800"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((sl, i) => (
        <img
          key={sl.src}
          src={sl.src}
          alt={i === index ? sl.alt : ''}
          aria-hidden={i === index ? undefined : true}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Scrim keeps the caption legible over any photo */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      <div className="absolute inset-x-0 bottom-0 p-4 lg:p-10 flex items-end justify-between gap-4">
        <div className="min-w-0 max-w-xl" aria-live="polite">
          <div className="text-xl lg:text-4xl font-semibold text-white lg:leading-[44px]">{slide.title}</div>
          <div className="mt-0.5 text-xs lg:text-base text-amber-200 font-semibold truncate">{slide.course}</div>
          <p className="hidden lg:block mt-2 text-base text-white/90">{slide.text}</p>
          <div className="hidden sm:flex items-center gap-1.5 mt-3 lg:mt-5">
            {SLIDES.map((sl, i) => (
              <button
                key={sl.src}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-8 bg-white' : 'w-4 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="w-9 h-9 rounded-full bg-white text-amber-800 flex items-center justify-center hover:bg-amber-100 transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="w-9 h-9 rounded-full bg-white text-amber-800 flex items-center justify-center hover:bg-amber-100 transition active:scale-95"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Split-screen layout shared by every authentication page: content on the left, course photos on the right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-white flex flex-col lg:grid lg:grid-cols-2">
      <section className="order-1 lg:order-2 bg-amber-800 h-[24dvh] min-h-[140px] max-h-[240px] lg:max-h-none lg:h-full shrink-0">
        <CourseCarousel />
      </section>

      <section className="order-2 lg:order-1 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden px-5 py-2 sm:px-10 lg:px-16 flex">
        {children}
      </section>
    </main>
  );
}
