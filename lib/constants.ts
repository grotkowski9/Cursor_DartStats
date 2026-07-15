/**
 * Seed / legacy MVP customer (Piotr). Used only by seed scripts and
 * OWNER_EMAIL linking — never as a silent runtime default for APIs.
 */
export const SEED_CUSTOMER_ID =
  process.env.SEED_CUSTOMER_ID ??
  process.env.DEFAULT_CUSTOMER_ID ??
  "a0000000-0000-4000-8000-000000000001";

/** @deprecated Use SEED_CUSTOMER_ID — kept for seed script compat. */
export const DEFAULT_CUSTOMER_ID = SEED_CUSTOMER_ID;

/** Stały klient demo — mecze w Supabase, nie w plikach repo. */
export const DEMO_CUSTOMER_ID =
  process.env.DEMO_CUSTOMER_ID ?? "b0000000-0000-4000-8000-000000000001";

/**
 * @deprecated Prefer customer.known_nicknames via autoDetectPatterns().
 * Empty default — multi-user must not inherit Grotkowski patterns.
 */
export const AUTO_DETECT_PATTERNS = [] as const;

/** @deprecated Use customer.displayName from DB via getCustomerById() */
export const PLAYER_DISPLAY_NAME = 'Piotr „Groteł" Grotkowski';

export const N01_API =
  "https://tk2-228-23746.vs.sakura.ne.jp/n01/tournament/n01_user_t.php?cmd=match_view&sid=";

export const TMID_REGEX = /^t_[A-Za-z0-9]+(_[A-Za-z0-9]+)+$/;

export const SEED_URLS = [
  "https://n01darts.com/n01/league/n01_view.html?tmid=t_84WD_6808_rr_1_ODeb_WvbB",
  "https://n01darts.com/n01/tournament/n01_view.html?tmid=t_AWMW_0234_t_2_ASmj_P4P5",
  "https://n01darts.com/n01/league/n01_view.html?tmid=t_84WD_6808_rr_1_6zyK_WvbB",
] as const;
