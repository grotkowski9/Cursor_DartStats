"use client";

type Props = {
  catalog: string[];
  includeTag: string | null;
  excludeTag: string | null;
  onInclude: (tag: string | null) => void;
  onExclude: (tag: string | null) => void;
};

export function ProfileTagFilters({
  catalog,
  includeTag,
  excludeTag,
  onInclude,
  onExclude,
}: Props) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <label className="flex min-w-[11rem] flex-1 flex-col gap-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:flex-none">
        Uwzględnij tylko mecze z tagiem
        <select
          value={includeTag ?? ""}
          onChange={(e) => onInclude(e.target.value || null)}
          className="rounded-lg border border-white/10 bg-[#141a2e] px-2 py-1.5 text-[11px] font-medium normal-case tracking-normal text-foreground"
        >
          <option value="">Wszystkie mecze</option>
          {catalog.map((tag) => (
            <option key={`in-${tag}`} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[11rem] flex-1 flex-col gap-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:flex-none">
        Wyklucz mecze z tagiem
        <select
          value={excludeTag ?? ""}
          onChange={(e) => onExclude(e.target.value || null)}
          className="rounded-lg border border-white/10 bg-[#141a2e] px-2 py-1.5 text-[11px] font-medium normal-case tracking-normal text-foreground"
        >
          <option value="">Żadne</option>
          {catalog.map((tag) => (
            <option key={`ex-${tag}`} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
