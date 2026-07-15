"use client";

import { LogIn } from "lucide-react";

type Props = {
  next?: string;
};

export function LoginGoogleButton({ next = "/profile" }: Props) {
  const href = `/api/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <a
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-white/10"
    >
      <LogIn className="h-4 w-4" />
      Zaloguj się przez Google
    </a>
  );
}
