import type { TelegramWebAppUser } from "../../types/telegram";

export type CaptainGender = "he" | "she" | "they";

export interface CaptainProfile {
  name: string;
  gender: CaptainGender;
}

const STORAGE_KEY = "starforge-relay-captain-v1";

const ADJECTIVES = [
  "Swift",
  "Iron",
  "Ghost",
  "Crimson",
  "Silent",
  "Nova",
  "Rogue",
  "Solar",
  "Void",
  "Bright",
] as const;

const NOUNS = [
  "Pilot",
  "Hawk",
  "Drift",
  "Comet",
  "Vanguard",
  "Relay",
  "Spear",
  "Warden",
  "Spark",
  "Ranger",
] as const;

const PRONOUNS: Record<
  CaptainGender,
  { subject: string; object: string; possessive: string; label: string }
> = {
  he: { subject: "he", object: "him", possessive: "his", label: "he/him" },
  she: { subject: "she", object: "her", possessive: "her", label: "she/her" },
  they: { subject: "they", object: "them", possessive: "their", label: "they/them" },
};

export function pronounsFor(gender: CaptainGender) {
  return PRONOUNS[gender];
}

export function isGenericCallsign(name: string | undefined | null): boolean {
  const trimmed = name?.trim().toLowerCase();
  return !trimmed || trimmed === "captain";
}

export function generateDefaultCallsign(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  if (Math.random() < 0.5) {
    return `${adjective}-${noun}`;
  }
  return `Pilot-${suffix}`;
}

export function resolveSuggestedCallsign(user?: TelegramWebAppUser | null): string {
  if (user) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    if (fullName) return fullName.slice(0, 24);
    if (user.username?.trim()) return user.username.trim().slice(0, 24);
  }
  return generateDefaultCallsign();
}

export function loadCaptainProfile(): CaptainProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CaptainProfile>;
    if (!parsed.name?.trim() || isGenericCallsign(parsed.name)) return null;
    const gender = parsed.gender;
    if (gender !== "he" && gender !== "she" && gender !== "they") return null;
    return { name: parsed.name.trim().slice(0, 24), gender };
  } catch {
    return null;
  }
}

export function saveCaptainProfile(profile: CaptainProfile): CaptainProfile {
  const trimmed = profile.name.trim().slice(0, 24);
  const next: CaptainProfile = {
    name: isGenericCallsign(trimmed) ? generateDefaultCallsign() : trimmed,
    gender: profile.gender,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private browsing
  }
  return next;
}

export function captainDisplayName(
  captain: CaptainProfile | null | undefined,
  fallback?: string,
): string {
  if (captain?.name && !isGenericCallsign(captain.name)) return captain.name;
  if (fallback && !isGenericCallsign(fallback)) return fallback;
  return generateDefaultCallsign();
}
