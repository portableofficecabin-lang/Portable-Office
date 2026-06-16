"use client";

import { useEffect, useState } from "react";
import { Star, Check, X, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type Review = {
  id: string;
  product_slug: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string;
  reviewer_email: string | null;
  reviewer_phone: string | null;
  status: string;
  created_at: string;
};

const TABS = ["pending", "approved", "rejected"] as const;
type Tab = typeof TABS[number];

export default function AdminReviews() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<Review[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [requireOtp, setRequireOtp] = useState(false);
  const [savingOtp, setSavingOtp] = useState(false);

  const loadOtpSetting = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "reviews_require_otp")
      .maybeSingle();
    const enabled = data?.value === true || (data?.value as any)?.enabled === true;
    setRequireOtp(!!enabled);
  };

  const toggleOtp = async (next: boolean) => {
    setSavingOtp(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "reviews_require_otp", value: next as any }, { onConflict: "key" });
    setSavingOtp(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    setRequireOtp(next);
    toast({ title: next ? "OTP verification enabled" : "OTP verification disabled" });
  };


  const loadCounts = async () => {
    const results = await Promise.all(
      TABS.map((t) =>
        supabase
          .from("product_reviews")
          .select("id", { count: "exact", head: true })
          .eq("status", t)
      )
    );
    setCounts({
      pending: results[0].count || 0,
      approved: results[1].count || 0,
      rejected: results[2].count || 0,
    });
  };

  const load = async () => {
    setLoading(true);
    // Uses admin-only SECURITY DEFINER RPC so reviewer email/phone are
    // never exposed to non-admin clients (column SELECT is revoked).
    const { data, error } = await supabase.rpc("admin_list_reviews", { _status: tab });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows((data || []) as Review[]);
    setLoading(false);
    loadCounts();
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);
  useEffect(() => { loadOtpSetting(); }, []);


  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("product_reviews").update({ status }).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: `Review ${status}` });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return;
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Review deleted" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Product Reviews</h2>
          <p className="text-sm text-muted-foreground">
            Moderate customer reviews. Only approved reviews appear on product pages and in
            Google rich-result schema.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <ShieldCheck className={`h-5 w-5 ${requireOtp ? "text-emerald-600" : "text-muted-foreground"}`} />
          <div className="flex-1">
            <div className="text-sm font-semibold">Require OTP verification</div>
            <div className="text-xs text-muted-foreground max-w-[220px]">
              Email-verify reviewers before they can submit. Enable when spam grows.
            </div>
          </div>
          <Switch checked={requireOtp} disabled={savingOtp} onCheckedChange={toggleOtp} />
        </div>
      </div>


      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "rejected" ? "Disapproved" : t}
            <span className={`ml-2 inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              t === "pending" ? "bg-amber-100 text-amber-700"
              : t === "approved" ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
            }`}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No {tab} reviews.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <span className="font-semibold">{r.title || "(no title)"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.reviewer_name} · {r.reviewer_email || "no email"} · {r.reviewer_phone || "no phone"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Product slug: <code className="bg-muted px-1 rounded">{r.product_slug || "—"}</code> · {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  {tab !== "approved" && (
                    <Button size="sm" onClick={() => setStatus(r.id, "approved")}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                  )}
                  {tab !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-line">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
