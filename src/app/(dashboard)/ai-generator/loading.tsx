export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-7 w-56 rounded-lg bg-[#0A0F1E]" />
        <div className="h-6 w-24 rounded-full bg-[#131B35]" />
      </div>

      {/* Configuration card */}
      <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] mb-6"
           style={{ animationDelay: '75ms' }}>
        <div className="p-5 space-y-4">
          <div className="h-5 w-28 rounded bg-[#131B35]" />

          {/* Category select */}
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-[#131B35]" />
            <div className="h-10 w-full rounded-lg bg-[#131B35]" />
          </div>

          {/* Context textarea */}
          <div className="space-y-2">
            <div className="h-3 w-56 rounded bg-[#131B35]" />
            <div className="h-[100px] w-full rounded-lg bg-[#131B35]" />
          </div>

          {/* Tone buttons */}
          <div className="space-y-2">
            <div className="h-3 w-10 rounded bg-[#131B35]" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 w-20 rounded-lg bg-[#131B35]" />
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="h-12 w-full rounded-lg bg-[#131B35]" />
        </div>
      </div>

      {/* Preview section */}
      <div className="space-y-4">
        {/* Title card */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
             style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-[#131B35]" />
              <div className="h-3 w-36 rounded bg-[#131B35]" />
            </div>
            <div className="h-6 w-12 rounded-full bg-[#131B35]" />
          </div>
        </div>

        {/* Script content card */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
             style={{ animationDelay: '225ms' }}>
          <div className="mb-3 h-4 w-16 rounded bg-[#131B35]" />
          <div className="rounded-lg bg-[#131B35] p-4 space-y-2">
            <div className="h-3 w-full rounded bg-[#0A0F1E]" />
            <div className="h-3 w-5/6 rounded bg-[#0A0F1E]" />
            <div className="h-3 w-full rounded bg-[#0A0F1E]" />
            <div className="h-3 w-3/4 rounded bg-[#0A0F1E]" />
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-8 w-28 rounded-lg bg-[#131B35]" />
            <div className="h-8 w-20 rounded-lg bg-[#131B35]" />
            <div className="h-8 w-8 rounded-lg bg-[#131B35]" />
          </div>
        </div>
      </div>
    </div>
  );
}
