import { ICON, Icon } from ".";

export default function SearchInput({
  value, onChange, placeholder, label, className = "",
}: { value: string; onChange: (v: string) => void; placeholder: string; label: string; className?: string }) {
  return (
    <div className={`relative w-full max-w-sm ${className}`}>
      <Icon d={ICON.search} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Icon d={ICON.x} />
        </button>
      )}
    </div>
  );
}