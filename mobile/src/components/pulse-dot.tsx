import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";

// The design's kagePulse: opacity .35→1 and scale 1→1.35, looping.
export function PulseDot({ color, size = 5, duration = 1600, active = true }: { color: string; size?: number; duration?: number; active?: boolean }) {
  const [v] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, active]);

  return (
    <Animated.View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: color,
        opacity: active ? v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) : 1,
        transform: [{ scale: active ? v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) : 1 }],
      }}
    />
  );
}
