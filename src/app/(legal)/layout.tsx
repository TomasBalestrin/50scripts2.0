export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <a href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white transition-colors">
          &larr; Voltar
        </a>
        {children}
      </div>
    </div>
  );
}
