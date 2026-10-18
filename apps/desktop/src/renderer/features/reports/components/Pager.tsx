import { Button } from "@muzammil-pos/ui";

interface PagerProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}

export function Pager({ page, totalPages, totalItems, onPage }: PagerProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between">
      <p className="text-xs text-gray-400">
        Page {page} of {totalPages} · {totalItems} total
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}