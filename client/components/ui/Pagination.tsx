import { btn, ICON, Icon } from ".";

export default function Pagination({
  page, total, pageSize, onPage, disabled = false,
}: { page: number; total: number; pageSize: number; onPage: (p: number) => void; disabled?: boolean }) {
  if (total <= 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={disabled || page <= 1} className={btn.smSecondary}>
          <Icon d={ICON.left} />Previous
        </button>
        <span className="tabular-nums">Page {page} of {pages}</span>
        <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={disabled || page >= pages} className={btn.smSecondary}>
          Next<Icon d={ICON.right} />
        </button>
      </div>
    </nav>
  );
}