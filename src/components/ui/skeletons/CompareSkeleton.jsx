function SkeletonBar({ className = '' }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

/**
 * Skeleton placeholder for the compare page.
 * Mirrors the layout: breadcrumbs, header, head-to-head stats, recent form tables, kimarite lists.
 */
export default function CompareSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <SkeletonBar className="h-4 w-12" />
        <SkeletonBar className="h-4 w-16" />
        <SkeletonBar className="h-4 w-32" />
      </div>

      {/* Header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <SkeletonBar className="h-7 w-64 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <SkeletonBar className="h-5 w-28" />
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <SkeletonBar className="h-5 w-28" />
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Head-to-Head */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <SkeletonBar className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2">
              <SkeletonBar className="h-3 w-16" />
              <SkeletonBar className="h-5 w-10" />
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2">
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="h-4 w-48" />
        </div>
      </div>

      {/* Recent Form */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <SkeletonBar className="h-6 w-44 mb-4" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col}>
              <SkeletonBar className="h-4 w-28 mb-3" />
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 border-b border-zinc-800/40 py-2">
                  <SkeletonBar className="h-4 w-14" />
                  <SkeletonBar className="h-4 w-16" />
                  <SkeletonBar className="h-4 w-10" />
                  <SkeletonBar className="h-4 w-8" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Kimarite */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <SkeletonBar className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col} className="space-y-2">
              <SkeletonBar className="h-4 w-28 mb-2" />
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5">
                  <SkeletonBar className="h-4 w-20" />
                  <SkeletonBar className="h-4 w-10" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
