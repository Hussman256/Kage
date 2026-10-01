// Ported 1:1 from the Claude Design spec (same values as the web app's
// app/globals.css). Keep the two in sync.
export const dark = {
  canvas: "#07030D", inv: "#0A0512", invT: "rgba(10,5,18,0)",
  card: "#130B22", panel: "#0F0819", panel2: "#0D0716", ring: "#14092a", navBg: "rgba(10,5,18,.92)",
  ink: "#FBFAF9", ink2: "#C9C2DB", ink3: "#A79DBE", ink4: "#8D83A3", ink5: "#7D7391", ink6: "#6B6280",
  purp: "#836EF9", purpHov: "#9A88FF", purpInk: "#B3A4FF", purpAlt: "#5F4BD6",
  grn: "#59D9A0", grn2: "#7CE8B4", g12: "rgba(89,217,160,.12)", g16: "rgba(89,217,160,.16)",
  g30: "rgba(89,217,160,.3)", g35: "rgba(89,217,160,.35)", g40: "rgba(89,217,160,.4)",
  berryInk: "#F08CBE", berryInk2: "#F5B8D4", berryInk3: "#E393BC",
  a08: "rgba(251,250,249,.08)", a09: "rgba(251,250,249,.09)", a10: "rgba(251,250,249,.10)",
  a12: "rgba(251,250,249,.12)", a14: "rgba(251,250,249,.14)", a15: "rgba(251,250,249,.15)",
  a16: "rgba(251,250,249,.16)", a22: "rgba(251,250,249,.22)",
  scrim1: "rgba(7,3,13,.94)", scrim2: "rgba(7,3,13,.55)",
  shadow1: "rgba(0,0,0,.9)",
  wash1: "rgba(131,110,249,.20)", berryWash1: "rgba(160,5,93,.16)",
  // Glow opacities for SVG radial gradients (same washes as above).
  washO: 0.2, berryWashO: 0.16,
  markShadow: "rgba(131,110,249,.30)", rowShadow: "rgba(131,110,249,.13)",
  // Fixed accents used directly in the design, same in both themes.
  berry: "#A0055D", purpTint18: "rgba(131,110,249,.18)", berryTint18: "rgba(160,5,93,.18)",
};

export type Tokens = typeof dark;

export const light: Tokens = {
  canvas: "#EFEAE4", inv: "#FBFAF9", invT: "rgba(251,250,249,0)",
  card: "#FFFFFF", panel: "#FFFFFF", panel2: "#FBFAF9", ring: "#FFFFFF", navBg: "rgba(251,250,249,.94)",
  ink: "#0E100F", ink2: "#45404E", ink3: "#565163", ink4: "#605A6E", ink5: "#6B6579", ink6: "#6B6579",
  purp: "#5B41E0", purpHov: "#4A32C8", purpInk: "#4A32C8", purpAlt: "#4A32C8",
  grn: "#0B7D56", grn2: "#0B7D56", g12: "rgba(11,125,86,.10)", g16: "rgba(11,125,86,.12)",
  g30: "rgba(11,125,86,.32)", g35: "rgba(11,125,86,.34)", g40: "rgba(11,125,86,.38)",
  berryInk: "#A0055D", berryInk2: "#8C044F", berryInk3: "#8C044F",
  a08: "rgba(14,16,15,.10)", a09: "rgba(14,16,15,.11)", a10: "rgba(14,16,15,.12)",
  a12: "rgba(14,16,15,.14)", a14: "rgba(14,16,15,.16)", a15: "rgba(14,16,15,.17)",
  a16: "rgba(14,16,15,.18)", a22: "rgba(14,16,15,.24)",
  scrim1: "rgba(239,234,228,.92)", scrim2: "rgba(239,234,228,.45)",
  shadow1: "rgba(14,16,15,.16)",
  wash1: "rgba(131,110,249,.16)", berryWash1: "rgba(160,5,93,.10)",
  washO: 0.16, berryWashO: 0.1,
  markShadow: "rgba(131,110,249,.45)", rowShadow: "rgba(131,110,249,.16)",
  berry: "#A0055D", purpTint18: "rgba(131,110,249,.18)", berryTint18: "rgba(160,5,93,.18)",
};

// Font family names registered by useFonts in app/_layout.tsx.
export const fonts = {
  light: "Geist_300Light",
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  mono: "GeistMono_400Regular",
  monoSemibold: "GeistMono_600SemiBold",
  monoBold: "GeistMono_700Bold",
  mark: "KageMark-Bold",
  markBlack: "KageMark-Black",
};
