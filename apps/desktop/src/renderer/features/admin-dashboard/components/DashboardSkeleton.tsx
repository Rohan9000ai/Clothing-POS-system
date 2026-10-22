import { Card } from "@muzammil-pos/ui";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-control bg-gray-200 ${className}`} />;
}

/** Grey placeholders in the same layout as the real dashboard, so nothing jumps when the data arrives. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index}>
            <Block className="h-3 w-24" />
            <Block className="mt-4 h-7 w-32" />
            <Block className="mt-3 h-3 w-28" />
          </Card>
        ))}
      </div>
      <Card>
        <Block className="h-4 w-48" />
        <Block className="mt-4 h-56 w-full" />
      </Card>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Block className="h-4 w-40" />
          <Block className="mt-4 h-48 w-full" />
        </Card>
        <Card>
          <Block className="h-4 w-28" />
          <Block className="mt-4 h-48 w-full" />
        </Card>
      </div>
    </div>
  );
}