import type { LucideIcon } from "lucide-react";
import { Badge, Card } from "@muzammil-pos/ui";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  plannedFeatures: string[];
}

export function PlaceholderPage({ title, description, icon: Icon, plannedFeatures }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title text-gray-900">{title}</h2>
        <p className="text-sm text-gray-400">{description}</p>
      </div>

      <Card className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
            <Icon size={24} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <h3 className="text-section text-gray-900">{title}</h3>
            <Badge tone="brand">Coming soon</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            This page is set up and routed. The screen itself is built in a later step.
          </p>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            Planned for this screen
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {plannedFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}