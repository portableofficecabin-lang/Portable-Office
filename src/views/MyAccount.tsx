"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Package, LogOut, Save, ShoppingCart, Clock, CheckCircle2,
  MapPin, Phone, Mail, Building2, ChevronRight, Star, Heart,
  TrendingUp, Bell, Settings, HelpCircle, MessageSquare, Sparkles,
  Calendar, Eye, Edit3, Shield, Award
} from "lucide-react";

interface Profile {
  full_name: string; phone: string; company: string;
  address_line1: string; address_line2: string; city: string; state: string; pincode: string;
}

interface OrderSummary {
  total: number; pending: number; delivered: number; totalItems: number;
}

type Tab = "overview" | "profile" | "orders" | "support";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const } }),
};

export default function MyAccountPage() {
  const { user, signOut, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<Profile>({ full_name: "", phone: "", company: "", address_line1: "", address_line2: "", city: "", state: "", pincode: "" });
  const [saving, setSaving] = useState(false);
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({ total: 0, pending: 0, delivered: 0, totalItems: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }

    const fetchData = async () => {
      // Fetch profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (profileData) setProfile({
        full_name: profileData.full_name || "", phone: profileData.phone || "", company: profileData.company || "",
        address_line1: profileData.address_line1 || "", address_line2: profileData.address_line2 || "",
        city: profileData.city || "", state: profileData.state || "", pincode: profileData.pincode || "",
      });

      // Fetch orders summary
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, payment_status, total_amount, created_at, order_number, order_items(product_name, quantity)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (orders) {
        const total = orders.length;
        const pending = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;
        const delivered = orders.filter(o => o.status === "delivered").length;
        // Non-monetary: units across all quote requests. We never collect payment online,
        // so no "spent"/"paid" figure may be shown here.
        const totalItems = orders.reduce(
          (sum, o) => sum + (o.order_items?.reduce((n: number, i: any) => n + (i.quantity || 0), 0) || 0),
          0
        );
        setOrderSummary({ total, pending, delivered, totalItems });
        setRecentOrders(orders.slice(0, 3));
      }
      setLoading(false);
    };
    fetchData();
  }, [user, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    else toast({ title: "Saved!", description: "Profile updated successfully." });
  };

  const handleLogout = async () => { await signOut(); router.push("/"); };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const firstName = profile.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Customer";
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";

  if (!user) return null;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
    { id: "orders", label: "Quote Requests", icon: Package },
    { id: "support", label: "Support", icon: HelpCircle },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      confirmed: "bg-blue-100 text-blue-700",
      manufacturing: "bg-purple-100 text-purple-700",
      dispatched: "bg-cyan-100 text-cyan-700",
      in_transit: "bg-orange-100 text-orange-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  const quickActions = [
    { icon: ShoppingCart, label: "Browse Products", href: "/products", color: "bg-accent/10 text-accent" },
    { icon: Calendar, label: "Book Appointment", href: "/book-appointment", color: "bg-blue-500/10 text-blue-600" },
    { icon: MessageSquare, label: "Contact Us", href: "/contact", color: "bg-green-500/10 text-green-600" },
    { icon: Heart, label: "Rental Service", href: "/rental-service", color: "bg-pink-500/10 text-pink-600" },
  ];

  return (
    <Layout>
      <SEOHead title="My Account | Portable Office Cabin" description="Manage your profile and track your quote requests." />

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="container-custom relative z-10 py-10 md:py-14">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-accent/20 backdrop-blur-sm border border-accent/30 flex items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold text-accent">{firstName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-primary-foreground/70 text-sm font-medium">{greeting} 👋</p>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">{firstName}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-primary-foreground/60 text-sm flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" /> Member since {memberSince}
                  </span>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex gap-2 flex-wrap">
              {!authLoading && isAdmin && (
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                  <Link href="/admin">
                    <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="container-custom">
          <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide py-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors rounded-t-lg ${
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {isActive && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <section className="section-padding">
        <div className="container-custom max-w-6xl">
          <AnimatePresence mode="wait">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Quote Requests", value: orderSummary.total, icon: Package, color: "bg-blue-500/10 text-blue-600", border: "border-blue-200" },
                    { label: "In Progress", value: orderSummary.pending, icon: Clock, color: "bg-amber-500/10 text-amber-600", border: "border-amber-200" },
                    { label: "Delivered", value: orderSummary.delivered, icon: CheckCircle2, color: "bg-green-500/10 text-green-600", border: "border-green-200" },
                    { label: "Units Requested", value: orderSummary.totalItems, icon: ShoppingCart, color: "bg-accent/10 text-accent", border: "border-accent/20" },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.label}
                        custom={i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        className={`bg-card rounded-xl border ${stat.border} p-5 hover:shadow-md transition-shadow`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
                  <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" /> Quick Actions
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map(action => {
                      const Icon = action.icon;
                      return (
                        <Link
                          key={action.label}
                          href={action.href}
                          className="group bg-card rounded-xl border border-border/50 p-4 hover:shadow-lg hover:border-accent/30 transition-all text-center"
                        >
                          <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-medium text-foreground">{action.label}</p>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Recent Orders */}
                <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5 text-accent" /> Recent Orders
                    </h2>
                    <Button variant="ghost" size="sm" asChild className="text-accent hover:text-accent">
                      <Link href="/my-account/orders">View All <ChevronRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  </div>
                  {loading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading...</div>
                  ) : recentOrders.length === 0 ? (
                    <div className="bg-card rounded-xl border border-border/50 p-10 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">No quote requests yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">Browse our products and request your first quotation!</p>
                      <Button variant="accent" asChild><Link href="/products">Explore Products</Link></Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentOrders.map(order => (
                        <Link
                          key={order.id}
                          href="/my-account/orders"
                          className="flex items-center gap-4 bg-card rounded-xl border border-border/50 p-4 hover:shadow-md hover:border-accent/30 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{order.order_number}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(order.status)}`}>
                                {order.status?.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Account Completeness */}
                <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible">
                  <ProfileCompleteness profile={profile} />
                </motion.div>
              </motion.div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <form onSubmit={handleSave} className="max-w-3xl space-y-6">
                  <div className="bg-card rounded-xl border border-border/50 p-6">
                    <h2 className="font-display font-semibold text-lg mb-1 flex items-center gap-2">
                      <User className="h-5 w-5 text-accent" /> Personal Information
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5">Update your contact details</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
                        <div className="relative mt-1.5">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} className="pl-10" placeholder="Your name" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                        <div className="relative mt-1.5">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={user.email || ""} disabled className="pl-10 bg-muted/50" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
                        <div className="relative mt-1.5">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="pl-10" placeholder="+91 98765 43210" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company</Label>
                        <div className="relative mt-1.5">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} className="pl-10" placeholder="Company name" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl border border-border/50 p-6">
                    <h2 className="font-display font-semibold text-lg mb-1 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-accent" /> Shipping Address
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5">Default delivery address used when we prepare your quotation</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Address Line 1</Label>
                        <Input value={profile.address_line1} onChange={e => setProfile(p => ({ ...p, address_line1: e.target.value }))} className="mt-1.5" placeholder="Street address" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Address Line 2</Label>
                        <Input value={profile.address_line2} onChange={e => setProfile(p => ({ ...p, address_line2: e.target.value }))} className="mt-1.5" placeholder="Apt, suite, etc." />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">City</Label>
                        <Input value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} className="mt-1.5" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">State</Label>
                        <Input value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} className="mt-1.5" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pincode</Label>
                        <Input value={profile.pincode} onChange={e => setProfile(p => ({ ...p, pincode: e.target.value }))} className="mt-1.5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" variant="accent" size="lg" disabled={saving} className="px-8">
                      <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Shield className="h-4 w-4" /> Your data is secured & encrypted
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-semibold">Your Quote Requests</h2>
                  <Button variant="accent" asChild>
                    <Link href="/my-account/orders"><Eye className="mr-2 h-4 w-4" /> View All Quote Requests</Link>
                  </Button>
                </div>
                {recentOrders.length === 0 ? (
                  <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No quote requests yet</h3>
                    <p className="text-muted-foreground text-sm mb-6">Your quote requests will appear here</p>
                    <Button variant="accent" asChild><Link href="/products">Browse Products</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map(order => (
                      <div key={order.id} className="bg-card rounded-xl border border-border/50 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-bold">{order.order_number}</span>
                            <span className={`ml-3 text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge(order.status)}`}>
                              {order.status?.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        {order.order_items?.map((item: any, idx: number) => (
                          <p key={idx} className="text-sm text-muted-foreground">{item.product_name} × {item.quantity}</p>
                        ))}
                        {/* A PAID online order shows the real GST-inclusive amount charged; a
                            quote-request row stays indicative (its binding price is in the quotation). */}
                        {order.total_amount ? (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-sm font-semibold text-muted-foreground">
                                {order.payment_status === "paid" ? "Total Paid" : "Indicative Subtotal"}
                              </span>
                              <span className="text-lg font-bold text-foreground">₹{order.total_amount.toLocaleString("en-IN")}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                              {order.payment_status === "paid"
                                ? "Paid in full, inclusive of 18% GST. Transport and any optional installation you selected are included in this total."
                                : "Indicative starting prices, exclusive of GST. Free delivery within 50 km of our facility; beyond 50 km transport is charged on distance. Installation is charged separately. Your final price is confirmed in your written quotation."}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <div className="text-center pt-3">
                      <Button variant="outline" asChild>
                        <Link href="/my-account/orders">See All Quote Requests <ChevronRight className="ml-1 h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SUPPORT TAB */}
            {activeTab === "support" && (
              <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-3xl space-y-4">
                <h2 className="font-display text-xl font-semibold mb-2">Need Help?</h2>
                <p className="text-muted-foreground mb-6">We're here to help you with any questions about your quote requests or products.</p>
                {[
                  { icon: Phone, title: "Call Us", desc: "Speak to our team directly", action: "tel:+919731897976", cta: "+91 97318 97976" },
                  { icon: MessageSquare, title: "WhatsApp", desc: "Chat with us on WhatsApp", action: "https://wa.me/919731897976", cta: "Open WhatsApp" },
                  { icon: Mail, title: "Email Support", desc: "Send us a detailed message", action: "mailto:sales@portableofficecabin.com", cta: "sales@portableofficecabin.com" },
                  { icon: HelpCircle, title: "FAQ", desc: "Find answers to common questions", action: "/faq", cta: "View FAQ" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  const isExternal = item.action.startsWith("http") || item.action.startsWith("tel") || item.action.startsWith("mailto");
                  return (
                    <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" animate="visible">
                      {isExternal ? (
                        <a href={item.action} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-card rounded-xl border border-border/50 p-5 hover:shadow-md hover:border-accent/30 transition-all group">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6 text-accent" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                          <span className="text-sm font-medium text-accent">{item.cta}</span>
                        </a>
                      ) : (
                        <Link href={item.action} className="flex items-center gap-4 bg-card rounded-xl border border-border/50 p-5 hover:shadow-md hover:border-accent/30 transition-all group">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6 text-accent" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                          <span className="text-sm font-medium text-accent">{item.cta}</span>
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </Layout>
  );
}

function ProfileCompleteness({ profile }: { profile: Profile }) {
  const fields = [
    { label: "Name", filled: !!profile.full_name },
    { label: "Phone", filled: !!profile.phone },
    { label: "Company", filled: !!profile.company },
    { label: "Address", filled: !!profile.address_line1 },
    { label: "City", filled: !!profile.city },
    { label: "State", filled: !!profile.state },
    { label: "Pincode", filled: !!profile.pincode },
  ];
  const filled = fields.filter(f => f.filled).length;
  const percent = Math.round((filled / fields.length) * 100);

  if (percent === 100) return null;

  return (
    <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl border border-accent/20 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Star className="h-5 w-5 text-accent" /> Complete Your Profile
        </h3>
        <span className="text-sm font-bold text-accent">{percent}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-accent/10 overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-accent rounded-full"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {fields.filter(f => !f.filled).map(f => (
          <span key={f.label} className="text-xs bg-background/80 text-muted-foreground px-2.5 py-1 rounded-full border border-border/50">
            + {f.label}
          </span>
        ))}
      </div>
    </div>
  );
}
