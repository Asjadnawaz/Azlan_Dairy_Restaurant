export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#00230c] text-white">
      <div className="relative flex flex-col items-center justify-center p-8 text-center">
        {/* Animated outer glowing ring */}
        <div className="relative flex items-center justify-center w-28 h-28 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-amber-400 border-r-emerald-400 animate-spin" style={{ animationDuration: '1.2s' }} />
          <div className="absolute inset-2 rounded-full border-2 border-white/10 border-b-amber-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.8s' }} />

          {/* Logo */}
          <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-2xl ring-4 ring-emerald-500/30">
            <img
              src="/images/logo.png"
              alt="Azlan Fast Food and B B Q point"
              className="w-full h-full object-cover animate-pulse"
            />
          </div>
        </div>

        {/* Brand Text */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-white mb-1">
          AZLAN
        </h1>
        <p className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.2em] text-amber-400">
          Fast Food and B B Q point
        </p>

        {/* Progress bar line */}
        <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400 w-full animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}
