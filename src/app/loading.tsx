export default function Loading() {
  return (
    <div className="w-full mx-auto max-w-7xl px-4 md:px-8 py-8 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="w-full h-[50vh] md:h-[60vh] rounded-3xl bg-slate-200/70 mb-12" />
      
      {/* Trust/Categories Section Skeleton */}
      <div className="flex gap-4 mb-12 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 w-32 rounded-full bg-slate-200/70 shrink-0" />
        ))}
      </div>

      {/* Grid Items Skeleton (Menu) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col gap-4 mb-8">
            <div className="w-full h-48 rounded-2xl bg-slate-200/70" />
            <div className="flex flex-col gap-2">
              <div className="w-3/4 h-6 rounded-md bg-slate-200/70" />
              <div className="w-1/2 h-4 rounded-md bg-slate-200/70" />
            </div>
            <div className="w-full h-10 rounded-full bg-slate-200/70 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
