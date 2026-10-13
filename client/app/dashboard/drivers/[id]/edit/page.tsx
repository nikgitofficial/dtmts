"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DriverForm from "@/components/features/drivers/DriverForm";
import { DriverFormPageSkeleton } from "@/components/features/drivers/skeletons";
import { useApiError } from "@/hooks/useApiError";
import { restParsed } from "@/lib/api";
import { driverResponseSchema } from "@/schemas/driver";
import type { Driver } from "@/types/driver";

export default function EditDriver() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const handleError = useApiError();
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    restParsed(`/drivers/${id}`, driverResponseSchema)
      .then((d) => setDriver(d.driver))
      .catch((e) => {
        // 401 redirects to /login inside handleError; anything else goes back to the list
        if (handleError(e) !== null) router.replace("/dashboard/drivers");
      });
  }, [id, router, handleError]);

  if (!driver) return <DriverFormPageSkeleton />;
  return <DriverForm driver={driver} />;
}