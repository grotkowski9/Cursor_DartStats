"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const TOUR_STORAGE_KEY = "dartstats_tour_done_v1";

type Step = {
  id: string;
  title: string;
  body: string;
  selector?: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Witaj w profilu",
    body: "Tu zbierasz mecze z N01 i widzisz swoje KPI. Krótki przegląd — możesz pominąć w każdej chwili.",
  },
  {
    id: "add",
    title: "Dodaj mecz",
    body: "Wklej link z n01darts.com — rozpoznamy Cię po wzorcach z onboardingu.",
    selector: '[data-tour="add-match"]',
  },
  {
    id: "stats",
    title: "Statystyki",
    body: "Kafel ze średnią, win rate i filtrami zakresu czasu. To serce Twojego profilu.",
    selector: '[data-tour="stats"]',
  },
  {
    id: "list",
    title: "Lista meczów",
    body: "Ostatnie spotkania z KPI. Kliknij kartę, żeby zobaczyć rzut po rzucie.",
    selector: '[data-tour="match-list"]',
  },
];

type Props = {
  autoStart?: boolean;
  persistServer?: boolean;
  finishHref?: string | null;
};

type Rect = { top: number; left: number; width: number; height: number };

export function ProductTour({
  autoStart = false,
  persistServer = false,
  finishHref = null,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);

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

  const current = STEPS[step]!;

  const measure = useCallback(() => {
    if (!open) {
      setHole(null);
      return;
    }
    const sel = current.selector;
    if (!sel) {
      setHole(null);
      return;
    }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) {
      setHole(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const pad = 8;
    setHole({
      top: Math.max(8, r.top - pad),
      left: Math.max(8, r.left - pad),
      width: Math.min(window.innerWidth - 16, r.width + pad * 2),
      height: r.height + pad * 2,
    });
  }, [current.selector, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const t = window.setTimeout(measure, 80);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, open, step]);

  const close = useCallback(
    async (markDone: boolean) => {
      setOpen(false);
      setHole(null);
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

  const isLast = step >= STEPS.length - 1;
  const tooltipStyle = hole
    ? {
        top: Math.min(
          window.innerHeight - 220,
          hole.top + hole.height + 12,
        ),
        left: Math.min(window.innerWidth - 320, Math.max(12, hole.left)),
      }
    : {
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
      };

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {/* Soft dim — page stays readable; hole cut via box-shadow on spotlight */}
      {hole ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-accent-from/70 transition-all duration-200"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.45)",
          }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-black/35" aria-hidden />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="pointer-events-auto absolute z-[81] w-[min(100%-24px,20rem)] rounded-2xl border border-white/15 bg-card/95 p-4 shadow-2xl backdrop-blur-md"
        style={tooltipStyle as CSSProperties}
      >
        <button
          type="button"
          aria-label="Zamknij"
          onClick={() => void close(true)}
          className="absolute right-2 top-2 rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
          Samouczek {step + 1}/{STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1.5 pr-6 text-base font-bold tracking-tight">
          {current.title}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{current.body}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
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
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
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
              className="rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              {isLast ? (finishHref ? "Do profilu" : "Gotowe") : "Dalej"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
