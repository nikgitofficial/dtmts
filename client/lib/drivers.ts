export type Driver = {
  id: string; name: string; email: string; phone: string;
  routeFrom: string; routeTo: string;
  routeFromLat: number | null; routeFromLng: number | null;
  routeToLat: number | null; routeToLng: number | null;
  pinCode: string; plateNumber: string;
  vehicleBrand: string | null; vehicleType: string | null;
  capacityKg: number; status: "active" | "inactive";
  createdAt: string; updatedAt: string;
};
export type DriverInput = Omit<Driver, "id" | "pinCode" | "createdAt" | "updatedAt"
  | "routeFromLat" | "routeFromLng" | "routeToLat" | "routeToLng">;

export const BRANDS = ["Honda", "Suzuki", "Yamaha", "Kawasaki", "Isuzu", "Mitsubishi", "Toyota", "Hino", "Hyundai", "Foton", "Nissan", "Ford"];
export const vehicleLabel = (d: { vehicleBrand: string | null; vehicleType: string | null }) =>
  [d.vehicleBrand, d.vehicleType].filter(Boolean).join(" ");
export const hasRoutePins = (d: { routeFromLat: number | null; routeToLat: number | null }) =>
  d.routeFromLat != null && d.routeToLat != null;