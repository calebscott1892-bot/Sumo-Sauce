function SkeletonBar({ className = '' }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

/**
 * Skeleton placeholder for rikishi profile page.
 * Mirrors the layout: breadcrumbs, profile header, chart, career table, kimarite, h2h, recent basho.
 */
export default function RikishiProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <SkeletonBar className="h-4 w-12" />
        <SkeletonBar className="h-4 w-14" />
        <SkeletonBar className="h-4 w-20" />
      </div>

      {/* Profile header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-4">
          <SkeletonBar className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className="h-7 w-48" />
            <SkeletonBar className="h-4 w-32" />
            <SkeletonBar className="h-4 w-24" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2">
              <SkeletonBar className="h-3 w-16" />
              <SkeletonBar className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <SkeletonBar className="h-6 w-40 mb-4" />
        <SkeletonBar className="h-48 w-full" />
      </div>

      {/* Career table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <SkeletonBar className="h-6 w-36 mb-4" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 border-b border-zinc-800/40 py-2.5">
            <SkeletonBar className="h-4 w-16" />
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-4 w-14" />
            <SkeletonBar className="h-4 w-8" />
            <SkeletonBar className="h-4 w-8" />
          </div>
        ))}
      </div>

      {/* Head-to-Head */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <SkeletonBar className="h-6 w-44 mb-4" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="mb-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <SkeletonBar className="h-4 w-28" />
                <SkeletonBar className="h-3 w-20" />
              </div>
              <div className="space-y-1 text-right">
                <SkeletonBar className="h-4 w-12" />
                <SkeletonBar className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
