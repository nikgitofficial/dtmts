import type { Metadata } from "next";
import AuthForm from "@/components/features/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };
export default function Page() { return <AuthForm mode="login" />; }