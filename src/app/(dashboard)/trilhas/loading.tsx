export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Title */}
        <div className="mb-6 animate-pulse">
          <div className="mb-2 h-8 w-48 rounded-lg bg-[#0A0F1E]" />
          <div className="h-4 w-72 rounded bg-[#0A0F1E]" />
        </div>

        {/* Trail cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#131B35]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-[#131B35]" />
                  <div className="h-3 w-1/3 rounded bg-[#131B35]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-[#131B35]" />
                <div className="h-3 w-3/4 rounded bg-[#131B35]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
