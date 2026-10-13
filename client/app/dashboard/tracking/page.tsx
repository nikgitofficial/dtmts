import type { Metadata } from "next";
import TrackingView from "@/components/features/tracking/TrackingView";

export const metadata: Metadata = { title: "Live tracking" };
export default function Page() { return <TrackingView />; }