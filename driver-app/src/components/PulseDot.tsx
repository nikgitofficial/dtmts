import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

export default function PulseDot({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
      }} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}