export default function Loading() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="animate-pulse text-center">
          <div className="mx-auto h-8 w-56 rounded-lg bg-[#0A0F1E]" />
          <div className="mx-auto mt-3 h-4 w-80 rounded bg-[#0A0F1E]" />
        </div>

        {/* Billing toggle */}
        <div
          className="animate-pulse flex items-center justify-center gap-3"
          style={{ animationDelay: '75ms' }}
        >
          <div className="h-4 w-16 rounded bg-[#0A0F1E]" />
          <div className="h-6 w-12 rounded-full bg-[#131B35]" />
          <div className="h-4 w-16 rounded bg-[#0A0F1E]" />
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 flex flex-col"
              style={{ animationDelay: `${(i + 2) * 75}ms` }}
            >
              {/* Plan name + badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-20 rounded bg-[#131B35]" />
                {i === 2 && (
                  <div className="h-5 w-16 rounded-full bg-[#131B35]" />
                )}
              </div>

              {/* Price */}
              <div className="mb-1 h-9 w-28 rounded bg-[#131B35]" />
              <div className="mb-5 h-3 w-20 rounded bg-[#131B35]" />

              {/* Divider */}
              <div className="h-px bg-[#131B35] mb-5" />

              {/* Feature list */}
              <div className="space-y-3 flex-1">
                {Array.from({ length: [4, 5, 7, 6][i] }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-[#131B35] shrink-0" />
                    <div
                      className="h-3 rounded bg-[#131B35]"
                      style={{ width: `${60 + ((j * 17 + i * 13) % 40)}%` }}
                    />
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <div className="mt-5 h-10 w-full rounded-lg bg-[#131B35]" />
            </div>
          ))}
        </div>

        {/* FAQ section */}
        <div
          className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
          style={{ animationDelay: '450ms' }}
        >
          <div className="mb-4 mx-auto h-5 w-48 rounded bg-[#131B35]" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-[#131B35] p-4"
              >
                <div
                  className="h-4 rounded bg-[#0A0F1E]"
                  style={{ width: `${[200, 240, 180][i]}px` }}
                />
                <div className="h-4 w-4 rounded bg-[#0A0F1E]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
