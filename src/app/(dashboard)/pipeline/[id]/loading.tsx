export default function Loading() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Back button + title */}
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#0A0F1E]" />
          <div className="h-7 w-48 rounded-lg bg-[#0A0F1E]" />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar - Lead info */}
          <div
            className="animate-pulse w-full lg:w-80 shrink-0 rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 space-y-5"
            style={{ animationDelay: '75ms' }}
          >
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-[#131B35]" />
              <div className="h-5 w-36 rounded bg-[#131B35]" />
              <div className="h-3 w-24 rounded bg-[#131B35]" />
            </div>

            <div className="h-px bg-[#131B35]" />

            {/* Info fields */}
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div
                    className="h-3 rounded bg-[#131B35]"
                    style={{ width: `${[56, 72, 64, 80, 48][i]}px` }}
                  />
                  <div className="h-4 w-full rounded bg-[#131B35]" />
                </div>
              ))}
            </div>

            <div className="h-px bg-[#131B35]" />

            {/* Stage select */}
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-[#131B35]" />
              <div className="h-9 w-full rounded-lg bg-[#131B35]" />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 rounded-full bg-[#131B35]"
                  style={{ width: `${[56, 72, 48][i]}px` }}
                />
              ))}
            </div>
          </div>

          {/* Main - Conversation area */}
          <div
            className="animate-pulse flex-1 rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 space-y-4"
            style={{ animationDelay: '150ms' }}
          >
            {/* Tabs */}
            <div className="flex gap-3 border-b border-[#131B35] pb-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 rounded-lg bg-[#131B35]"
                  style={{ width: `${[80, 96, 72][i]}px` }}
                />
              ))}
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => {
                const isOutgoing = i % 2 === 1;
                return (
                  <div
                    key={i}
                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="rounded-xl bg-[#131B35] p-3 space-y-2"
                      style={{ width: `${[260, 200, 280, 220][i]}px`, maxWidth: '75%' }}
                    >
                      <div className="h-3 w-full rounded bg-[#0A0F1E]" />
                      <div className="h-3 w-3/4 rounded bg-[#0A0F1E]" />
                      <div className="h-2 w-12 rounded bg-[#0A0F1E] mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input area */}
            <div
              className="animate-pulse flex items-center gap-2 border-t border-[#131B35] pt-4"
              style={{ animationDelay: '225ms' }}
            >
              <div className="h-10 flex-1 rounded-lg bg-[#131B35]" />
              <div className="h-10 w-10 rounded-lg bg-[#131B35]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
