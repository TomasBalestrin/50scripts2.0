export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Greeting */}
        <div className="animate-pulse">
          <div className="mb-2 h-8 w-64 rounded-lg bg-[#0A0F1E]" />
          <div className="h-4 w-40 rounded bg-[#0A0F1E]" />
        </div>

        {/* Tip card */}
        <div className="animate-pulse rounded-xl bg-gradient-to-r from-[#1D4ED8]/20 to-[#3B82F6]/20 p-5"
             style={{ animationDelay: '75ms' }}>
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[#131B35]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/4 rounded bg-[#131B35]" />
              <div className="h-3 w-full rounded bg-[#131B35]" />
              <div className="h-3 w-3/4 rounded bg-[#131B35]" />
            </div>
          </div>
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
              style={{ animationDelay: `${(i + 2) * 75}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#131B35]" />
                <div className="space-y-2">
                  <div className="h-6 w-16 rounded bg-[#131B35]" />
                  <div className="h-3 w-20 rounded bg-[#131B35]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue + Challenge + Agenda row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
              style={{ animationDelay: `${(i + 5) * 75}ms` }}
            >
              <div className="mb-3 h-4 w-1/3 rounded bg-[#131B35]" />
              <div className="mb-2 h-8 w-1/2 rounded bg-[#131B35]" />
              <div className="h-2 w-full rounded-full bg-[#131B35]" />
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
              style={{ animationDelay: `${(i + 8) * 75}ms` }}
            >
              <div className="mb-4 h-4 w-32 rounded bg-[#131B35]" />
              <div className="h-64 w-full rounded bg-[#131B35]/50" />
            </div>
          ))}
        </div>

        {/* Recommended scripts */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
              style={{ animationDelay: `${(i + 10) * 75}ms` }}
            >
              <div className="mb-2 h-5 w-16 rounded-full bg-[#131B35]" />
              <div className="mb-2 h-4 w-3/4 rounded bg-[#131B35]" />
              <div className="mb-2 h-3 w-full rounded bg-[#131B35]" />
              <div className="h-3 w-1/3 rounded bg-[#131B35]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
