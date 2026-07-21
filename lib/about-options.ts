export const DART_WEIGHT_OPTIONS: { value: string; label: string }[] = [
  { value: "14-", label: "≤14 g" },
  ...Array.from({ length: 13 }, (_, i) => {
    const g = 15 + i;
    return { value: String(g), label: `${g} g` };
  }),
  { value: "28+", label: "≥28 g" },
];

export function formatWeightBucketLabel(bucket: string | null | undefined): string {
  if (!bucket) return "";
  const found = DART_WEIGHT_OPTIONS.find((o) => o.value === bucket);
  return found?.label ?? bucket;
}
