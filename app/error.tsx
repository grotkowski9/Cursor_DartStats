"use client";

import { ErrorScreen } from "@/components/error-screen";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error }: Props) {
  return (
    <ErrorScreen
      code="500"
      title="O kurde, co to się stanęło!"
      subtitle={
        error.digest
          ? `Coś poszło nie tak po naszej stronie (kod: ${error.digest.slice(0, 8)}…). Spróbuj strony głównej albo odśwież za chwilę.`
          : "Coś poszło nie tak po naszej stronie. Spróbuj strony głównej albo odśwież za chwilę."
      }
      redirectSeconds={10}
    />
  );
}
