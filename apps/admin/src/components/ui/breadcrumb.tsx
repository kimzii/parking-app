import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs text-gray-400 mb-5">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
            {isLast || !item.href ? (
              <span className={isLast ? "text-gray-600 font-medium" : "text-gray-400"}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-gray-600 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
