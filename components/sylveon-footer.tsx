import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SYLVEON_URL } from "@/lib/site-config";

export function SylveonFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
            Część ekosystemu
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <Link
              href={SYLVEON_URL}
              className="font-semibold text-foreground transition hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sylveon Company
            </Link>{" "}
            — doradztwo iGaming, CRM, e-commerce. W dartzie: turnieje, eventy, ten tracker.
            {" "}
            <span className="text-foreground/80">Rozmawiamy o efektach, nie o obietnicach.</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <Link
            href={SYLVEON_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-primary"
          >
            sylveoncompany.pl
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/demo/profile"
            className="text-muted-foreground transition hover:text-primary"
          >
            Profil demo — Antoni „Robot" Kowalski
          </Link>
          <Link href="/login" className="text-muted-foreground transition hover:text-primary">
            Logowanie / rejestracja
          </Link>
        </div>
      </div>
    </footer>
  );
}
