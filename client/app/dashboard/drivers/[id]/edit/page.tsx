"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DriverForm from "@/components/DriverForm";
import { rest } from "@/lib/api";
import type { Driver } from "@/lib/drivers";

export default function EditDriver() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    rest<{ driver: Driver }>(`/drivers/${id}`)
      .then((d) => setDriver(d.driver))
      .catch((e) => router.replace(e.message === "Unauthorized" ? "/login" : "/dashboard/drivers"));
  }, [id, router]);

  if (!driver) return <main className="grid min-h-dvh place-items-center text-slate-500">Loading…</main>;
  return <DriverForm driver={driver} />;
}