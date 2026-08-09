import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
};

/** Dart accent CTA + violet luna + neon L→R stripes on hover (login + landing). */
export function AccentGlowCta({ href, children, className = "w-full sm:w-auto" }: Props) {
  return (
    <div className={`group relative inline-flex ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-[#7c3aed]/75 via-[#8b5cf6]/85 to-[#6366f1]/70 opacity-100 blur-[7px] transition-[filter] duration-300 group-hover:blur-[9px]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-3 -inset-y-2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.7)_0%,rgba(99,102,241,0.45)_42%,rgba(79,70,229,0.2)_60%,transparent_75%)] opacity-100 blur-lg"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -inset-y-3 rounded-full bg-[radial-gradient(ellipse_90%_55%_at_center,rgba(139,92,246,0.95)_0%,rgba(99,102,241,0.65)_36%,rgba(79,70,229,0.3)_52%,transparent_72%)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -inset-y-2 rounded-full bg-[radial-gradient(ellipse_85%_50%_at_center,rgba(124,58,237,0.95)_0%,rgba(139,92,246,0.75)_50%,transparent_78%)] opacity-0 blur-[7px] transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 rounded-full bg-gradient-to-r from-[#7c3aed]/90 to-[#6366f1]/90 opacity-0 blur-[3px] transition-opacity duration-300 group-hover:opacity-90"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-[2px] z-20 h-[2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:neon-stripe-lr-run neon-stripe-lr"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-4 bottom-[2px] z-20 h-[2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:neon-stripe-lr-run neon-stripe-lr"
      />
      <a
        href={href}
        className="relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 transition hover:shadow-accent-to/45"
      >
        {children}
      </a>
    </div>
  );
}
