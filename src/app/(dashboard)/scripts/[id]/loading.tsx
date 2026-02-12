export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
        {/* Back button */}
        <div className="h-5 w-32 rounded bg-[#131B35]" />

        {/* Title + badges */}
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded bg-[#0A0F1E]" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-[#131B35]" />
            <div className="h-6 w-24 rounded-full bg-[#131B35]" />
            <div className="h-6 w-16 rounded-full bg-[#131B35]" />
          </div>
        </div>

        {/* Tone toggle */}
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-20 rounded-lg bg-[#131B35]"
              style={{ animationDelay: `${i * 75}ms` }}
            />
          ))}
        </div>

        {/* Script content block */}
        <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-6 space-y-3">
          <div className="h-4 w-full rounded bg-[#131B35]" />
          <div className="h-4 w-full rounded bg-[#131B35]" />
          <div className="h-4 w-3/4 rounded bg-[#131B35]" />
          <div className="h-4 w-full rounded bg-[#131B35]" />
          <div className="h-4 w-5/6 rounded bg-[#131B35]" />
          <div className="h-4 w-full rounded bg-[#131B35]" />
          <div className="h-4 w-2/3 rounded bg-[#131B35]" />
        </div>

        {/* Copy button */}
        <div className="h-14 w-full rounded-xl bg-[#131B35]" />

        {/* Context card */}
        <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 space-y-2">
          <div className="h-4 w-40 rounded bg-[#131B35]" />
          <div className="h-3 w-full rounded bg-[#131B35]" />
          <div className="h-3 w-3/4 rounded bg-[#131B35]" />
        </div>

        {/* Rate section */}
        <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 rounded bg-[#131B35]" />
            <div className="h-4 w-4 rounded bg-[#131B35]" />
          </div>
        </div>
      </div>
    </div>
  );
}
