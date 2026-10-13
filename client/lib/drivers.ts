export const BRANDS = ["Honda", "Suzuki", "Yamaha", "Kawasaki", "Isuzu", "Mitsubishi", "Toyota", "Hino", "Hyundai", "Foton", "Nissan", "Ford"];
export const vehicleLabel = (d: { vehicleBrand: string | null; vehicleType: string | null }) =>
  [d.vehicleBrand, d.vehicleType].filter(Boolean).join(" ");
export const hasRoutePins = (d: { routeFromLat: number | null; routeToLat: number | null }) =>
  d.routeFromLat != null && d.routeToLat != null;