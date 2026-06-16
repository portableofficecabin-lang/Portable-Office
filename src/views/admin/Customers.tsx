"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Users,
  Search,
  Mail,
  Phone,
  Building,
  MapPin,
  Loader2,
  Tag,
  StickyNote,
  IndianRupee,
  Package,
  MessageSquare,
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
  email: string;
  subject: string | null;
  message: string;
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

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function AdminCustomers() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProfileRow | null>(null);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [p, o, e, n, t] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("id,order_number,status,total_amount,paid_amount,created_at,user_id"),
        supabase.from("enquiries").select("id,email,subject,message,status,created_at").order("created_at", { ascending: false }),
        supabase.from("customer_notes").select("*").order("created_at", { ascending: false }),
        supabase.from("customer_tags").select("*"),
      ]);
      if (p.error) throw p.error;
      setProfiles((p.data as ProfileRow[]) || []);
      setOrders((o.data as OrderRow[]) || []);
      setEnquiries((e.data as EnquiryRow[]) || []);
      setNotes((n.data as CustomerNote[]) || []);
      setTags((t.data as CustomerTag[]) || []);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load customers", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const customerStats = useMemo(() => {
    const map = new Map<string, { ltv: number; orderCount: number; enquiryCount: number }>();
    profiles.forEach((p) => map.set(p.user_id, { ltv: 0, orderCount: 0, enquiryCount: 0 }));
    orders.forEach((o) => {
      const s = map.get(o.user_id);
      if (s) {
        s.ltv += Number(o.total_amount || 0);
        s.orderCount += 1;
      }
    });
    return map;
  }, [profiles, orders]);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q) ||
      (p.company || "").toLowerCase().includes(q) ||
      (p.city || "").toLowerCase().includes(q)
    );
  });

  const selectedOrders = selected ? orders.filter((o) => o.user_id === selected.user_id) : [];
  const selectedNotes = selected ? notes.filter((n) => n.user_id === selected.user_id) : [];
  const selectedTags = selected ? tags.filter((t) => t.user_id === selected.user_id) : [];

  const addNote = async () => {
    if (!selected || !newNote.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("customer_notes")
      .insert({ user_id: selected.user_id, note: newNote.trim() })
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
    if (!selected || !newTag.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("customer_tags")
      .insert({ user_id: selected.user_id, tag: newTag.trim() })
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
        description="CRM view of every registered customer with orders, enquiries, notes and tags"
        badge={
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent to-amber-light text-white text-sm font-semibold">
            {profiles.length} total
          </span>
        }
      />

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
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-2">
                {filtered.map((p) => {
                  const stats = customerStats.get(p.user_id) || { ltv: 0, orderCount: 0, enquiryCount: 0 };
                  const customerTags = tags.filter((t) => t.user_id === p.user_id);
                  return (
                    <motion.button
                      key={p.id}
                      whileHover={{ x: 4 }}
                      onClick={() => setSelected(p)}
                      className={cn(
                        "w-full text-left border-2 rounded-xl p-4 transition-all",
                        selected?.id === p.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-amber-light text-white flex items-center justify-center font-bold flex-shrink-0">
                            {(p.full_name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{p.full_name || "Unnamed Customer"}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {p.company || p.city || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-accent">{inr(stats.ltv)}</div>
                          <div className="text-xs text-muted-foreground">{stats.orderCount} orders</div>
                        </div>
                      </div>
                      {customerTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {customerTags.slice(0, 4).map((t) => (
                            <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                              {t.tag}
                            </span>
                          ))}
                        </div>
                      )}
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
                  <h2 className="font-display font-bold text-2xl">{selected.full_name || "Unnamed Customer"}</h2>
                  <p className="text-sm text-muted-foreground">
                    Customer since {format(new Date(selected.created_at), "MMM d, yyyy")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <StatPill icon={IndianRupee} label="Lifetime" value={inr(customerStats.get(selected.user_id)?.ltv || 0)} />
                  <StatPill icon={Package} label="Orders" value={String(selectedOrders.length)} />
                  <StatPill icon={MessageSquare} label="Enquiries" value={String(enquiries.filter(e => true).length)} />
                </div>

                <div className="space-y-2 mb-6">
                  {selected.phone && <InfoRow icon={Phone} value={selected.phone} href={`tel:${selected.phone}`} />}
                  {selected.company && <InfoRow icon={Building} value={selected.company} />}
                  {(selected.address_line1 || selected.city) && (
                    <InfoRow
                      icon={MapPin}
                      value={[selected.address_line1, selected.city, selected.state, selected.pincode].filter(Boolean).join(", ")}
                    />
                  )}
                </div>

                {/* Tags */}
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

                {/* Orders */}
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
                            <div className="text-xs text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</div>
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

                {/* Notes */}
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
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    ))}
                  </div>
                </div>
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
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}
