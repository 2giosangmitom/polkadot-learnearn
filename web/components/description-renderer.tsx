import { cn } from "@/lib/utils";

interface DescriptionRendererProps {
  html: string;
  className?: string;
}

export function DescriptionRenderer({
  html,
  className,
}: DescriptionRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
