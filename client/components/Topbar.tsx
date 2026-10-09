"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, isActive } from "./nav";

export default function Topbar() {
  const pathname = usePathname();
  const title = NAV.find((n) => isActive(pathname, n.href))?.label ?? "Dashboard";

  // set on the client to avoid a server/client timezone hydration mismatch
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date())
    );
  }, []);

  return (
    <div className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur lg:flex">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500">Jakkar Marketing DTMTS</p>
      </div>
      <p className="text-sm text-slate-500" suppressHydrationWarning>
        {today}
      </p>
    </div>
  );
}