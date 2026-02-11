export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-7 w-36 rounded-lg bg-[#0A0F1E]" />
        <div className="h-6 w-16 rounded-full bg-[#131B35]" />
      </div>

      {/* Input card */}
      <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] mb-6"
           style={{ animationDelay: '75ms' }}>
        <div className="p-5 space-y-4">
          {/* Card title */}
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-[#131B35]" />
            <div className="h-3 w-72 rounded bg-[#131B35]" />
          </div>

          {/* Lead select */}
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-[#131B35]" />
            <div className="h-10 w-full rounded-lg bg-[#131B35]" />
          </div>

          {/* Textarea */}
          <div className="h-[200px] w-full rounded-lg bg-[#131B35]" />

          {/* Submit button */}
          <div className="h-12 w-full rounded-lg bg-[#131B35]" />
        </div>
      </div>

      {/* Result placeholder cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
            style={{ animationDelay: `${(i + 2) * 75}ms` }}
          >
            <div className="mb-3 h-4 w-32 rounded bg-[#131B35]" />
            <div className="rounded-lg bg-[#131B35] p-4 space-y-2">
              <div className="h-3 w-full rounded bg-[#0A0F1E]" />
              <div className="h-3 w-5/6 rounded bg-[#0A0F1E]" />
              <div className="h-3 w-3/4 rounded bg-[#0A0F1E]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
