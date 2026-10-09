import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Jakkar Marketing" width={160} height={40} className="h-6 w-auto shrink-0" />
          <p>© {new Date().getFullYear()} Jakkar Marketing. All rights reserved.</p>
        </div>
        <p>Delivery Truck Monitoring &amp; Tracking System</p>
      </div>
    </footer>
  );
}