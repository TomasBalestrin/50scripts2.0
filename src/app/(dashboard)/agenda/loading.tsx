export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div>
          <div className="h-7 w-48 rounded-lg bg-[#0A0F1E]" />
          <div className="mt-2 h-4 w-36 rounded bg-[#0A0F1E]" />
        </div>
        <div className="h-6 w-28 rounded-full bg-[#131B35]" />
      </div>

      {/* Time block cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] overflow-hidden"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            {/* Card header */}
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#131B35]" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 rounded bg-[#131B35]" />
                    <div className="h-3 w-36 rounded bg-[#131B35]" />
                  </div>
                </div>
                <div className="h-5 w-5 rounded bg-[#131B35]" />
              </div>
            </div>
            {/* Card content - script suggestion */}
            <div className="px-4 pb-4">
              <div className="rounded-lg bg-[#131B35] p-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-[#0A0F1E]" />
                <div className="h-3 w-full rounded bg-[#0A0F1E]" />
                <div className="flex gap-2 mt-2">
                  <div className="h-7 w-20 rounded bg-[#0A0F1E]" />
                  <div className="h-7 w-16 rounded bg-[#0A0F1E]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
