export const AVATAR_COLORS = {
  amber:   { bg: "bg-amber-400/20",   border: "border-amber-400/40",   text: "text-amber-400",   swatch: "bg-amber-400"   },
  violet:  { bg: "bg-violet-400/20",  border: "border-violet-400/40",  text: "text-violet-400",  swatch: "bg-violet-400"  },
  emerald: { bg: "bg-emerald-400/20", border: "border-emerald-400/40", text: "text-emerald-400", swatch: "bg-emerald-400" },
  blue:    { bg: "bg-blue-400/20",    border: "border-blue-400/40",    text: "text-blue-400",    swatch: "bg-blue-400"    },
  rose:    { bg: "bg-rose-400/20",    border: "border-rose-400/40",    text: "text-rose-400",    swatch: "bg-rose-400"    },
  sky:     { bg: "bg-sky-400/20",     border: "border-sky-400/40",     text: "text-sky-400",     swatch: "bg-sky-400"     },
} as const;

export type AvatarColor = keyof typeof AVATAR_COLORS;

export function getAvatarColors(color: string | null) {
  return AVATAR_COLORS[(color as AvatarColor) ?? "amber"] ?? AVATAR_COLORS.amber;
}
