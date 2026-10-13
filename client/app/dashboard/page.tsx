import type { Metadata } from "next";
import DashboardView from "@/components/features/dashboard/DashboardView";

export const metadata: Metadata = { title: "Overview" };
export default function Page() { return <DashboardView />; }