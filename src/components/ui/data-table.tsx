import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pager } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

// TanStack's officially supported extension point — lets each column carry
// the short label shown on its visibility-toggle chip (the column header
// itself is often composite JSX, not a plain string).
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    label?: string;
    align?: "right";
    cellClassName?: string;
  }
}

/** Pill strip to show/hide columns — the mobile-friendly stand-in for
 *  shadcn's desktop "Columns" dropdown (this app has no dropdown-menu
 *  primitive, and a horizontal strip of taps suits a 430px screen better). */
function ColumnToggles<TData>({ table }: { table: ReturnType<typeof useReactTable<TData>> }) {
  const toggleable = table.getAllLeafColumns().filter((c) => c.getCanHide());
  if (toggleable.length === 0) return null;
  return (
    <div className="gki-noscroll flex gap-[6px] overflow-x-auto -mx-[2px] px-[2px] mb-2">
      {toggleable.map((col) => {
        const visible = col.getIsVisible();
        return (
          <button
            key={col.id}
            type="button"
            onClick={() => col.toggleVisibility()}
            className="shrink-0 text-[11px] font-bold px-[10px] py-[5px] rounded-full cursor-pointer whitespace-nowrap transition-colors"
            style={{
              border: visible ? "1.5px solid var(--primary)" : "1.5px solid var(--line)",
              background: visible ? "var(--tint2)" : "var(--card)",
              color: visible ? "var(--primary)" : "var(--muted)",
            }}
          >
            {col.columnDef.meta?.label ?? col.id}
          </button>
        );
      })}
    </div>
  );
}

export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  initialVisibility,
  onRowClick,
  getRowId,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  pageSize?: number;
  /** Columns hidden on first render — the admin can toggle them back on. */
  initialVisibility?: VisibilityState;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialVisibility ?? {});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: getRowId as ((row: TData) => string) | undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const { pageIndex } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <>
      <ColumnToggles table={table} />
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(header.column.columnDef.meta?.align === "right" && "text-right")}
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 bg-transparent border-none p-0 font-inherit cursor-pointer text-inherit"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-[9px] opacity-70">
                          {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
                        </span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    cell.column.columnDef.meta?.align === "right" && "text-right",
                    cell.column.columnDef.meta?.cellClassName,
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pager
        page={pageIndex}
        pageCount={table.getPageCount()}
        rangeStart={total === 0 ? 0 : pageIndex * pageSize + 1}
        rangeEnd={Math.min((pageIndex + 1) * pageSize, total)}
        total={total}
        onPage={(p) => table.setPageIndex(p)}
      />
    </>
  );
}
