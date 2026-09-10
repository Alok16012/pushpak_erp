import { MessageCircle, Phone } from "lucide-react";
import { formatPhone, telHref, whatsappHref } from "@/lib/phone";

interface StudentContactProps {
  /** Named in the link title, so the office can see whose line it is opening. */
  name: string;
  /** `students.phone` — the student's own mobile. */
  phone?: string | null;
  /** `students.whatsappNumber`; falls back to the mobile when it was left blank. */
  whatsapp?: string | null;
}

/**
 * Call and WhatsApp for one student's own number — never the father's, which
 * has its own column and its own link beside the guardian's name.
 *
 * The number is printed under the two icons because a pair of bare icons gives
 * the caller no way to tell which line they are about to open, and an action is
 * dropped rather than shown dead when the record holds nothing dialable: a
 * `tel:` with an empty number and a bare `wa.me/91` both look like working
 * buttons right up until they are pressed.
 */
export function StudentContact({ name, phone, whatsapp }: StudentContactProps) {
  // A student whose WhatsApp box was never filled still uses WhatsApp on the
  // mobile they gave at admission, which is what the roster used to assume.
  const mobile = String(phone ?? "").trim();
  const chatNumber = String(whatsapp ?? "").trim() || mobile;

  const call = telHref(mobile || chatNumber);
  const chat = whatsappHref(chatNumber);

  if (!call && !chat) {
    return <span className="whitespace-nowrap text-xs text-muted-foreground">No number on record</span>;
  }

  const action = "inline-flex h-8 w-8 items-center justify-center rounded-md bg-success/12 text-success transition hover:bg-success/20";

  return (
    <div>
      <div className="flex items-center gap-1.5">
        {call && (
          <a href={call} title={`Call ${name}`} aria-label={`Call ${name}`} className={action}>
            <Phone className="h-4 w-4" />
          </a>
        )}
        {chat && (
          <a
            href={chat}
            title={`WhatsApp ${name}`}
            aria-label={`WhatsApp ${name}`}
            target="_blank"
            rel="noopener noreferrer"
            className={action}
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>
      <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
        {formatPhone(mobile || chatNumber)}
      </p>
    </div>
  );
}
