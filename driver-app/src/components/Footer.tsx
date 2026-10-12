import { Image, StyleSheet, Text, View } from "react-native";
import { COMPANY_SHORT, LOGO, TAGLINE } from "../theme";

export default function Footer() {
  return (
    <View style={s.footer}>
      <Image source={LOGO} style={s.logoFooter} resizeMode="contain" accessibilityLabel="Jakkar logo" />
      <Text style={s.footerText}>© {new Date().getFullYear()} {COMPANY_SHORT}. All rights reserved.</Text>
      <Text style={s.footerSub}>{TAGLINE}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  footer: {
    alignItems: "center", gap: 4, paddingVertical: 12, paddingHorizontal: 20,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0",
  },
  logoFooter: { width: 80, height: 20, marginBottom: 2 },
  footerText: { fontSize: 12, color: "#64748b", textAlign: "center" },
  footerSub: { fontSize: 11, color: "#94a3b8", textAlign: "center" },
});