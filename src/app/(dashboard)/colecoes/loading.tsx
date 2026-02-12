export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-7 w-44 rounded-lg bg-[#0A0F1E]" />
        <div className="h-9 w-32 rounded-lg bg-[#131B35]" />
      </div>

      {/* Collection cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E]"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            {/* Collection header */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-[#131B35]" />
                  <div className="h-4 w-36 rounded bg-[#131B35]" />
                </div>
                <div className="h-5 w-20 rounded-full bg-[#131B35]" />
              </div>
            </div>

            {/* Expanded scripts */}
            {i === 0 && (
              <div className="px-5 pb-5 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 rounded-lg bg-[#131B35] p-3">
                    <div className="h-4 w-4 rounded bg-[#0A0F1E]" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-3/4 rounded bg-[#0A0F1E]" />
                      <div className="h-2 w-10 rounded bg-[#0A0F1E]" />
                    </div>
                    <div className="h-6 w-6 rounded bg-[#0A0F1E]" />
                    <div className="h-6 w-6 rounded bg-[#0A0F1E]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
