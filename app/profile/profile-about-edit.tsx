"use client";

import { useState } from "react";
import type { CustomerProfile } from "@/lib/customer";
import { AboutForm } from "@/components/about-form";
import { customerToAboutValues } from "@/lib/about-form-values";

type Props = {
  customer: CustomerProfile;
  softCta?: boolean;
};

export function ProfileAboutEdit({ customer, softCta = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {softCta && !customer.aboutCompletedAt ? (
        <div className="rounded-2xl border border-[color:var(--onb-mint,#7dd3c0)]/25 bg-[color:var(--onb-mint,#7dd3c0)]/8 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Uzupełnij profil dartera</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Porównania lotek, spersonalizowane tipy i punkty gracza — wkrótce. Zacznij od kilku
            pól „O Tobie”.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 text-xs font-semibold text-[color:var(--onb-mint,#7dd3c0)] hover:underline"
          >
            Uzupełnij teraz →
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        {open ? "Zwiń „O Tobie”" : "Edytuj „O Tobie” (lotki, miasto…)"}
      </button>

      {open ? (
        <AboutForm
          key={`${customer.aboutCompletedAt}-${customer.city}-${customer.dartBrand}`}
          initial={customerToAboutValues(customer)}
          mode="edit"
          onSaved={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
