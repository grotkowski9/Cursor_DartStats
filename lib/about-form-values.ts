import type { CustomerProfile } from "@/lib/customer";

export type AboutFormValues = {
  city: string;
  dartBrand: string;
  dartBrandOther: string;
  dartModel: string;
  dartWeightBucket: string;
  throwingHand: "" | "L" | "R";
  favoritePlayerId: string;
  newsletterOptIn: boolean;
};

/** Pure helper — safe on server and client. */
export function customerToAboutValues(c: CustomerProfile): AboutFormValues {
  return {
    city: c.city ?? "",
    dartBrand: c.dartBrand ?? "",
    dartBrandOther: c.dartBrandOther ?? "",
    dartModel: c.dartModel ?? "",
    dartWeightBucket: c.dartWeightBucket ?? "",
    throwingHand: c.throwingHand ?? "",
    favoritePlayerId: c.favoritePlayerId ?? "",
    newsletterOptIn: c.newsletterOptIn,
  };
}
