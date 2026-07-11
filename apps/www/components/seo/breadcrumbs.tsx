import { Link } from "@/i18n/navigation";
import type { BreadcrumbItem } from "@/lib/schema";
import { cn } from "@/lib/utils/utils";

type BreadcrumbsProps = {
  className?: string;
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ className, items }: BreadcrumbsProps) {
  if (items.length < 2) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-8 md:mb-10", className)}>
      <ol className="flex flex-wrap items-center gap-2 eyebrow text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.path} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="text-foreground">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="transition-all duration-300 hover:text-foreground"
                >
                  {item.name}
                </Link>
              )}
              {!isLast && (
                <span aria-hidden="true" className="text-muted-foreground/40">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
