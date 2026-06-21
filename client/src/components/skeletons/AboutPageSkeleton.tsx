import { Skeleton } from '@/components/ui/skeleton';

export function AboutPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-screen max-h-[600px] w-full overflow-hidden bg-gray-900">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none bg-gray-800" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="mx-auto max-w-2xl space-y-5 text-center">
            <Skeleton className="mx-auto h-12 w-4/5 bg-white/20" />
            <Skeleton className="mx-auto h-7 w-3/4 bg-white/20" />
          </div>
        </div>
        <Skeleton className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15" />
        <Skeleton className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15" />
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className={`h-3 rounded-full bg-white/20 ${index === 0 ? 'w-8' : 'w-3'}`} />
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-14 w-full max-w-2xl" />
            <Skeleton className="h-14 w-5/6 max-w-xl" />
            <Skeleton className="h-6 w-full max-w-2xl" />
            <Skeleton className="h-6 w-11/12 max-w-xl" />
            <div className="flex flex-wrap gap-4 pt-3">
              <Skeleton className="h-12 w-32 rounded-full" />
              <Skeleton className="h-12 w-36 rounded-full" />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-8">
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
              <Skeleton className="h-4 w-44" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3 rounded-2xl bg-gray-950 p-6">
              <Skeleton className="h-4 w-28 bg-white/20" />
              <Skeleton className="h-5 w-full bg-white/20" />
              <Skeleton className="h-5 w-4/5 bg-white/20" />
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <Skeleton className="mb-4 h-12 w-12 rounded-2xl" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="mt-4 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-5/6" />
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 rounded-3xl bg-slate-950 p-8">
            <Skeleton className="h-4 w-32 bg-white/20" />
            <Skeleton className="h-9 w-3/4 bg-white/20" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-5 w-full bg-white/20" />
            ))}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-4 h-9 w-3/4" />
            <Skeleton className="mt-4 h-5 w-full" />
            <Skeleton className="mt-2 h-5 w-5/6" />
            <div className="mt-8 space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="mt-4 h-7 w-3/4" />
              <Skeleton className="mt-3 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-5/6" />
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-slate-900 p-8 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <Skeleton className="h-4 w-28 bg-white/20" />
              <Skeleton className="h-10 w-4/5 bg-white/20" />
              <Skeleton className="h-5 w-full bg-white/20" />
              <Skeleton className="h-5 w-5/6 bg-white/20" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Skeleton className="h-12 flex-1 rounded-full bg-white/20" />
              <Skeleton className="h-12 flex-1 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

