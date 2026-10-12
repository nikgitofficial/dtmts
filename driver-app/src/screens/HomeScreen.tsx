import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import type { Driver } from "../api";
import Brand from "../components/Brand";
import Footer from "../components/Footer";
import PulseDot from "../components/PulseDot";
import { EMPTY_META, getMeta, isSharing, pendingCount, startSharing, stopSharing, type Meta } from "../services/tracking";
import { shared } from "../styles";
import { GREEN, RED } from "../theme";
import { ago } from "../utils/format";

export default function HomeScreen({ driver, onSignOut }: { driver: Driver; onSignOut: () => void }) {
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<Meta>(EMPTY_META);
  const [pending, setPending] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [locModal, setLocModal] = useState(false);
  const [locBusy, setLocBusy] = useState(false);

  useEffect(() => { isSharing().then(setSharing); }, []);

  useEffect(() => {
    const t = setInterval(async () => {
      setNow(Date.now());
      if (busy) return;
      const [m, p, sh] = await Promise.all([getMeta(), pendingCount(), isSharing()]);
      setMeta(m); setPending(p); setSharing(sh);
    }, 2000);
    return () => clearInterval(t);
  }, [busy]);

  async function toggle() {
    setError(""); setBusy(true);
    try {
      if (sharing) {
        await stopSharing();
        setSharing(false);
      } else {
        const r = await startSharing();
        if (r === "ok") setSharing(true);
        else if (r === "services-off") setLocModal(true);
        else Alert.alert(
          r === "denied" ? "Location permission needed" : "Allow location all the time",
          r === "denied"
            ? "Allow location access so your dispatcher can see where your truck is."
            : "To keep sharing while the screen is off, set Location to “Allow all the time” in settings.",
          [{ text: "Not now", style: "cancel" }, { text: "Open settings", onPress: () => Linking.openSettings() }],
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Android: the system prompt turns location on, then sharing starts. iOS: apps can't do this, so open Settings.
  async function turnOnLocation() {
    if (Platform.OS !== "android") {
      setLocModal(false);
      Linking.openSettings();
      return;
    }
    setLocBusy(true);
    try {
      await Location.enableNetworkProviderAsync(); // rejects if the driver taps "No thanks"
      setLocModal(false);
      await toggle();                               // retry: starts sharing now that location is on
    } catch {
      setLocModal(false);
      setError("Location is still off. Turn it on to start sharing.");
    } finally {
      setLocBusy(false);
    }
  }

  const rows: [string, string][] = [
    ["Route", `${driver.routeFrom} → ${driver.routeTo}`],
    ["Plate", driver.plateNumber],
    ["Vehicle", [driver.vehicleBrand, driver.vehicleType].filter(Boolean).join(" ") || "—"],
    ["Capacity", `${driver.capacityKg.toLocaleString()} kg`],
  ];

  return (
    <View style={s.homeWrap}>
      {/* fixed header: nothing can overlap it */}
      <View style={s.header}>
        <Brand variant="compact" />
        <Pressable onPress={onSignOut} style={s.signOutBtn} accessibilityRole="button" hitSlop={8}>
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.home} showsVerticalScrollIndicator={false}>
        <Text style={s.welcome}>Welcome back</Text>
        <Text style={shared.title}>{driver.name}</Text>

        <View style={[shared.card, { marginTop: 16 }]}>
          <View style={s.statusRow}>
            {sharing ? <PulseDot color={GREEN} /> : <View style={s.idleDot} />}
            <Text style={s.statusText}>{sharing ? "Sharing live location" : "Location sharing is off"}</Text>
          </View>
          <Text style={s.statusSub}>
            {sharing
              ? "Your dispatcher can see your truck. Sharing continues with the screen off."
              : "Start sharing when you begin your trip. Stop when you're done."}
          </Text>

          <Pressable
            style={[s.shareBtn, { backgroundColor: sharing ? RED : GREEN }, busy && { opacity: 0.6 }]}
            onPress={toggle} disabled={busy} accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={shared.buttonText}>{sharing ? "Stop sharing" : "Start sharing location"}</Text>}
          </Pressable>

          {!!error && <Text style={shared.error} accessibilityRole="alert">{error}</Text>}

          {sharing && (
            <>
              <View style={s.stats}>
                <View style={s.stat}>
                  <Text style={s.statVal}>{ago(meta.lastSentAt, now)}</Text>
                  <Text style={s.statKey}>Last sent</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={s.statVal}>{meta.last?.accuracy != null ? `±${Math.round(meta.last.accuracy)} m` : "Locating…"}</Text>
                  <Text style={s.statKey}>GPS accuracy</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={s.statVal}>{meta.last?.speed != null ? `${Math.round(meta.last.speed * 3.6)} km/h` : "—"}</Text>
                  <Text style={s.statKey}>Speed</Text>
                </View>
              </View>
              {pending > 0 && <Text style={s.pendingText}>{pending} updates waiting to send</Text>}
              {!!meta.error && <Text style={s.warnText}>{meta.error}</Text>}
            </>
          )}
        </View>

        <Text style={s.sectionLabel}>Trip details</Text>
        <View style={[shared.card, s.detailsCard]}>
          {rows.map(([k, v], i) => (
            <View key={k} style={[s.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.rowKey}>{k}</Text>
              <Text style={s.rowVal}>{v}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Footer />

      <Modal visible={locModal} transparent animationType="fade" onRequestClose={() => setLocModal(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Location is turned off</Text>
            <Text style={s.modalBody}>
              Your dispatcher needs your truck's location.{" "}
              {Platform.OS === "android"
                ? "Tap the button and allow the prompt to turn location on."
                : "Turn on Location Services in Settings, then come back."}
            </Text>
            <Pressable style={[shared.button, { marginTop: 20 }, locBusy && { opacity: 0.6 }]} onPress={turnOnLocation} disabled={locBusy}>
              {locBusy
                ? <ActivityIndicator color="#fff" />
                : <Text style={shared.buttonText}>{Platform.OS === "android" ? "Turn on location" : "Open settings"}</Text>}
            </Pressable>
            <Pressable style={s.modalCancel} onPress={() => setLocModal(false)} disabled={locBusy}>
              <Text style={s.modalCancelText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  homeWrap: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
    paddingHorizontal: 20, height: 64, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
  },
  signOutBtn: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff" },
  signOutText: { fontSize: 13, fontWeight: "500", color: "#0f172a" },
  home: { padding: 20, paddingBottom: 32 },
  welcome: { fontSize: 14, color: "#64748b" },
  statusSub: { marginTop: 6, marginBottom: 16, color: "#64748b", fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: "row", marginTop: 18, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e2e8f0" },
  stat: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  statKey: { marginTop: 2, fontSize: 12, color: "#64748b" },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0" },
  pendingText: { marginTop: 14, textAlign: "center", fontSize: 13, color: "#b45309" },
  warnText: { marginTop: 10, textAlign: "center", fontSize: 13, color: "#b45309" },
  sectionLabel: { marginTop: 24, marginBottom: 8, marginLeft: 4, fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", color: "#64748b" },
  detailsCard: { paddingVertical: 6 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusText: { fontSize: 17, fontWeight: "600", color: "#0f172a" },
  idleDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#94a3b8", marginHorizontal: 3 },
  shareBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" },
  rowKey: { color: "#64748b" },
  rowVal: { color: "#0f172a", fontWeight: "500", flexShrink: 1, textAlign: "right", marginLeft: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: "600", color: "#0f172a" },
  modalBody: { marginTop: 8, fontSize: 15, lineHeight: 22, color: "#475569" },
  modalCancel: { marginTop: 8, paddingVertical: 12, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "500", color: "#64748b" },
});