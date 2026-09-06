"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit2, Globe, Loader2, Mail, Phone } from "lucide-react";
import { updateCompanyProfile } from "@/app/(dashboard)/_actions/records";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Editing one record is contextual work, so it happens in a `Sheet` — the
 * settings page stays visible behind it. This used to be a hand-built overlay
 * with its own inputs and buttons: no focus trap, no Escape, no dialog role,
 * and a 12px type size that exists nowhere else in the OS.
 */
export function CompanyProfileEditor({
  initialData,
}: {
  initialData: {
    phone: string;
    email: string;
    website: string;
    brandColor: string;
    brandColorDark: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [phone, setPhone] = React.useState(initialData.phone);
  const [email, setEmail] = React.useState(initialData.email);
  const [website, setWebsite] = React.useState(initialData.website);
  const [brandColor, setBrandColor] = React.useState(initialData.brandColor);
  const [brandColorDark, setBrandColorDark] = React.useState(initialData.brandColorDark);
  const [pending, startTransition] = React.useTransition();

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await updateCompanyProfile({ phone, email, website, brandColor, brandColorDark });
        toast.success("Company profile updated");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error("Could not update the profile", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
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
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="contact@altruvex.com"
                  className="ps-8"
                />
              </div>
            </Field>

            <Field label="Website URL">
              <div className="relative">
                <Globe className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
                <Input
                  type="text"
                  required
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
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
                    style={{ backgroundColor: `#${brandColor}` }}
                    aria-hidden
                  />
                  <Input
                    type="text"
                    value={brandColor}
                    onChange={(event) => setBrandColor(event.target.value.replace(/^#/, ""))}
                    className="font-mono"
                  />
                </div>
              </Field>

              <Field label="Dark brand accent">
                <div className="flex items-center gap-2">
                  <span
                    className="size-[var(--control-h)] shrink-0 rounded-md border border-border"
                    style={{ backgroundColor: `#${brandColorDark}` }}
                    aria-hidden
                  />
                  <Input
                    type="text"
                    value={brandColorDark}
                    onChange={(event) => setBrandColorDark(event.target.value.replace(/^#/, ""))}
                    className="font-mono"
                  />
                </div>
              </Field>
            </div>
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
