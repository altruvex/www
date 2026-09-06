import { redirect } from "next/navigation";

/** Meetings folded into the unified calendar (§19). Old links keep working. */
export default function MeetingsPage() {
  redirect("/calendar");
}
