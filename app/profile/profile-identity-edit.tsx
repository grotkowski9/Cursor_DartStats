"use client";

import { forwardRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import type { CustomerProfile } from "@/lib/customer";
import { formNameFields } from "@/lib/identity-suggest";
import { IdentityForm } from "@/components/identity-form";
import { AboutForm } from "@/components/about-form";
import { customerToAboutValues } from "@/lib/about-form-values";

type Props = {
  customer: CustomerProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ProfileIdentityEdit = forwardRef<HTMLElement, Props>(function ProfileIdentityEdit(
  { customer, open, onOpenChange },
  ref,
) {
  const [identityOpen, setIdentityOpen] = useState(false);

  return (
    <section ref={ref} className="scroll-mt-6 space-y-3 pt-2">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
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
          <AboutForm
            key={`about-${customer.aboutCompletedAt}-${customer.city}-${customer.dartBrand}-${customer.favoritePlayerId}`}
            initial={customerToAboutValues(customer)}
            mode="edit"
            embedded
            showEncouragement
          />

          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setIdentityOpen((v) => !v)}
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={identityOpen}
            >
              Zmień dane identyfikacyjne
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${identityOpen ? "rotate-180" : ""}`}
              />
            </button>

            {identityOpen ? (
              <div className="mt-4">
                <IdentityForm
                  key={`id-${customer.firstName}-${customer.lastName}-${customer.nickname}-${customer.knownNicknames.join(",")}`}
                  mode="edit"
                  embedded
                  initial={formNameFields({
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    nickname: customer.nickname,
                    knownNicknames: customer.knownNicknames,
                  })}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
});
