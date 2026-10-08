import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Linking, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ApiError, login, me, tokenStore, type Driver } from "./api";
import { EMPTY_META, getMeta, isSharing, pendingCount, startSharing, stopSharing, type Meta } from "./tracking";

const BRAND = "#2563eb";
const GREEN = "#16a34a";

// Put your logo at ./assets/logo.png (same folder level as this file)
const LOGO = require("./assets/logo.png");
const COMPANY = "Jakkar Marketing Corporation";
const COMPANY_SHORT = "Jakkar Marketing";

function Brand({ variant }: { variant: "large" | "compact" }) {
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
      <Text style={s.brandTag}>Delivery truck monitoring and tracking system</Text>
    </View>
  );
}

export default function App() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStore.get();
        if (token) setDriver((await me(token)).driver);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await tokenStore.clear();
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const signOut = useCallback(async () => {
    await stopSharing().catch(() => {}); // never leave a truck broadcasting after sign-out
    await tokenStore.clear();
    setDriver(null);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen}>
        <StatusBar style="dark" />
        {booting ? (
          <View style={s.center}><ActivityIndicator size="large" color={BRAND} /></View>
        ) : driver ? (
          <Home driver={driver} onSignOut={signOut} />
        ) : (
          <Login onSuccess={setDriver} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Login({ onSuccess }: { onSuccess: (d: Driver) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!identifier.trim()) return setError("Enter your email or phone number");
    if (!/^\d{6}$/.test(pin)) return setError("PIN must be 6 digits");
    setError(""); setBusy(true);
    try {
      const { token, driver } = await login(identifier.trim(), pin);
      await tokenStore.set(token);
      onSuccess(driver);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.center} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Brand variant="large" />
      <View style={s.card}>
        <Text style={s.title}>Driver sign in</Text>
        <Text style={s.sub}>Use your email or phone number and your 6-digit PIN.</Text>

        <Text style={s.label}>Email or phone</Text>
        <TextInput
          style={s.input} value={identifier} onChangeText={setIdentifier}
          placeholder="0917 123 4567 or you@example.com"
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
          textContentType="username" autoComplete="username"
        />

        <Text style={s.label}>PIN</Text>
        <TextInput
          style={[s.input, s.pin]} value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••" secureTextEntry keyboardType="number-pad" maxLength={6}
          textContentType="password" autoComplete="password" onSubmitEditing={submit}
        />

        {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}

        <Pressable style={[s.button, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function PulseDot({ color }: { color: string }) {
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

const ago = (t: number | null, now: number) => {
  if (!t) return "—";
  const sec = Math.max(0, Math.round((now - t) / 1000));
  return sec < 5 ? "just now" : sec < 60 ? `${sec}s ago` : `${Math.floor(sec / 60)} min ago`;
};

function Home({ driver, onSignOut }: { driver: Driver; onSignOut: () => void }) {
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<Meta>(EMPTY_META);
  const [pending, setPending] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");

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
        else if (r === "services-off") setError("Turn on Location (GPS) in your phone settings, then try again.");
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

  const rows: [string, string][] = [
    ["Route", `${driver.routeFrom} → ${driver.routeTo}`],
    ["Plate", driver.plateNumber],
    ["Vehicle", driver.vehicleType ?? "—"],
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
        <Text style={s.title}>{driver.name}</Text>

        <View style={[s.card, { marginTop: 16 }]}>
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
            style={[s.shareBtn, { backgroundColor: sharing ? "#dc2626" : GREEN }, busy && { opacity: 0.6 }]}
            onPress={toggle} disabled={busy} accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{sharing ? "Stop sharing" : "Start sharing location"}</Text>}
          </Pressable>

          {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}

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
        <View style={[s.card, s.detailsCard]}>
          {rows.map(([k, v], i) => (
            <View key={k} style={[s.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.rowKey}>{k}</Text>
              <Text style={s.rowVal}>{v}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", padding: 20 },
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
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#e2e8f0" },
  title: { fontSize: 24, fontWeight: "600", color: "#0f172a" },
  sub: { marginTop: 4, marginBottom: 12, color: "#64748b", fontSize: 14 },
  label: { marginTop: 12, marginBottom: 6, fontSize: 14, fontWeight: "500", color: "#0f172a" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: "#fff" },
  pin: { letterSpacing: 8, fontSize: 20 },
  error: { marginTop: 12, backgroundColor: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, fontSize: 14 },
  button: { marginTop: 20, backgroundColor: BRAND, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusText: { fontSize: 17, fontWeight: "600", color: "#0f172a" },
  idleDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#94a3b8", marginHorizontal: 3 },
  shareBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" },
  rowKey: { color: "#64748b" },
  rowVal: { color: "#0f172a", fontWeight: "500", flexShrink: 1, textAlign: "right", marginLeft: 16 },
  outline: { marginTop: 24, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingVertical: 12, alignItems: "center", backgroundColor: "#fff" },
  outlineText: { fontWeight: "500", color: "#0f172a" },

  // brand
  brandCol: { alignItems: "center", marginBottom: 24 },
  logoLarge: { width: 224, height: 56 },
  brandNameLarge: { marginTop: 12, fontSize: 20, fontWeight: "600", color: "#0f172a", textAlign: "center" },
  brandTag: { marginTop: 4, fontSize: 13, color: "#64748b", textAlign: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 8 },
  logoSmall: { width: 112, height: 28 },
  brandNameSmall: { flex: 1, fontSize: 14, fontWeight: "600", color: "#0f172a" },
});