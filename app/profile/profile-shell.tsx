"use client";

import { useEffect, useRef, useState } from "react";
import type { CustomerProfile } from "@/lib/customer";
import { ProfileClient } from "./profile-client";
import { ProfileSoftCta } from "./profile-soft-cta";
import { ProfileIdentityEdit } from "./profile-identity-edit";

type Props = {
  customer: CustomerProfile;
  showSoftCta: boolean;
  myDisplayName: string;
  showInsights?: boolean;
};

export function ProfileShell({
  customer,
  showSoftCta,
  myDisplayName,
  showInsights = false,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const editSectionRef = useRef<HTMLElement>(null);
  const scrollToEditRef = useRef(false);

  function openEditFromCta() {
    scrollToEditRef.current = true;
    setEditOpen(true);
  }

  useEffect(() => {
    if (!editOpen || !scrollToEditRef.current) return;
    scrollToEditRef.current = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        editSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, [editOpen]);

  return (
    <>
      {showSoftCta ? <ProfileSoftCta onOpen={openEditFromCta} /> : null}

      <ProfileClient myDisplayName={myDisplayName} showInsights={showInsights} />

      <ProfileIdentityEdit
        ref={editSectionRef}
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
