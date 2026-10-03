"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

const ALL = "__all__";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * The filter selects for /deployments.
 *
 * The filters themselves live in the URL and the page reads them on the server
 * — this island only turns a pick into a navigation. Changing a filter drops
 * the page cursor: an id from the old result set means nothing in the new one.
 */
export function DeploymentFilters({
  filters,
}: {
  filters: {
    param: string;
    label: string;
    value: string | undefined;
    options: FilterOption[];
  }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(param: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === ALL) next.delete(param);
    else next.set(param, value);
    // The product list is scoped to the chosen client, so a product from
    // another client would sit in the select as a value it no longer offers.
    if (param === "client") next.delete("product");
    next.delete("cursor");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Select
          key={filter.param}
          value={filter.value ?? ALL}
          onValueChange={(value) => set(filter.param, value)}
        >
          <SelectTrigger
            size="sm"
            aria-label={filter.label}
            className="w-full min-w-0 sm:w-auto sm:min-w-36"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              All {filter.label.toLowerCase()}
            </SelectItem>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
