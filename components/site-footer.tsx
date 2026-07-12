import Link from "next/link";
import { SITE_NAME, SYLVEON_URL } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 px-4 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground/90">{SITE_NAME}</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/demo/profile" className="transition hover:text-primary">
            Profil demo
          </Link>
          <Link href="/login" className="transition hover:text-primary">
            Logowanie
          </Link>
          <Link href="/profile" className="transition hover:text-primary">
            Mój profil
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-4xl text-center text-[11px] text-muted-foreground/60">
        © {new Date().getFullYear()}{" "}
        <Link
          href={SYLVEON_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-muted-foreground"
        >
          Sylveon Company
        </Link>
      </p>
    </footer>
  );
}
