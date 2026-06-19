"use client";

import { useState, useEffect } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  Building,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  CalendarDays,
  CalendarClock,
  Ban,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Appointment } from "@/types/database";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardHeader, AdminCardContent } from "@/components/admin/AdminCard";

const statusConfig: Record<Appointment["status"], { bg: string; text: string; gradient?: string; icon: React.ElementType }> = {
  pending: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-400", gradient: "from-amber-400 to-amber-500", icon: Clock },
  confirmed: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-800 dark:text-emerald-400", gradient: "from-emerald-400 to-emerald-500", icon: CheckCircle },
  cancelled: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-400", gradient: "from-red-400 to-red-500", icon: XCircle },
  completed: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-400", gradient: "from-blue-400 to-blue-500", icon: CheckCircle },
  postponed: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-400", gradient: "from-purple-400 to-purple-500", icon: CalendarClock },
  declined: { bg: "bg-slate-100 dark:bg-slate-900/30", text: "text-slate-800 dark:text-slate-400", gradient: "from-slate-400 to-slate-500", icon: Ban },
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Postpone modal state
  const [postponeModalOpen, setPostponeModalOpen] = useState(false);
  const [appointmentToPostpone, setAppointmentToPostpone] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    fetchAppointments();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          if (payload.eventType === 'INSERT') {
            setAppointments((prev) => [...prev, payload.new as Appointment]);
            toast({
              title: "New Appointment",
              description: `New appointment from ${(payload.new as Appointment).customer_name}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setAppointments((prev) =>
              prev.map((apt) => (apt.id === payload.new.id ? payload.new as Appointment : apt))
            );
          } else if (payload.eventType === 'DELETE') {
            setAppointments((prev) =>
              prev.filter((apt) => apt.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      setAppointments((data as Appointment[]) || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Appointment["status"]) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
      );

      if (selectedAppointment?.id === id) {
        setSelectedAppointment({ ...selectedAppointment, status });
      }

      toast({
        title: "Status Updated",
        description: `Appointment marked as ${status}`,
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

  const handlePostpone = async () => {
    if (!appointmentToPostpone || !newDate || !newTime) {
      toast({
        title: "Missing Information",
        description: "Please select a new date and time",
        variant: "destructive",
      });
      return;
    }

    setUpdating(appointmentToPostpone.id);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "postponed",
          appointment_date: newDate,
          appointment_time: newTime,
          notes: `${appointmentToPostpone.notes || ''}\n[Postponed from ${appointmentToPostpone.appointment_date} ${appointmentToPostpone.appointment_time}]`.trim(),
        })
        .eq("id", appointmentToPostpone.id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentToPostpone.id
            ? { ...apt, status: "postponed" as const, appointment_date: newDate, appointment_time: newTime }
            : apt
        )
      );

      toast({
        title: "Appointment Postponed",
        description: `Rescheduled to ${formatDateSafe(new Date(newDate), "MMM d, yyyy")} at ${newTime}`,
      });

      setPostponeModalOpen(false);
      setAppointmentToPostpone(null);
      setNewDate("");
      setNewTime("");
    } catch (err) {
      console.error("Error postponing appointment:", err);
      toast({
        title: "Error",
        description: "Failed to postpone appointment",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const openPostponeModal = (apt: Appointment) => {
    setAppointmentToPostpone(apt);
    setNewDate(apt.appointment_date);
    setNewTime(apt.appointment_time);
    setPostponeModalOpen(true);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDay = (date: Date) =>
    appointments.filter((apt) =>
      isSameDay(new Date(apt.appointment_date), date)
    );

  const filteredAppointments = selectedDate
    ? getAppointmentsForDay(selectedDate)
    : appointments.filter((apt) =>
        isSameMonth(new Date(apt.appointment_date), currentMonth)
      );

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
        title="Appointments"
        description="Manage customer appointments and consultations"
        badge={
          appointments.filter(a => a.status === "pending").length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-amber to-amber-light text-white text-sm font-semibold"
            >
              {appointments.filter(a => a.status === "pending").length} pending
            </motion.span>
          )
        }
      />

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(statusConfig) as Appointment["status"][]).map((status) => {
          const count = appointments.filter(a => a.status === status).length;
          const config = statusConfig[status];
          const Icon = config.icon;
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-xl p-4 border-2 transition-all cursor-pointer hover:shadow-md",
                config.bg,
                "border-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", config.text)} />
                <span className={cn("text-2xl font-bold", config.text)}>{count}</span>
              </div>
              <p className={cn("text-sm font-medium capitalize mt-1", config.text)}>{status}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <AdminCard delay={0.1} className="lg:col-span-1">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <motion.h2
                key={format(currentMonth, "MMMM yyyy")}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display font-bold text-foreground text-lg"
              >
                {format(currentMonth, "MMMM yyyy")}
              </motion.h2>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="hover:bg-accent/10 hover:text-accent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="hover:bg-accent/10 hover:text-accent"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-sm mb-3">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="py-2 text-muted-foreground font-semibold text-xs uppercase">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-11" />
              ))}
              
              {days.map((day, index) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <motion.button
                    key={day.toISOString()}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.01 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={cn(
                      "h-11 rounded-xl text-sm relative transition-all duration-200 font-medium",
                      isSelected && "bg-gradient-to-br from-accent to-amber-light text-white shadow-accent",
                      isToday && !isSelected && "ring-2 ring-accent ring-offset-2",
                      !isSelected && "text-foreground hover:bg-accent/10"
                    )}
                  >
                    {format(day, "d")}
                    {dayAppointments.length > 0 && !isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-accent to-amber-light"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-accent hover:text-accent hover:bg-accent/10"
                  onClick={() => setSelectedDate(null)}
                >
                  Show all appointments
                </Button>
              </motion.div>
            )}
          </div>
        </AdminCard>

        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <AdminCard delay={0.2}>
            <AdminCardHeader className="flex items-center justify-between">
              <span>
                {selectedDate
                  ? `Appointments for ${format(selectedDate, "MMMM d, yyyy")}`
                  : `All Appointments in ${format(currentMonth, "MMMM yyyy")}`}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchAppointments}
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </AdminCardHeader>
            <AdminCardContent>
              {filteredAppointments.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No appointments found</p>
                </motion.div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  <AnimatePresence>
                    {filteredAppointments.map((apt, index) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ x: 4 }}
                        className={cn(
                          "border-2 rounded-xl p-4 cursor-pointer transition-all duration-200",
                          selectedAppointment?.id === apt.id 
                            ? "border-accent bg-accent/5 shadow-lg" 
                            : "border-border hover:border-accent/50"
                        )}
                        onClick={() => setSelectedAppointment(apt)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-foreground truncate">
                                {apt.customer_name}
                              </h3>
                              <Badge className={cn(
                                statusConfig[apt.status].bg,
                                statusConfig[apt.status].text,
                                "font-semibold"
                              )}>
                                {apt.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {apt.service_type}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-accent" />
                                {formatDateSafe(new Date(apt.appointment_date), "MMM d")}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-accent" />
                                {apt.appointment_time}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-1 flex-shrink-0">
                            {(apt.status === "pending" || apt.status === "postponed") && (
                              <>
                                {/* Accept */}
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatus(apt.id, "confirmed");
                                    }}
                                    disabled={updating === apt.id}
                                    title="Accept"
                                  >
                                    {updating === apt.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-5 w-5" />
                                    )}
                                  </Button>
                                </motion.div>
                                
                                {/* Postpone */}
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPostponeModal(apt);
                                    }}
                                    disabled={updating === apt.id}
                                    title="Postpone"
                                  >
                                    <CalendarClock className="h-5 w-5" />
                                  </Button>
                                </motion.div>
                                
                                {/* Decline */}
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatus(apt.id, "declined");
                                    }}
                                    disabled={updating === apt.id}
                                    title="Decline"
                                  >
                                    <Ban className="h-5 w-5" />
                                  </Button>
                                </motion.div>
                              </>
                            )}
                            
                            {apt.status === "confirmed" && (
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(apt.id, "completed");
                                  }}
                                  disabled={updating === apt.id}
                                  title="Mark Completed"
                                >
                                  {updating === apt.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-5 w-5" />
                                  )}
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </AdminCardContent>
          </AdminCard>

          {/* Appointment Details */}
          <AnimatePresence>
            {selectedAppointment && (
              <motion.div
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 20, height: 0 }}
              >
                <AdminCard gradient>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="font-display font-bold text-foreground text-lg">
                          Appointment Details
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedAppointment.customer_name}
                        </p>
                      </div>
                      <Badge className={cn(
                        "px-3 py-1.5 text-sm font-semibold",
                        statusConfig[selectedAppointment.status].bg,
                        statusConfig[selectedAppointment.status].text
                      )}>
                        {selectedAppointment.status}
                      </Badge>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-accent" />
                          </div>
                          <a
                            href={`mailto:${selectedAppointment.customer_email}`}
                            className="text-accent hover:underline font-medium"
                          >
                            {selectedAppointment.customer_email}
                          </a>
                        </motion.div>
                        {selectedAppointment.customer_phone && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                          >
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                              <Phone className="h-5 w-5 text-accent" />
                            </div>
                            <a
                              href={`tel:${selectedAppointment.customer_phone}`}
                              className="text-accent hover:underline font-medium"
                            >
                              {selectedAppointment.customer_phone}
                            </a>
                          </motion.div>
                        )}
                        {selectedAppointment.company && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                          >
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                              <Building className="h-5 w-5 text-accent" />
                            </div>
                            <span className="font-medium">{selectedAppointment.company}</span>
                          </motion.div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-accent" />
                          </div>
                          <span className="font-medium">
                            {formatDateSafe(new Date(selectedAppointment.appointment_date), "EEEE, MMMM d, yyyy")}
                          </span>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-accent" />
                          </div>
                          <span className="font-medium">{selectedAppointment.appointment_time}</span>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-accent" />
                          </div>
                          <span className="font-medium">{selectedAppointment.service_type}</span>
                        </motion.div>
                      </div>
                    </div>

                    {selectedAppointment.notes && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="mt-6 p-4 bg-muted rounded-xl"
                      >
                        <p className="text-sm font-semibold mb-2 text-foreground">Notes:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedAppointment.notes}
                        </p>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex gap-3 mt-6"
                    >
                      <Select
                        value={selectedAppointment.status}
                        onValueChange={(value) =>
                          updateStatus(
                            selectedAppointment.id,
                            value as Appointment["status"]
                          )
                        }
                        disabled={updating === selectedAppointment.id}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="postponed">Postponed</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {(selectedAppointment.status === "pending" || selectedAppointment.status === "postponed") && (
                        <Button
                          variant="outline"
                          onClick={() => openPostponeModal(selectedAppointment)}
                          className="gap-2"
                        >
                          <CalendarClock className="h-4 w-4" />
                          Reschedule
                        </Button>
                      )}
                    </motion.div>
                  </div>
                </AdminCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Postpone Modal */}
      <Dialog open={postponeModalOpen} onOpenChange={setPostponeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-purple-600" />
              Postpone Appointment
            </DialogTitle>
            <DialogDescription>
              Reschedule this appointment to a new date and time.
              {appointmentToPostpone && (
                <span className="block mt-2 font-medium text-foreground">
                  Customer: {appointmentToPostpone.customer_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-date">New Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={formatDateSafe(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-time">New Time</Label>
              <Input
                id="new-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPostponeModalOpen(false);
                setAppointmentToPostpone(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePostpone}
              disabled={updating === appointmentToPostpone?.id || !newDate || !newTime}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updating === appointmentToPostpone?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm Postpone"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
