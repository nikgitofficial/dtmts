import type { Metadata } from "next";
import LogsView from "@/components/features/logs/LogsView";

export const metadata: Metadata = { title: "Session logs" };
export default function Page() { return <LogsView />; }