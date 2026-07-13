import Link from "next/link";
import { Sparkles } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="rounded-2xl border border-accent-from/30 bg-gradient-to-r from-accent-from/10 to-accent-to/10 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-from" aria-hidden />
          <span>
            To <strong className="font-semibold">przykładowy profil demo</strong>. Pełna analityka
            dostępna na wyciągnięcie ręki. Utwórz swoje konto, zaimportuj swoje mecze i śledź swoją
            formę.
          </span>
        </p>
        <Link
          href="/login"
          className="shrink-0 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-4 py-2 text-center text-xs font-semibold text-primary-foreground shadow-md shadow-accent-to/20 transition hover:shadow-accent-to/40"
        >
          Załóż konto
        </Link>
      </div>
    </div>
  );
}
