type SectionItem = {
  id: string;
  label: string;
  subtitle?: string;
};

type Props = {
  sections: readonly SectionItem[];
  activeId: string;
  variant?: 'mobile' | 'desktop';
};

export default function RikishiSectionNav({
  sections,
  activeId,
  variant = 'desktop',
}: Props) {
  if (variant === 'mobile') {
    return (
      <nav
        aria-label="Profile section navigation"
        className="sticky top-16 z-20 -mx-4 overflow-x-auto border-y border-white/[0.06] bg-black/80 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden"
      >
        <div className="flex min-w-max gap-2">
          {sections.map((section) => {
            const active = section.id === activeId;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-red-600/60 bg-red-950/30 text-red-200'
                    : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-red-600/40 hover:text-white'
                }`}
              >
                {section.label}
              </a>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Jump to</div>
        <nav aria-label="Profile section navigation" className="mt-3 space-y-1.5">
          {sections.map((section) => {
            const active = section.id === activeId;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`block rounded-xl border px-3 py-3 transition-colors ${
                  active
                    ? 'border-red-600/50 bg-red-950/20'
                    : 'border-transparent bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.04]'
                }`}
              >
                <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{section.label}</div>
                {section.subtitle && (
                  <div className="mt-0.5 text-xs leading-relaxed text-zinc-500">{section.subtitle}</div>
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
