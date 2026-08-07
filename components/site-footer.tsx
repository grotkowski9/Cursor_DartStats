import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_NAME, SYLVEON_URL } from "@/lib/site-config";

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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-foreground/90 transition hover:text-primary"
          >
            {SITE_NAME}
          </Link>
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
        <div className="flex sm:justify-end">
          <Link
            href="/privacy"
            className="text-[11px] text-muted-foreground/60 transition hover:text-muted-foreground"
          >
            Polityka prywatności
          </Link>
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
