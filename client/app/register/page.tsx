import type { Metadata } from "next";
import AuthForm from "@/components/features/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };
export default function Page() { return <AuthForm mode="register" />; }