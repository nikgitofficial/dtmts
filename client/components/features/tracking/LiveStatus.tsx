export default function LiveStatus({ error, connected, since }: { error: string; connected: boolean; since: number | null }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-slate-600">
      {error ? (
        <><span className="size-2 rounded-full bg-red-500" />{error}</>
      ) : connected ? (
        <>
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          Live · updated {since! < 2 ? "just now" : `${since}s ago`}
        </>
      ) : "Connecting…"}
    </div>
  );
}