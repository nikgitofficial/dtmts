import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ApiError, me, tokenStore, type Driver } from "./src/api";
import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import { stopSharing } from "./src/services/tracking";
import { shared } from "./src/styles";
import { BRAND } from "./src/theme";

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
      <SafeAreaView style={shared.screen}>
        <StatusBar style="dark" />
        {booting ? (
          <View style={shared.center}><ActivityIndicator size="large" color={BRAND} /></View>
        ) : driver ? (
          <HomeScreen driver={driver} onSignOut={signOut} />
        ) : (
          <LoginScreen onSuccess={setDriver} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}