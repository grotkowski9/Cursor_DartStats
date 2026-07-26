"use client";

import { ErrorScreen } from "@/components/error-screen";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Root layout crash — must include its own html/body. */
export default function GlobalError({ error }: Props) {
  return (
    <html lang="pl" className="dark">
      <body className="min-h-screen antialiased">
        <ErrorScreen
          code="500"
          title="O kurde, co to się stanęło!"
          subtitle={
            error.digest
              ? `Aplikacja się wywróciła (kod: ${error.digest.slice(0, 8)}…). Wracamy na start.`
              : "Aplikacja się wywróciła. Wracamy na start."
          }
          redirectSeconds={10}
        />
      </body>
    </html>
  );
}
