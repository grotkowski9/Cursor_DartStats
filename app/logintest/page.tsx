import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { siteDocumentTitle } from "@/lib/page-metadata";
import { LoginPasswordForm } from "@/app/login/login-password-form";
import { safeInternalPath } from "@/lib/safe-path";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description: "Ukryte logowanie testowe (e-mail / hasło).",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginTestPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeInternalPath(params.next, "/profile");
  const allowDevUpsert =
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_DEV_TEST_LOGIN === "true";

  return (
    <>
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
        <div
          className="absolute left-1/2 top-[-15%] z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/30 to-accent-to/30 blur-[120px]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
          <Link
            href="/login"
            className="mb-10 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Logowanie Google
          </Link>

          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/60 text-primary backdrop-blur-xl">
            <Target className="h-7 w-7" aria-hidden />
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Logowanie testowe
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            E-mail i hasło — tylko do testów. Strona nieindeksowana. Publiczne logowanie:
            Google na{" "}
            <Link href="/login" className="text-primary hover:underline">
              /login
            </Link>
            .
          </p>

          <div className="mt-10 flex flex-col gap-6">
            <LoginPasswordForm next={next} allowDevUpsert={allowDevUpsert} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
