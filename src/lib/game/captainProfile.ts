export type CaptainGender = "he" | "she" | "they";

export interface CaptainProfile {
  name: string;
  gender: CaptainGender;
}

const STORAGE_KEY = "starforge-relay-captain-v1";

const PRONOUNS: Record<CaptainGender, { subject: string; object: string; possessive: string; label: string }> = {
  he: { subject: "he", object: "him", possessive: "his", label: "he/him" },
  she: { subject: "she", object: "her", possessive: "her", label: "she/her" },
  they: { subject: "they", object: "them", possessive: "their", label: "they/them" },
};

export function pronounsFor(gender: CaptainGender) {
  return PRONOUNS[gender];
}

export function loadCaptainProfile(): CaptainProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CaptainProfile>;
    if (!parsed.name?.trim()) return null;
    const gender = parsed.gender;
    if (gender !== "he" && gender !== "she" && gender !== "they") return null;
    return { name: parsed.name.trim().slice(0, 24), gender };
  } catch {
    return null;
  }
}

export function saveCaptainProfile(profile: CaptainProfile): CaptainProfile {
  const next: CaptainProfile = {
    name: profile.name.trim().slice(0, 24) || "Captain",
    gender: profile.gender,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private browsing
  }
  return next;
}
