export type Driver = {
  id: string; name: string; email: string; phone: string;
  routeFrom: string; routeTo: string; pinCode: string; plateNumber: string;
  vehicleType: string | null; capacityKg: number; status: "active" | "inactive";
  createdAt: string; updatedAt: string;
};
export type DriverInput = Omit<Driver, "id" | "pinCode" | "createdAt" | "updatedAt">;