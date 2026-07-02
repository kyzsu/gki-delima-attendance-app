import { Button } from "@/components/ui/button";
import { Ic, RIc } from "@/components/icons";

export function Pager({
  page,
  pageCount,
  rangeStart,
  rangeEnd,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3">
      <span className="text-[11.5px] font-semibold text-muted tabular-nums">
        {rangeStart}–{rangeEnd} dari {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="back"
          aria-label="Halaman sebelumnya"
          disabled={page === 0}
          className="disabled:opacity-40"
          onClick={() => onPage(page - 1)}
        >
          {Ic.chevL}
        </Button>
        <span className="text-[12px] font-extrabold text-ink tabular-nums min-w-[54px] text-center">
          {page + 1} / {pageCount}
        </span>
        <Button
          variant="back"
          aria-label="Halaman berikutnya"
          disabled={page >= pageCount - 1}
          className="disabled:opacity-40"
          onClick={() => onPage(page + 1)}
        >
          <span className="flex">{RIc.chevR}</span>
        </Button>
      </div>
    </div>
  );
}
