export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Back button + header */}
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-24 rounded bg-[#131B35]" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#131B35]" />
            <div className="space-y-2">
              <div className="h-7 w-48 rounded bg-[#131B35]" />
              <div className="h-4 w-72 rounded bg-[#131B35]" />
            </div>
          </div>
          <div className="h-1 w-20 rounded-full bg-[#131B35]" />
        </div>

        {/* Script cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="mb-3 h-4 w-3/4 rounded bg-[#131B35]" />
              <div className="mb-2 h-3 w-full rounded bg-[#131B35]" />
              <div className="mb-3 h-3 w-2/3 rounded bg-[#131B35]" />
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-4 w-12 rounded-full bg-[#131B35]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
