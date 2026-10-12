import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { login, tokenStore, type Driver } from "../api";
import Brand from "../components/Brand";
import { shared } from "../styles";

export default function LoginScreen({ onSuccess }: { onSuccess: (d: Driver) => void }) {
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
    <KeyboardAvoidingView style={shared.center} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Brand variant="large" />
      <View style={shared.card}>
        <Text style={shared.title}>Driver sign in</Text>
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

        {!!error && <Text style={shared.error} accessibilityRole="alert">{error}</Text>}

        <Pressable style={[shared.button, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={shared.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  sub: { marginTop: 4, marginBottom: 12, color: "#64748b", fontSize: 14 },
  label: { marginTop: 12, marginBottom: 6, fontSize: 14, fontWeight: "500", color: "#0f172a" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: "#fff" },
  pin: { letterSpacing: 8, fontSize: 20 },
});