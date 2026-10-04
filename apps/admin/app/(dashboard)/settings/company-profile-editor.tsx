"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Edit2, Globe, Mail, Phone } from "lucide-react";
import { Button, Field, Input, LoadingIcon } from "@repo/ui";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui";

import { saveCompanyProfile, type CompanyProfileInput } from "@/app/(dashboard)/_actions/settings";

const FIELD_LABELS: Record<keyof CompanyProfileInput, string> = {
  phone: "Phone",
  email: "Email",
  website: "Website",
  brandColor: "Light accent",
  brandColorDark: "Dark accent",
};

export function CompanyProfileEditor({ initialData }: { initialData: CompanyProfileInput }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<CompanyProfileInput>(initialData);
  const [pending, startTransition] = React.useTransition();

  const [lastOpen, setLastOpen] = React.useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setDraft(initialData);
  }

  function set<K extends keyof CompanyProfileInput>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const changes = (Object.keys(FIELD_LABELS) as (keyof CompanyProfileInput)[])
    .map((key) => {
      const before = initialData[key];
      const after =
        key === "brandColor" || key === "brandColorDark"
          ? draft[key].replace(/^#/, "").trim() || before
          : draft[key].trim();
      return { key, before, after };
    })
    .filter((c) => c.before !== c.after);

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (changes.length === 0) return;
    startTransition(async () => {
      const result = await saveCompanyProfile(draft);
      if (result.ok) {
        toast.success(result.message ?? "Company profile saved.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit2 />
          Edit profile
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Company profile</SheetTitle>
          <SheetDescription>
            These values are what proposals, contracts and the public site print as
            Altruvex&apos;s own contact details.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4">
            <Field label="Company phone number" hint="Used on every generated document.">
              <div className="relative">
                <Phone className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
                <Input
                  type="text"
                  required
                  value={draft.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  placeholder="+20 100 000 0000"
                  className="ps-8"
                />
              </div>
            </Field>

            <Field label="Primary contact email">
              <div className="relative">
                <Mail className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
                <Input
                  type="email"
                  required
                  value={draft.email}
                  onChange={(event) => set("email", event.target.value)}
                  placeholder="contact@altruvex.com"
                  className="ps-8"
                />
              </div>
            </Field>

            <Field label="Website URL">
              <div className="relative">
                <Globe className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
                <Input
                  type="url"
                  required
                  value={draft.website}
                  onChange={(event) => set("website", event.target.value)}
                  placeholder="https://altruvex.com"
                  className="ps-8"
                />
              </div>
            </Field>

            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <Field label="Light brand accent">
                <div className="flex items-center gap-2">
                  <span
                    className="size-[var(--control-h)] shrink-0 rounded-md border border-border"
                    style={{ backgroundColor: `#${draft.brandColor}` }}
                    aria-hidden
                  />
                  <Input
                    type="text"
                    value={draft.brandColor}
                    onChange={(event) => set("brandColor", event.target.value.replace(/^#/, ""))}
                    maxLength={6}
                    className="font-mono"
                  />
                </div>
              </Field>

              <Field label="Dark brand accent">
                <div className="flex items-center gap-2">
                  <span
                    className="size-[var(--control-h)] shrink-0 rounded-md border border-border"
                    style={{ backgroundColor: `#${draft.brandColorDark}` }}
                    aria-hidden
                  />
                  <Input
                    type="text"
                    value={draft.brandColorDark}
                    onChange={(event) => set("brandColorDark", event.target.value.replace(/^#/, ""))}
                    maxLength={6}
                    className="font-mono"
                  />
                </div>
              </Field>
            </div>

            <div className="plane p-3" aria-live="polite">
              {changes.length === 0 ? (
                <p className="text-meta text-muted-foreground">Nothing changed yet.</p>
              ) : (
                <ul className="space-y-1">
                  {changes.map((change) => (
                    <li
                      key={change.key}
                      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta"
                    >
                      <span className="w-24 shrink-0 text-subtle-foreground">
                        {FIELD_LABELS[change.key]}
                      </span>
                      <span className="min-w-0 truncate font-mono text-muted-foreground line-through">
                        {change.before || "—"}
                      </span>
                      <ArrowRight className="size-3 shrink-0 text-subtle-foreground" aria-hidden />
                      <span className="min-w-0 truncate font-mono text-foreground">
                        {change.after || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={pending || changes.length === 0}>
              {pending && <LoadingIcon size="sm" />}
              {pending
                ? "Saving…"
                : changes.length === 0
                  ? "Save changes"
                  : `Save ${changes.length} change${changes.length === 1 ? "" : "s"}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
