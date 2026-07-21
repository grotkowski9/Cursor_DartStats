"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const TOUR_STORAGE_KEY = "dartstats_tour_done_v1";

type Step = {
  id: string;
  title: string;
  body: string;
  /** CSS selector preferred; falls back to centered card */
  selector?: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Witaj w profilu",
    body: "Tu zbierasz mecze z N01 i widzisz swoje KPI. Krótki przegląd — możesz pominąć w każdej chwili.",
  },
  {
    id: "stats",
    title: "Statystyki",
    body: "Kafel ze średnią, win rate i filtrami zakresu czasu. To serce Twojego profilu.",
    selector: '[data-tour="stats"]',
  },
  {
    id: "add",
    title: "Dodaj mecz",
    body: "Wklej link z n01darts.com — rozpoznamy Cię po wzorcach z onboardingu.",
    selector: '[data-tour="add-match"]',
  },
  {
    id: "list",
    title: "Lista meczów",
    body: "Ostatnie spotkania z KPI. Kliknij kartę, żeby zobaczyć rzut po rzucie.",
    selector: '[data-tour="match-list"]',
  },
];

type Props = {
  /** Auto-start (e.g. ?tour=1 after onboarding) */
  autoStart?: boolean;
  /** Persist completion for logged-in user */
  persistServer?: boolean;
  /** After finish / skip for post-onboarding flow */
  finishHref?: string | null;
};

export function ProductTour({
  autoStart = false,
  persistServer = false,
  finishHref = null,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!autoStart) return;
    try {
      if (typeof window !== "undefined" && localStorage.getItem(TOUR_STORAGE_KEY) === "1") {
        if (finishHref) router.replace(finishHref);
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [autoStart, finishHref, router]);

  const close = useCallback(
    async (markDone: boolean) => {
      setOpen(false);
      if (markDone) {
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
        if (persistServer) {
          try {
            await fetch("/api/customer", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ markTourCompleted: true }),
            });
          } catch {
            /* ignore */
          }
        }
      }
      if (finishHref) {
        router.replace(finishHref);
        router.refresh();
      }
    },
    [finishHref, persistServer, router],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        data-tour="tour-trigger"
      >
        Pokaż samouczek
      </button>
    );
  }

  const current = STEPS[step]!;
  const isLast = step >= STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="glass-tile relative w-full max-w-md p-5 shadow-2xl"
      >
        <button
          type="button"
          aria-label="Zamknij"
          onClick={() => void close(true)}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
          Samouczek {step + 1}/{STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-2 text-xl font-bold tracking-tight">
          {current.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{current.body}</p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void close(true)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Pomiń
          </button>
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Wstecz
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (isLast) void close(true);
                else setStep((s) => s + 1);
              }}
              className="rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              {isLast ? (finishHref ? "Przejdź do profilu" : "Gotowe") : "Dalej"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
