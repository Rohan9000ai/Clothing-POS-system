export function ComingSoonScreen({ titleKey }: { titleKey: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-card border border-dashed border-gray-300 bg-white p-12 text-center">
      <h2 className="text-lg font-semibold text-gray-800">{titleKey}</h2>
      <p className="mt-1 text-sm text-gray-400">This screen is scaffolded — build-out coming soon.</p>
    </div>
  );
}