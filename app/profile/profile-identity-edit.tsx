"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import type { CustomerProfile } from "@/lib/customer";
import { needsAboutSoftCta } from "@/lib/customer";
import { suggestKnownNicknames } from "@/lib/identity-suggest";
import { IdentityForm } from "@/components/identity-form";
import { AboutForm } from "@/components/about-form";
import { customerToAboutValues } from "@/lib/about-form-values";

type Props = {
  customer: CustomerProfile;
  softCta?: boolean;
};

export function ProfileIdentityEdit({ customer, softCta }: Props) {
  const showSoft = softCta ?? needsAboutSoftCta(customer);
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      {showSoft ? (
        <div className="rounded-2xl border border-accent-from/25 bg-accent-from/8 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Uzupełnij profil dartera</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Porównania lotek, spersonalizowane tipy i punkty gracza — wkrótce. Zacznij od kilku
            pól „O Tobie”.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Uzupełnij teraz →
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edytuj dane profilu
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="glass-tile space-y-5 p-5">
          <IdentityForm
            key={`id-${customer.firstName}-${customer.lastName}-${customer.nickname}-${customer.knownNicknames.join(",")}`}
            mode="edit"
            embedded
            initial={{
              firstName: customer.firstName,
              lastName: customer.lastName,
              nickname: customer.nickname ?? "",
              knownNicknames: suggestKnownNicknames({
                firstName: customer.firstName,
                lastName: customer.lastName,
                nickname: customer.nickname,
                knownNicknames: customer.knownNicknames,
              }),
            }}
          />
          <AboutForm
            key={`about-${customer.aboutCompletedAt}-${customer.city}-${customer.dartBrand}-${customer.favoritePlayerId}`}
            initial={customerToAboutValues(customer)}
            mode="edit"
            embedded
          />
        </div>
      ) : null}
    </section>
  );
}
