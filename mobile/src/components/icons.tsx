import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";

// Same path data as the design's bottom-nav glyphs.
type P = { color: string; size?: number };
const base = (color: string) => ({
  fill: "none",
  stroke: color,
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const FeedIcon = ({ color, size = 19 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
    <Path d="M2 12h4l3-8 4 16 3-8h6" />
  </Svg>
);

export const SmartIcon = ({ color, size = 19 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
    <Polyline points="3 17 9.5 10.5 13.5 14.5 21 7" />
    <Polyline points="15 7 21 7 21 13" />
  </Svg>
);

export const BookIcon = ({ color, size = 19 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
    <Rect x="3" y="4.5" width="18" height="15.5" rx="2.5" />
    <Path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </Svg>
);

// Gear, from Lucide (ISC), at the nav icons' stroke weight.
export const SettingsIcon = ({ color, size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
    <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

export const RoomsIcon = ({ color, size = 19 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
    <Circle cx="12" cy="8" r="3.4" />
    <Path d="M4.8 19.5a7.2 7.2 0 0 1 14.4 0" />
  </Svg>
);
