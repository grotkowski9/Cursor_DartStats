import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  SITE_BRAND,
  SITE_FOOTER_LEGAL,
  SITE_FOOTER_SEO,
  SITE_NAME,
  SITE_NAME_SHORT,
  SITE_PUBLIC_HOSTS,
  SYLVEON_URL,
} from "@/lib/site-config";

const navLinkClass = "transition hover:text-primary";

export async function SiteFooter() {
  let loggedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    loggedIn = !!data.user;
  } catch {
    /* public pages without auth config */
  }

  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 px-4 py-5">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight transition hover:opacity-90"
              aria-label={SITE_NAME}
            >
              <span className="bg-gradient-to-r from-sylveon-from to-sylveon-to bg-clip-text text-transparent">
                {SITE_BRAND}
              </span>{" "}
              <span className="text-accent-gradient">{SITE_NAME_SHORT}</span>
            </Link>
            <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground/60">
              {SITE_PUBLIC_HOSTS.map((host, i) => (
                <span key={host.href} className="inline-flex items-center gap-x-1.5">
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <a
                    href={host.href}
                    className="transition hover:text-muted-foreground"
                    rel="noopener noreferrer"
                  >
                    {host.label}
                  </a>
                </span>
              ))}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <Link href="/" className={navLinkClass}>
                Strona główna
              </Link>
              {loggedIn ? (
                <>
                  <Link href="/profile" className={navLinkClass}>
                    Mój profil
                  </Link>
                  <form action="/auth/signout" method="post" className="inline">
                    <button type="submit" className={navLinkClass}>
                      Wyloguj
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/demo/profile" className={navLinkClass}>
                    Profil demo
                  </Link>
                  <Link href="/login" className={navLinkClass}>
                    Rejestracja
                  </Link>
                  <Link href="/login" className={navLinkClass}>
                    Logowanie
                  </Link>
                </>
              )}
            </nav>
            <Link
              href="/privacy"
              className="text-[11px] text-muted-foreground/60 transition hover:text-muted-foreground"
            >
              Polityka prywatności
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
          {[...SITE_FOOTER_SEO, SITE_FOOTER_LEGAL].map((col) => (
            <section key={col.title}>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {col.title}
              </h2>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground/45">
                {col.body}
              </p>
            </section>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-4xl text-center text-[11px] text-muted-foreground/60">
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
