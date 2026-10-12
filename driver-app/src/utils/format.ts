export const ago = (t: number | null, now: number) => {
  if (!t) return "—";
  const sec = Math.max(0, Math.round((now - t) / 1000));
  return sec < 5 ? "just now" : sec < 60 ? `${sec}s ago` : `${Math.floor(sec / 60)} min ago`;
};