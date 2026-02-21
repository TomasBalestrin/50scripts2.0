export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col">
      {/* Header with logo */}
      <header className="w-full py-6 px-4 flex justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <span className="font-heading text-xl font-bold text-white">
            Script Go
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
