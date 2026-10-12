import { Image, StyleSheet, Text, View } from "react-native";
import { COMPANY, COMPANY_SHORT, LOGO, TAGLINE } from "../theme";

export default function Brand({ variant }: { variant: "large" | "compact" }) {
  if (variant === "compact") {
    return (
      <View style={s.brandRow}>
        <Image source={LOGO} style={s.logoSmall} resizeMode="contain" accessibilityLabel="Jakkar logo" />
        <Text style={s.brandNameSmall} numberOfLines={1}>{COMPANY_SHORT}</Text>
      </View>
    );
  }
  return (
    <View style={s.brandCol}>
      <Image source={LOGO} style={s.logoLarge} resizeMode="contain" accessibilityLabel="Jakkar logo" />
      <Text style={s.brandNameLarge}>{COMPANY}</Text>
      <Text style={s.brandTag}>{TAGLINE}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  brandCol: { alignItems: "center", marginBottom: 24 },
  logoLarge: { width: 224, height: 56 },
  brandNameLarge: { marginTop: 12, fontSize: 20, fontWeight: "600", color: "#0f172a", textAlign: "center" },
  brandTag: { marginTop: 4, fontSize: 13, color: "#64748b", textAlign: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 8 },
  logoSmall: { width: 112, height: 28 },
  brandNameSmall: { flex: 1, fontSize: 14, fontWeight: "600", color: "#0f172a" },
});