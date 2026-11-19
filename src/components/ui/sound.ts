/** M11: the "Ton" switch in the account tab, per device; on unless switched off. */
export const SOUND_STORAGE_KEY = "sound";
export const SOUND_CHOICES = ["on", "off"] as const;
export type SoundChoice = (typeof SOUND_CHOICES)[number];

export const parseSound = (raw: string | null): SoundChoice => (raw === "off" ? "off" : "on");
