import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  SITE_AFFILIATION_DISCLAIMER,
  SITE_FOOTER_SEO,
  SITE_NAME,
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-foreground/90 transition hover:text-primary"
            >
              {SITE_NAME}
            </Link>
            <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground/60">
              {SITE_PUBLIC_HOSTS.map((host, i) => (
                <span key={host.href} className="inline-flex items-center gap-x-2">
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
            </p>
          </div>
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
        </div>

        <div className="grid gap-4 border-t border-white/5 pt-4 sm:grid-cols-2">
          {SITE_FOOTER_SEO.map((col) => (
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

        <div className="space-y-2 border-t border-white/5 pt-4">
          <div className="flex sm:justify-end">
            <Link
              href="/privacy"
              className="text-[11px] text-muted-foreground/60 transition hover:text-muted-foreground"
            >
              Polityka prywatności
            </Link>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground/45">
            {SITE_AFFILIATION_DISCLAIMER}
          </p>
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
