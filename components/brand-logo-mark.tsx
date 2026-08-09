import Link from "next/link";
import { Target } from "lucide-react";
import { SITE_NAME } from "@/lib/site-config";

type Props = {
  className?: string;
};

/** Logo tile with Sylveon glow — links home. Shared by landing + error screens. */
export function BrandLogoMark({ className = "mb-8" }: Props) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(249,168,212,0.85)_0%,rgba(192,132,252,0.55)_36%,rgba(125,211,252,0.28)_55%,transparent_72%)] blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-[5.25rem] -translate-x-1/2 -translate-y-1/2 rounded-[1.25rem] bg-[radial-gradient(circle,rgba(249,168,212,0.95)_0%,rgba(192,132,252,0.7)_50%,transparent_78%)] blur-[7px]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[4.6rem] w-[4.6rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-gradient-to-br from-[#f9a8d4] to-[#c084fc] opacity-90 blur-[4px]"
      />
      <Link
        href="/"
        aria-label={SITE_NAME}
        className="relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-primary transition hover:border-white/25 hover:bg-card/90"
      >
        <Target className="h-8 w-8" aria-hidden />
      </Link>
    </div>
  );
}
