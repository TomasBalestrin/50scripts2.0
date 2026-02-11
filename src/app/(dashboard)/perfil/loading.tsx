export default function Loading() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Title */}
        <div className="animate-pulse">
          <div className="h-7 w-36 rounded-lg bg-[#0A0F1E]" />
        </div>

        {/* Avatar circle */}
        <div
          className="animate-pulse flex flex-col items-center gap-3"
          style={{ animationDelay: '75ms' }}
        >
          <div className="h-24 w-24 rounded-full bg-[#0A0F1E]" />
          <div className="h-3 w-28 rounded bg-[#0A0F1E]" />
        </div>

        {/* Form fields card */}
        <div
          className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
          style={{ animationDelay: '150ms' }}
        >
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div
                  className="h-3 rounded bg-[#131B35]"
                  style={{ width: `${[72, 88, 64, 96][i]}px` }}
                />
                <div className="h-10 w-full rounded-lg bg-[#131B35]" />
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div
          className="animate-pulse flex justify-end"
          style={{ animationDelay: '225ms' }}
        >
          <div className="h-10 w-32 rounded-lg bg-[#131B35]" />
        </div>
      </div>
    </div>
  );
}
