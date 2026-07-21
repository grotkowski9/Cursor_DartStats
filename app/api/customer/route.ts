import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import {
  needsAboutOnboarding,
  needsOnboarding,
  updateCustomerProfile,
  type CustomerProfilePatch,
  type ThrowingHand,
} from "@/lib/customer";
import plCities from "@/data/pl-cities.json";
import dartBrands from "@/data/dart-brands.json";
import favoritePlayers from "@/data/favorite-players.json";

export const dynamic = "force-dynamic";

const CITY_SET = new Set((plCities as string[]).map((c) => c));
const BRAND_IDS = new Set((dartBrands as { id: string }[]).map((b) => b.id));
const PLAYER_IDS = new Set((favoritePlayers as { id: string }[]).map((p) => p.id));

const WEIGHT_BUCKETS = new Set([
  "14-",
  ...Array.from({ length: 13 }, (_, i) => String(15 + i)),
  "28+",
]);

export async function GET() {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;
  return NextResponse.json({
    customer: auth.customer,
    needsOnboarding: needsOnboarding(auth.customer),
    needsAboutOnboarding: needsAboutOnboarding(auth.customer),
  });
}

type PatchBody = {
  firstName?: string;
  lastName?: string;
  nickname?: string | null;
  knownNicknames?: string[];
  city?: string | null;
  dartBrand?: string | null;
  dartBrandOther?: string | null;
  dartModel?: string | null;
  dartWeightBucket?: string | null;
  throwingHand?: ThrowingHand | null;
  favoritePlayerId?: string | null;
  profileStatsVisible?: boolean;
  newsletterOptIn?: boolean;
  markAboutCompleted?: boolean;
  markTourCompleted?: boolean;
};

export async function PATCH(request: Request) {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const hasIdentity =
    body.firstName !== undefined ||
    body.lastName !== undefined ||
    body.nickname !== undefined ||
    body.knownNicknames !== undefined;

  const patch: CustomerProfilePatch = {};

  if (hasIdentity) {
    const nicknames = (body.knownNicknames ?? auth.customer.knownNicknames)
      .map((n) => n.trim())
      .filter(Boolean);
    if (nicknames.length === 0) {
      return NextResponse.json(
        { error: "Podaj co najmniej jeden wzorzec N01 (np. nazwisko)." },
        { status: 400 },
      );
    }
    const firstName = body.firstName ?? auth.customer.firstName;
    const lastName = body.lastName ?? auth.customer.lastName;
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: "Podaj imię i nazwisko." }, { status: 400 });
    }
    const nickname =
      body.nickname !== undefined ? body.nickname : auth.customer.nickname;
    if (!nickname?.trim()) {
      return NextResponse.json({ error: "Podaj pseudonim główny." }, { status: 400 });
    }
    patch.firstName = firstName;
    patch.lastName = lastName;
    patch.nickname = nickname;
    patch.knownNicknames = nicknames;
  }

  if (body.city !== undefined) {
    const city = body.city?.trim() || null;
    if (city && !CITY_SET.has(city)) {
      return NextResponse.json(
        { error: "Wybierz gminę z listy (wpisz min. 3 litery)." },
        { status: 400 },
      );
    }
    patch.city = city;
  }

  if (body.dartBrand !== undefined) {
    const brand = body.dartBrand?.trim() || null;
    if (brand && !BRAND_IDS.has(brand)) {
      return NextResponse.json({ error: "Nieprawidłowa marka lotek." }, { status: 400 });
    }
    patch.dartBrand = brand;
    if (brand !== "other") patch.dartBrandOther = null;
  }

  if (body.dartBrandOther !== undefined) {
    patch.dartBrandOther = body.dartBrandOther;
  }

  if (body.dartModel !== undefined) patch.dartModel = body.dartModel;

  if (body.dartWeightBucket !== undefined) {
    const w = body.dartWeightBucket?.trim() || null;
    if (w && !WEIGHT_BUCKETS.has(w)) {
      return NextResponse.json({ error: "Nieprawidłowa waga lotek." }, { status: 400 });
    }
    patch.dartWeightBucket = w;
  }

  if (body.throwingHand !== undefined) {
    const h = body.throwingHand;
    if (h !== null && h !== "L" && h !== "R") {
      return NextResponse.json({ error: "Wybierz rękę L lub P." }, { status: 400 });
    }
    patch.throwingHand = h;
  }

  if (body.favoritePlayerId !== undefined) {
    const id = body.favoritePlayerId?.trim() || null;
    if (id && !PLAYER_IDS.has(id)) {
      return NextResponse.json({ error: "Nieprawidłowy zawodnik." }, { status: 400 });
    }
    patch.favoritePlayerId = id;
  }

  // 1.1.10.21 — always on in UI; still accept true only from client
  if (body.profileStatsVisible !== undefined) {
    patch.profileStatsVisible = true;
  }
  if (body.newsletterOptIn !== undefined) {
    patch.newsletterOptIn = Boolean(body.newsletterOptIn);
  }
  if (body.markAboutCompleted) patch.markAboutCompleted = true;
  if (body.markTourCompleted) patch.markTourCompleted = true;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Brak pól do aktualizacji." }, { status: 400 });
  }

  try {
    const customer = await updateCustomerProfile(auth.customer.customerId, patch);
    return NextResponse.json({ customer });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
