import type { Metadata } from "next";
import DriverForm from "@/components/features/drivers/DriverForm";

export const metadata: Metadata = { title: "Register driver" };
export default function Page() { return <DriverForm />; }