import { SESSION_META } from "@/lib/logs";
import type { SessionState } from "@/types/session";

export default function StateBadge({ state }: { state: SessionState }) {
  const m = SESSION_META[state];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${m.badge}`}>
      <span className="relative flex size-1.5">
        {state === "live" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${m.dot}`} />}
        <span className={`relative inline-flex size-1.5 rounded-full ${m.dot}`} />
      </span>
      {m.label}
    </span>
  );
}