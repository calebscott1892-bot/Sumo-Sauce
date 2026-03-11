function SkeletonBar({ className = '' }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

/**
 * Skeleton placeholder for basho division standings.
 * Mirrors the layout of BashoDivisionPage: picker bar, nav bar, heading, table rows.
 */
export default function BashoStandingsSkeleton() {
  const rows = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <SkeletonBar className="h-4 w-12" />
        <SkeletonBar className="h-4 w-10" />
        <SkeletonBar className="h-4 w-16" />
      </div>

      {/* Picker */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <SkeletonBar className="h-9 w-28" />
          <SkeletonBar className="h-9 w-32" />
          <SkeletonBar className="h-9 w-16" />
        </div>
      </div>

      {/* BashoNav */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <SkeletonBar className="h-5 w-24" />
        <SkeletonBar className="h-5 w-28" />
        <SkeletonBar className="h-5 w-24" />
      </div>

      {/* Heading */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <SkeletonBar className="h-7 w-72" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        {/* Table header */}
        <div className="mb-3 grid grid-cols-6 gap-2 border-b border-zinc-800 pb-2">
          <SkeletonBar className="h-4 w-12" />
          <SkeletonBar className="h-4 w-20" />
          <SkeletonBar className="h-4 w-10" />
          <SkeletonBar className="h-4 w-12" />
          <SkeletonBar className="h-4 w-12" />
          <SkeletonBar className="h-4 w-16" />
        </div>
        {/* Table rows */}
        {rows.map((i) => (
          <div key={i} className="grid grid-cols-6 gap-2 border-b border-zinc-800/40 py-2.5">
            <SkeletonBar className="h-4 w-14" />
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="h-4 w-6" />
            <SkeletonBar className="h-4 w-6" />
            <SkeletonBar className="h-4 w-6" />
            <SkeletonBar className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
