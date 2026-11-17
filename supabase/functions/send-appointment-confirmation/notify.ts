/**
 * The notification flow of send-appointment-confirmation: claim → e-mail the business inboxes →
 * record → confirm to the customer → record.
 *
 * No imports and no Deno, network or SMTP code, so the Node tests
 * (src/lib/appointments/appointmentNotification.test.ts) drive this exact file with fakes. index.ts
 * supplies the real dependencies: the database functions from
 * supabase/migrations/20261105130000_appointment_notification_claim.sql and the SMTP client.
 */

/** A row returned by claim_appointment_notification: the stored appointment plus this claim's token. */
export interface ClaimedAppointment {
  appointment_id: string;
  claim_token: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company: string | null;
  /** "YYYY-MM-DD" (a Postgres date). */
  appointment_date: string;
  /** "HH:MM:SS" (a Postgres time). */
  appointment_time: string;
  service_type: string;
  notes: string | null;
}

export interface NotifyDeps {
  /** Atomically claims the newest not-yet-e-mailed appointment from this address (last 15 minutes). */
  claim(email: string): Promise<ClaimedAppointment | null>;
  /** Records the outcome under the claim token: sent, or released for a retry after a failure. */
  finish(appointmentId: string, claimToken: string, sent: boolean, error: string | null): Promise<void>;
  /** The business inboxes; each gets the notification. */
  adminRecipients: readonly string[];
  sendAdmin(to: string, appointment: ClaimedAppointment): Promise<void>;
  sendConfirmation(appointment: ClaimedAppointment): Promise<void>;
  log(message: string): void;
}

export type NotifyResult =
  | { status: 200; body: { success: true; confirmation: "sent" | "failed" } }
  | { status: 403; body: { error: "No pending appointment" } }
  | { status: 502; body: { error: "Notification failed" } }
  | { status: 503; body: { error: "Notification unavailable" } };

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

export async function notifyAppointment(email: string, deps: NotifyDeps): Promise<NotifyResult> {
  // 1) Claim. If the claim cannot be made, send nothing (fail closed).
  let claimed: ClaimedAppointment | null;
  try {
    claimed = await deps.claim(email);
  } catch (e) {
    deps.log(`claim failed, nothing sent: ${reason(e)}`);
    return { status: 503, body: { error: "Notification unavailable" } };
  }
  // Nothing claimable: no recent booking from this address, or it was already e-mailed / is being
  // e-mailed by another call (a replay or a duplicate request).
  if (!claimed) return { status: 403, body: { error: "No pending appointment" } };
  const appointment = claimed;

  const record = async (sent: boolean, error: string | null) => {
    try {
      await deps.finish(appointment.appointment_id, appointment.claim_token, sent, error);
    } catch (e) {
      deps.log(`could not record the outcome (sent=${sent}): ${reason(e)}`);
    }
  };

  // 2) Business notifications. If none of the inboxes could be e-mailed, release the claim so a
  //    later call can retry (the database caps attempts at 3) and do not confirm to the customer.
  const failures: string[] = [];
  for (const to of deps.adminRecipients) {
    try {
      await deps.sendAdmin(to, appointment);
    } catch (e) {
      failures.push(`admin e-mail to ${to} failed: ${reason(e)}`);
    }
  }
  if (failures.length === deps.adminRecipients.length) {
    const why = failures.join("; ") || "no admin recipients";
    deps.log(why);
    await record(false, why);
    return { status: 502, body: { error: "Notification failed" } };
  }

  // 3) Mark it sent BEFORE confirming, so no later call can e-mail the business twice.
  const partial = failures.length ? failures.join("; ") : null;
  if (partial) deps.log(partial);
  await record(true, partial);

  // 4) Customer confirmation: fixed text, once. A failure is recorded and not retried, because a
  //    retry would mean claiming (and re-e-mailing the business) again.
  try {
    await deps.sendConfirmation(appointment);
  } catch (e) {
    const why = `customer confirmation failed: ${reason(e)}`;
    deps.log(why);
    await record(true, [partial, why].filter(Boolean).join("; "));
    return { status: 200, body: { success: true, confirmation: "failed" } };
  }
  return { status: 200, body: { success: true, confirmation: "sent" } };
}
