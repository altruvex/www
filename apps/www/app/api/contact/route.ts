import { handleContactSubmission } from "@/lib/server/contact/handle-contact-submission";
import type { NextRequest } from "next/server";

export function POST(request: NextRequest) {
  return handleContactSubmission(request);
}
