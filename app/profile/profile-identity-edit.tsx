"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import type { CustomerProfile } from "@/lib/customer";
import { suggestKnownNicknames } from "@/lib/customer";
import { IdentityForm } from "@/components/identity-form";

type Props = {
  customer: CustomerProfile;
};

export function ProfileIdentityEdit({ customer }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
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
        <IdentityForm
          key={`${customer.firstName}-${customer.lastName}-${customer.nickname}-${customer.knownNicknames.join(",")}`}
          mode="edit"
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
      ) : null}
    </section>
  );
}
