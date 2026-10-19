/**
 * The notification flow of send-enquiry-notification: claim → e-mail the business → record →
 * acknowledge the visitor → record.
 *
 * No imports and no Deno, network or SMTP code, so the Node tests
 * (src/lib/enquiries/enquiryNotification.test.ts) drive this exact file with fakes. index.ts
 * supplies the real dependencies: the database functions from
 * supabase/migrations/20261018120000_enquiry_notification_claim.sql and the SMTP client.
 */

/** A row returned by claim_enquiry_notification: the stored enquiry plus this claim's token. */
export interface ClaimedEnquiry {
  enquiry_id: string;
  claim_token: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  enquiry_type: string;
  product_name: string | null;
}

export interface NotifyDeps {
  /** Atomically claims the newest not-yet-e-mailed enquiry from this address (last 15 minutes). */
  claim(email: string): Promise<ClaimedEnquiry | null>;
  /** Records the outcome under the claim token: sent, or released for a retry after a failure. */
  finish(enquiryId: string, claimToken: string, sent: boolean, error: string | null): Promise<void>;
  sendAdmin(enquiry: ClaimedEnquiry): Promise<void>;
  sendAcknowledgement(to: string): Promise<void>;
  log(message: string): void;
}

export type NotifyResult =
  | { status: 200; body: { success: true; acknowledgement: "sent" | "failed" } }
  | { status: 403; body: { error: "No pending enquiry" } }
  | { status: 502; body: { error: "Notification failed" } }
  | { status: 503; body: { error: "Notification unavailable" } };

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

export async function notifyEnquiry(email: string, deps: NotifyDeps): Promise<NotifyResult> {
  // 1) Claim. If the claim cannot be made, send nothing (fail closed): without it a replay could
  //    not be told apart from a first call.
  let claimed: ClaimedEnquiry | null;
  try {
    claimed = await deps.claim(email);
  } catch (e) {
    deps.log(`claim failed, nothing sent: ${reason(e)}`);
    return { status: 503, body: { error: "Notification unavailable" } };
  }
  // Nothing claimable: no recent enquiry from this address, or it was already e-mailed / is being
  // e-mailed by another call (a replay or a duplicate request).
  if (!claimed) return { status: 403, body: { error: "No pending enquiry" } };
  const enquiry = claimed;

  const record = async (sent: boolean, error: string | null) => {
    try {
      await deps.finish(enquiry.enquiry_id, enquiry.claim_token, sent, error);
    } catch (e) {
      deps.log(`could not record the outcome (sent=${sent}): ${reason(e)}`);
    }
  };

  // 2) Business notification. On failure release the claim so a later call can retry it
  //    (the database caps attempts at 3), and do not acknowledge the visitor.
  try {
    await deps.sendAdmin(enquiry);
  } catch (e) {
    const why = `admin e-mail failed: ${reason(e)}`;
    deps.log(why);
    await record(false, why);
    return { status: 502, body: { error: "Notification failed" } };
  }

  // 3) Mark it sent BEFORE acknowledging, so no later call can e-mail the business twice.
  await record(true, null);

  // 4) Visitor acknowledgement: fixed text, once. A failure is recorded and not retried, because a
  //    retry would mean claiming (and re-e-mailing the business) again.
  try {
    await deps.sendAcknowledgement(enquiry.email);
  } catch (e) {
    const why = `customer acknowledgement failed: ${reason(e)}`;
    deps.log(why);
    await record(true, why);
    return { status: 200, body: { success: true, acknowledgement: "failed" } };
  }
  return { status: 200, body: { success: true, acknowledgement: "sent" } };
}
