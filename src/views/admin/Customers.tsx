"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Phone,
  Mail,
  Building,
  MapPin,
  Loader2,
  Tag,
  StickyNote,
  IndianRupee,
  Package,
  MessageSquare,
  CalendarClock,
  Plus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";
import { cn } from "@/lib/utils";

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  address_line1: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: number | null;
  paid_amount: number | null;
  created_at: string;
  user_id: string;
}

interface EnquiryRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface AppointmentRow {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company: string | null;
  service_type: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string;
  created_at: string;
}

interface CustomerNote {
  id: string;
  user_id: string;
  note: string;
  created_at: string;
}

interface CustomerTag {
  id: string;
  user_id: string;
  tag: string;
}

/** A saved client from Quotation Pro (public.parties, party_type customer/both). */
interface PartyRow {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  billing_address: string | null;
  party_type: string;
  created_at: string;
}

type Source = "Registered" | "Client" | "Enquiry" | "Appointment";

/** A unified customer, merged across registered profiles, enquiries and appointments. */
interface Customer {
  id: string; // dedup key (last-10 phone digits, else lowercased email, else row id)
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  address: string | null;
  createdAt: string; // earliest touch
  userId: string | null; // set only for registered account holders
  sources: Source[];
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Normalise a phone to its last 10 digits so the same person matches across forms. */
const normPhone = (p?: string | null) => (p || "").replace(/\D/g, "").slice(-10);
/** The identity key for a customer row: phone, else email, else a per-row fallback. */
const keyOf = (phone?: string | null, email?: string | null, fallback?: string) =>
  normPhone(phone) || (email || "").trim().toLowerCase() || fallback || "";

export default function AdminCustomers() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    // Load every source independently — a single failing query (e.g. an unapplied
    // customer_notes migration) must NOT blank the whole directory. We show whatever
    // loaded and only surface a blocking error when nothing at all came back.
    const [p, o, e, a, pr, n, t] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("id,order_number,status,total_amount,paid_amount,created_at,user_id"),
      supabase
        .from("enquiries")
        .select("id,name,email,phone,company,subject,message,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("appointments")
        .select("id,customer_name,customer_email,customer_phone,company,service_type,appointment_date,appointment_time,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("parties")
        .select("id,name,company,email,phone,city,billing_address,party_type,created_at")
        .in("party_type", ["customer", "both"])
        .order("created_at", { ascending: false }),
      supabase.from("customer_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("customer_tags").select("*"),
    ]);

    setProfiles((p.data as ProfileRow[]) || []);
    setOrders((o.data as OrderRow[]) || []);
    setEnquiries((e.data as EnquiryRow[]) || []);
    setAppointments((a.data as AppointmentRow[]) || []);
    setParties((pr.data as PartyRow[]) || []);
    setNotes((n.data as CustomerNote[]) || []);
    setTags((t.data as CustomerTag[]) || []);

    const problems = [p, o, e, a, pr, n, t].map((r) => r.error?.message).filter(Boolean) as string[];
    const anyCustomerData =
      (p.data?.length || 0) + (e.data?.length || 0) + (a.data?.length || 0) + (pr.data?.length || 0) > 0;
    if (problems.length) console.error("Customers load issues:", problems);
    // Only a hard error if we couldn't load a single customer from any source.
    setLoadError(!anyCustomerData && problems.length ? problems[0] : null);
    setIsLoading(false);
  };

  // Merge registered profiles + enquiry submitters + appointment bookers into one directory,
  // de-duplicated by phone / email so the same person appears once with all their sources.
  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    const upsert = (key: string, patch: Partial<Customer>, source: Source) => {
      if (!key) return;
      const ex = map.get(key);
      if (ex) {
        map.set(key, {
          ...ex,
          name: ex.name || patch.name || "",
          email: ex.email || patch.email || null,
          phone: ex.phone || patch.phone || null,
          company: ex.company || patch.company || null,
          city: ex.city || patch.city || null,
          address: ex.address || patch.address || null,
          userId: ex.userId || patch.userId || null,
          createdAt:
            patch.createdAt && (!ex.createdAt || patch.createdAt < ex.createdAt) ? patch.createdAt : ex.createdAt,
          sources: ex.sources.includes(source) ? ex.sources : [...ex.sources, source],
        });
      } else {
        map.set(key, {
          id: key,
          name: patch.name || "",
          email: patch.email || null,
          phone: patch.phone || null,
          company: patch.company || null,
          city: patch.city || null,
          address: patch.address || null,
          userId: patch.userId || null,
          createdAt: patch.createdAt || "",
          sources: [source],
        });
      }
    };

    profiles.forEach((p) =>
      upsert(
        keyOf(p.phone, null, p.user_id),
        { name: p.full_name || "", phone: p.phone, company: p.company, city: p.city, address: p.address_line1, userId: p.user_id, createdAt: p.created_at },
        "Registered",
      ),
    );
    parties.forEach((pt) =>
      upsert(
        keyOf(pt.phone, pt.email, pt.id),
        { name: pt.name || "", email: pt.email, phone: pt.phone, company: pt.company, city: pt.city, address: pt.billing_address, createdAt: pt.created_at },
        "Client",
      ),
    );
    enquiries.forEach((e) =>
      upsert(
        keyOf(e.phone, e.email, e.id),
        { name: e.name || "", email: e.email, phone: e.phone, company: e.company, createdAt: e.created_at },
        "Enquiry",
      ),
    );
    appointments.forEach((a) =>
      upsert(
        keyOf(a.customer_phone, a.customer_email, a.id),
        { name: a.customer_name || "", email: a.customer_email, phone: a.customer_phone, company: a.company, createdAt: a.created_at },
        "Appointment",
      ),
    );
    return Array.from(map.values()).sort((x, y) => (y.createdAt || "").localeCompare(x.createdAt || ""));
  }, [profiles, parties, enquiries, appointments]);

  /** Per-customer rollups: order LTV (registered only), enquiry & appointment counts. */
  const statOf = (c: Customer) => {
    let ltv = 0;
    let orderCount = 0;
    if (c.userId) {
      orders.forEach((o) => {
        if (o.user_id === c.userId) {
          ltv += Number(o.total_amount || 0);
          orderCount += 1;
        }
      });
    }
    const enq = enquiries.filter((e) => keyOf(e.phone, e.email, e.id) === c.id).length;
    const apt = appointments.filter((a) => keyOf(a.customer_phone, a.customer_email, a.id) === c.id).length;
    return { ltv, orderCount, enq, apt };
  };

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q)
    );
  });

  const selected = customers.find((c) => c.id === selectedId) || null;
  const selectedOrders = selected?.userId ? orders.filter((o) => o.user_id === selected.userId) : [];
  const selectedEnquiries = selected ? enquiries.filter((e) => keyOf(e.phone, e.email, e.id) === selected.id) : [];
  const selectedAppointments = selected
    ? appointments.filter((a) => keyOf(a.customer_phone, a.customer_email, a.id) === selected.id)
    : [];
  const selectedNotes = selected?.userId ? notes.filter((n) => n.user_id === selected.userId) : [];
  const selectedTags = selected?.userId ? tags.filter((t) => t.user_id === selected.userId) : [];

  const addNote = async () => {
    if (!selected?.userId || !newNote.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("customer_notes")
      .insert({ user_id: selected.userId, note: newNote.trim() })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setNotes((prev) => [data as CustomerNote, ...prev]);
    setNewNote("");
    toast({ title: "Note added" });
  };

  const addTag = async () => {
    if (!selected?.userId || !newTag.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("customer_tags")
      .insert({ user_id: selected.userId, tag: newTag.trim() })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setTags((prev) => [...prev, data as CustomerTag]);
    setNewTag("");
  };

  const removeTag = async (id: string) => {
    const { error } = await supabase.from("customer_tags").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="CRM view of everyone who registered, enquired or booked — with orders, enquiries, notes and tags"
        badge={
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent to-amber-light text-white text-sm font-semibold">
            {customers.length} total
          </span>
        }
      />

      {loadError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn&rsquo;t load customers: {loadError}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, company, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 rounded-xl border-2 focus:border-accent"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AdminCard delay={0.1}>
          <AdminCardHeader>Customer Directory ({filtered.length})</AdminCardHeader>
          <AdminCardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No customers found</p>
                <p className="text-xs mt-1">Customers appear here when they register, submit an enquiry, or book an appointment.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-2">
                {filtered.map((c) => {
                  const s = statOf(c);
                  const custTags = c.userId ? tags.filter((t) => t.user_id === c.userId) : [];
                  return (
                    <motion.button
                      key={c.id}
                      whileHover={{ x: 4 }}
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "w-full text-left border-2 rounded-xl p-4 transition-all",
                        selectedId === c.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-amber-light text-white flex items-center justify-center font-bold flex-shrink-0">
                            {(c.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{c.name || "Unnamed Customer"}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {c.phone || c.email || c.company || c.city || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {c.userId && s.ltv > 0 ? (
                            <>
                              <div className="text-sm font-bold text-accent">{inr(s.ltv)}</div>
                              <div className="text-xs text-muted-foreground">{s.orderCount} orders</div>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {s.enq + s.apt > 0 ? `${s.enq + s.apt} touch${s.enq + s.apt === 1 ? "" : "es"}` : "—"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {c.sources.map((src) => (
                          <span
                            key={src}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-medium",
                              src === "Registered"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : src === "Client"
                                ? "bg-amber-500/10 text-amber-500"
                                : src === "Enquiry"
                                ? "bg-sky-500/10 text-sky-500"
                                : "bg-violet-500/10 text-violet-500"
                            )}
                          >
                            {src}
                          </span>
                        ))}
                        {custTags.slice(0, 3).map((t) => (
                          <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                            {t.tag}
                          </span>
                        ))}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </AdminCardContent>
        </AdminCard>

        <AdminCard delay={0.2} gradient>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
                <div className="mb-6">
                  <h2 className="font-display font-bold text-2xl">{selected.name || "Unnamed Customer"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.sources.join(" · ")}
                    {selected.createdAt ? ` · since ${formatDateSafe(new Date(selected.createdAt), "MMM d, yyyy")}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <StatPill icon={IndianRupee} label="Lifetime" value={inr(statOf(selected).ltv)} />
                  <StatPill icon={MessageSquare} label="Enquiries" value={String(selectedEnquiries.length)} />
                  <StatPill icon={CalendarClock} label="Bookings" value={String(selectedAppointments.length)} />
                </div>

                <div className="space-y-2 mb-6">
                  {selected.phone && <InfoRow icon={Phone} value={selected.phone} href={`tel:${selected.phone}`} />}
                  {selected.email && <InfoRow icon={Mail} value={selected.email} href={`mailto:${selected.email}`} />}
                  {selected.company && <InfoRow icon={Building} value={selected.company} />}
                  {(selected.address || selected.city) && (
                    <InfoRow icon={MapPin} value={[selected.address, selected.city].filter(Boolean).join(", ")} />
                  )}
                </div>

                {/* Enquiries */}
                {selectedEnquiries.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Enquiries
                    </h3>
                    <div className="space-y-2">
                      {selectedEnquiries.slice(0, 5).map((e) => (
                        <div key={e.id} className="p-3 rounded-lg bg-muted/40">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm truncate">{e.subject || "Enquiry"}</div>
                            <Badge variant="outline" className="text-xs shrink-0">{e.status}</Badge>
                          </div>
                          {e.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.message}</p>}
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {formatDateSafe(new Date(e.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Appointments */}
                {selectedAppointments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" /> Appointments
                    </h3>
                    <div className="space-y-2">
                      {selectedAppointments.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                          <div>
                            <div className="font-medium text-sm">{a.service_type || "Appointment"}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.appointment_date ? formatDateSafe(new Date(a.appointment_date), "MMM d, yyyy") : "—"}
                              {a.appointment_time ? ` · ${a.appointment_time}` : ""}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{a.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orders (registered customers) */}
                {selected.userId && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" /> Order History
                    </h3>
                    {selectedOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No orders yet</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedOrders.slice(0, 5).map((o) => (
                          <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                            <div>
                              <div className="font-medium text-sm">{o.order_number}</div>
                              <div className="text-xs text-muted-foreground">{formatDateSafe(new Date(o.created_at), "MMM d, yyyy")}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm">{inr(Number(o.total_amount || 0))}</div>
                              <Badge variant="outline" className="text-xs">{o.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags & Notes — stored against a registered account. */}
                {selected.userId ? (
                  <>
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Tag className="h-4 w-4" /> Tags
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedTags.map((t) => (
                          <Badge key={t.id} className="bg-accent/10 text-accent border-0 pr-1.5 gap-1">
                            {t.tag}
                            <button onClick={() => removeTag(t.id)} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag (VIP, Bulk Buyer…)" className="h-9" />
                        <Button size="sm" onClick={addTag} disabled={saving || !newTag.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <StickyNote className="h-4 w-4" /> Internal Notes
                      </h3>
                      <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note about this customer..." rows={2} className="mb-2" />
                      <Button size="sm" onClick={addNote} disabled={saving || !newNote.trim()} className="mb-3">
                        <Plus className="h-4 w-4 mr-1" /> Add Note
                      </Button>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedNotes.map((n) => (
                          <div key={n.id} className="p-3 rounded-lg bg-muted/40 text-sm">
                            <p className="whitespace-pre-wrap">{n.note}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDateSafe(new Date(n.created_at), "MMM d, h:mm a")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                    <StickyNote className="h-4 w-4 inline mr-1 -mt-0.5" />
                    This is a lead (enquiry / booking). Internal notes &amp; tags become available once they create an account.
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Select a customer to view CRM details</p>
              </div>
            )}
          </AnimatePresence>
        </AdminCard>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, value, href }: { icon: any; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}
