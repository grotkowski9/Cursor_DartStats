"use client";

import { LogIn } from "lucide-react";
import { AccentGlowCta } from "@/components/accent-glow-cta";

type Props = {
  next?: string;
};

export function LoginGoogleButton({ next = "/profile" }: Props) {
  const href = `/api/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <AccentGlowCta href={href} className="w-full">
      <LogIn className="h-4 w-4" />
      Zaloguj się przez Google
    </AccentGlowCta>
  );
}
