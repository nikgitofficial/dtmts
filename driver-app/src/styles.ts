import { StyleSheet } from "react-native";
import { BRAND } from "./theme";

// Styles used by more than one screen/component
export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#e2e8f0" },
  title: { fontSize: 24, fontWeight: "600", color: "#0f172a" },
  error: { marginTop: 12, backgroundColor: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, fontSize: 14 },
  button: { marginTop: 20, backgroundColor: BRAND, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});