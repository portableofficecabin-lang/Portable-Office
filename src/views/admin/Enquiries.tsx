"use client";

import { useState, useEffect } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { motion, AnimatePresence } from "framer-motion";

import {
  MessageSquare,
  Mail,
  Phone,
  Building,
  Package,
  Eye,
  Loader2,
  Search,
  Filter,
  Send,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Enquiry } from "@/types/database";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";

const statusConfig: Record<Enquiry["status"], { bg: string; text: string; icon?: string }> = {
  new: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-400" },
  read: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-400" },
  responded: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-800 dark:text-emerald-400" },
  closed: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-800 dark:text-gray-400" },
};

const typeLabels: Record<Enquiry["enquiry_type"], string> = {
  general: "General",
  quote: "Quote Request",
  product: "Product Enquiry",
  support: "Support",
};

const typeColors: Record<Enquiry["enquiry_type"], string> = {
  general: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  quote: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  product: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  support: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const { data, error } = await supabase
        .from("enquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEnquiries((data as Enquiry[]) || []);
    } catch (err) {
      console.error("Error fetching enquiries:", err);
      toast({
        title: "Error",
        description: "Failed to load enquiries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Enquiry["status"]) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from("enquiries")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setEnquiries((prev) =>
        prev.map((enq) => (enq.id === id ? { ...enq, status } : enq))
      );

      if (selectedEnquiry?.id === id) {
        setSelectedEnquiry({ ...selectedEnquiry, status });
      }

      toast({
        title: "Status Updated",
        description: `Enquiry marked as ${status}`,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const markAsRead = async (enquiry: Enquiry) => {
    if (enquiry.status === "new") {
      await updateStatus(enquiry.id, "read");
    }
    setSelectedEnquiry(enquiry);
  };

  const filteredEnquiries = enquiries.filter((enq) => {
    const matchesSearch =
      enq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enq.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enq.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || enq.status === statusFilter;
    const matchesType = typeFilter === "all" || enq.enquiry_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const newEnquiriesCount = enquiries.filter((e) => e.status === "new").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-accent" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Manage customer enquiries and quote requests"
        badge={
          newEnquiriesCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 text-white text-sm font-semibold"
            >
              {newEnquiriesCount} new
            </motion.span>
          )
        }
      />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search enquiries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-xl border-2 focus:border-accent"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-12 rounded-xl border-2">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-12 rounded-xl border-2">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="quote">Quote Request</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enquiries List */}
        <AdminCard delay={0.2}>
          <AdminCardHeader>
            All Enquiries ({filteredEnquiries.length})
          </AdminCardHeader>
          <AdminCardContent>
            {filteredEnquiries.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No enquiries found</p>
              </motion.div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                <AnimatePresence>
                  {filteredEnquiries.map((enq, index) => (
                    <motion.div
                      key={enq.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      whileHover={{ x: 4 }}
                      className={cn(
                        "border-2 rounded-xl p-4 cursor-pointer transition-all duration-200",
                        selectedEnquiry?.id === enq.id && "border-accent bg-accent/5 shadow-lg",
                        enq.status === "new" && selectedEnquiry?.id !== enq.id && "bg-blue-50/50 dark:bg-blue-900/10",
                        selectedEnquiry?.id !== enq.id && "border-border hover:border-accent/50"
                      )}
                      onClick={() => markAsRead(enq)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold",
                            enq.status === "new" 
                              ? "bg-gradient-to-br from-blue-500 to-blue-400 text-white" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            {enq.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate flex items-center gap-2">
                              {enq.name}
                              {enq.status === "new" && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {enq.email}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn("flex-shrink-0 font-semibold", statusConfig[enq.status].bg, statusConfig[enq.status].text)}>
                          {enq.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {enq.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge className={cn("font-medium", typeColors[enq.enquiry_type])}>
                          {typeLabels[enq.enquiry_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateSafe(new Date(enq.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </AdminCardContent>
        </AdminCard>

        {/* Enquiry Details */}
        <AdminCard delay={0.3} gradient>
          <AnimatePresence mode="wait">
            {selectedEnquiry ? (
              <motion.div
                key={selectedEnquiry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <motion.h2
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-display font-bold text-xl text-foreground"
                    >
                      {selectedEnquiry.name}
                    </motion.h2>
                    <p className="text-sm text-muted-foreground">
                      {formatDateSafe(new Date(selectedEnquiry.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Badge className={cn(
                    "px-3 py-1.5 text-sm font-semibold",
                    statusConfig[selectedEnquiry.status].bg,
                    statusConfig[selectedEnquiry.status].text
                  )}>
                    {selectedEnquiry.status}
                  </Badge>
                </div>

                <div className="space-y-3 mb-6">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 group hover:bg-accent/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-colors">
                      <Mail className="h-5 w-5 text-accent group-hover:text-white transition-colors" />
                    </div>
                    <a
                      href={`mailto:${selectedEnquiry.email}`}
                      className="text-accent hover:underline font-medium"
                    >
                      {selectedEnquiry.email}
                    </a>
                  </motion.div>
                  {selectedEnquiry.phone && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 group hover:bg-accent/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-colors">
                        <Phone className="h-5 w-5 text-accent group-hover:text-white transition-colors" />
                      </div>
                      <a
                        href={`tel:${selectedEnquiry.phone}`}
                        className="text-accent hover:underline font-medium"
                      >
                        {selectedEnquiry.phone}
                      </a>
                    </motion.div>
                  )}
                  {selectedEnquiry.company && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Building className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-medium">{selectedEnquiry.company}</span>
                    </motion.div>
                  )}
                  {selectedEnquiry.product_name && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-medium">{selectedEnquiry.product_name}</span>
                    </motion.div>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4"
                >
                  <Badge className={cn("font-medium mb-3", typeColors[selectedEnquiry.enquiry_type])}>
                    {typeLabels[selectedEnquiry.enquiry_type]}
                  </Badge>
                  {selectedEnquiry.subject && (
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      {selectedEnquiry.subject}
                    </h3>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="p-4 bg-muted rounded-xl mb-6"
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedEnquiry.message}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap gap-3"
                >
                  <Select
                    value={selectedEnquiry.status}
                    onValueChange={(value) =>
                      updateStatus(selectedEnquiry.id, value as Enquiry["status"])
                    }
                    disabled={updating === selectedEnquiry.id}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="accent" asChild className="flex-1 sm:flex-none">
                    <a href={`mailto:${selectedEnquiry.email}`}>
                      <Send className="mr-2 h-4 w-4" />
                      Reply via Email
                    </a>
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-96 text-muted-foreground"
              >
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Eye className="h-10 w-10" />
                </div>
                <p className="font-medium text-lg">Select an enquiry</p>
                <p className="text-sm">to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </AdminCard>
      </div>
    </div>
  );
}
