import { useState } from "react";
import { View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { useTheme } from "@/theme/theme";

// The Risk screen's 5px track with a 19px ink thumb. Snaps to `step`.
export function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTheme();
  const [width, setWidth] = useState(0);
  const frac = (value - min) / (max - min);

  const handle = (e: GestureResponderEvent) => {
    const f = Math.min(1, Math.max(0, e.nativeEvent.locationX / Math.max(width, 1)));
    const next = Math.round((min + f * (max - min)) / step) * step;
    if (next !== value) onChange(next);
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // Keep the drag even if the parent ScrollView wants the gesture.
      onResponderTerminationRequest={() => false}
      onResponderGrant={handle}
      onResponderMove={handle}
      hitSlop={{ top: 14, bottom: 14 }}
      style={{ height: 19, justifyContent: "center" }}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === "increment" ? step : -step))))
      }
    >
      <View pointerEvents="none" style={{ height: 5, borderRadius: 999, backgroundColor: t.a10 }}>
        <View style={{ height: 5, borderRadius: 999, backgroundColor: t.purp, width: `${frac * 100}%` }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute", left: frac * width - 9.5, width: 19, height: 19, borderRadius: 10, backgroundColor: t.ink,
          shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 4,
        }}
      />
    </View>
  );
}
