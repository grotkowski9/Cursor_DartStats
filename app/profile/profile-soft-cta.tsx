"use client";

type Props = {
  onOpen: () => void;
};

export function ProfileSoftCta({ onOpen }: Props) {
  return (
    <div className="rounded-lg border-l-2 border-red-400/25 bg-red-500/[0.04] px-3 py-2">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Zdobądź dodatkowe punkty i dostęp do dodatkowych statystyk i porównań.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-1.5 text-xs font-semibold text-red-400/90 hover:text-red-300 hover:underline"
      >
        Uzupełnij swój profil →
      </button>
    </div>
  );
}
