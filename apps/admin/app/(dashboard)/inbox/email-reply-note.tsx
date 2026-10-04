import { replyToAddress } from "@/lib/email";

export function EmailReplyNote() {
  const replyTo = replyToAddress();
  return (
    <p className="max-w-prose text-base text-muted-foreground">
      Email here is outbound only.{" "}
      {replyTo ? (
        <>
          A client&apos;s reply lands in the <span className="font-mono text-foreground">{replyTo}</span>{" "}
          mailbox, not in this inbox — read and answer it there.
        </>
      ) : (
        <>
          No reply-to address is configured (<span className="font-mono">EMAIL_REPLY_TO</span>), so
          a reply goes to the sending address, a mailbox this app cannot see. Set one so replies
          reach a mailbox someone reads.
        </>
      )}
    </p>
  );
}
