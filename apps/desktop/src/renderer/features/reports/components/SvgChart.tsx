/**
 * Shows an SVG built by charts.ts. That markup is made only from numbers and
 * escaped text, never from raw user input, so it is safe to insert as HTML.
 */
export function SvgChart({ svg }: { svg: string }) {
  return <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}