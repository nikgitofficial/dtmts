import type { Metadata } from "next";
import DriversView from "@/components/features/drivers/DriversView";

export const metadata: Metadata = { title: "Drivers" };
export default function Page() { return <DriversView />; }