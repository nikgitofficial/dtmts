// Only PUBLIC values belong here. Anything prefixed EXPO_PUBLIC_ is readable by anyone who unpacks the app.
const PROD_URL = "https://dtmts.onrender.com";
const DEV_FALLBACK = "http://192.168.1.10:4000"; // dev only; set EXPO_PUBLIC_API_URL in .env.development

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? DEV_FALLBACK : PROD_URL);

if (!__DEV__ && !API_URL.startsWith("https://")) {
  console.warn("Production build is not using HTTPS:", API_URL);
}