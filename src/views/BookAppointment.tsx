"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Layout } from "@/components/layout/Layout";
import { OTPVerificationModal } from "@/components/booking/OTPVerificationModal";

const bookingSchema = z.object({
  customer_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  customer_email: z.string().trim().email("Invalid email address").max(255),
  customer_phone: z.string().optional(),
  company: z.string().optional(),
  appointment_date: z.date({ required_error: "Please select a date" }),
  appointment_time: z.string().min(1, "Please select a time"),
  service_type: z.string().min(1, "Please select a service"),
  notes: z.string().max(1000).optional(),
});

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00",
];

const serviceTypes = [
  "Portable Cabin Consultation",
  "Site Office Enquiry",
  "Container Office Installation",
  "Prefab Home Design",
  "Portable Toilet Setup",
  "Security Cabin Installation",
  "General Consultation",
];

export default function BookAppointment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    company: "",
    appointment_time: "",
    service_type: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // OTP verification state
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const sendOTP = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("send-booking-otp", {
        body: {
          email: formData.customer_email.trim(),
          customer_name: formData.customer_name.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the 6-digit code.",
      });
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setOtpError(null);

    const result = bookingSchema.safeParse({
      ...formData,
      appointment_date: date,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Send OTP and show verification modal
    setIsSendingOTP(true);
    try {
      await sendOTP();
      setShowOTPModal(true);
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      // Even if edge function times out, email might have been sent
      // Show the modal anyway and let user try with the OTP they received
      setShowOTPModal(true);
      toast({
        title: "Verification Code Sent",
        description: "Please check your email. If you didn't receive it, you can resend.",
      });
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    setIsVerifyingOTP(true);
    setOtpError(null);

    try {
      // Verify OTP
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "verify-booking-otp",
        {
          body: {
            email: formData.customer_email.trim(),
            otp,
          },
        }
      );

      // Handle edge function invocation error
      if (verifyError) {
        console.error("Edge function error:", verifyError);
        setOtpError("Verification service unavailable. Please try again.");
        return;
      }

      // Handle invalid OTP response
      if (!verifyData?.valid) {
        setOtpError(verifyData?.error || "Invalid verification code");
        return;
      }

      // OTP verified, now submit the booking
      const appointmentData = {
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        customer_phone: formData.customer_phone.trim() || null,
        company: formData.company.trim() || null,
        appointment_date: format(date!, "yyyy-MM-dd"),
        appointment_time: formData.appointment_time,
        service_type: formData.service_type,
        notes: formData.notes.trim() || null,
      };

      const { error: insertError } = await supabase.from("appointments").insert(appointmentData as any);

      if (insertError) {
        console.error("Appointment insert error:", insertError);
        setOtpError("Failed to book appointment. Please try again.");
        return;
      }

      // Send confirmation email via edge function (non-blocking)
      supabase.functions.invoke("send-appointment-confirmation", {
        body: appointmentData,
      }).catch((emailError) => {
        console.error("Failed to send confirmation email:", emailError);
      });

      setShowOTPModal(false);
      setIsSubmitted(true);
      toast({
        title: "Appointment Requested!",
        description: "We'll confirm your appointment within 24 hours.",
      });
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setOtpError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    setOtpError(null);
    await sendOTP();
  };

  if (isSubmitted) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon className="h-8 w-8 text-accent" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">
              Appointment Requested!
            </h1>
            <p className="text-muted-foreground mb-6">
              Thank you for booking an appointment with us. We'll review your request and send you a confirmation email within 24 hours.
            </p>
            <Button variant="accent" asChild>
              <a href="/">Return to Home</a>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-custom py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">
              Book an Appointment
            </h1>
            <p className="text-muted-foreground">
              Schedule a consultation with our team to discuss your portable cabin needs.
            </p>
          </div>

          <div className="bg-card rounded-xl shadow-card p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Full Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_name: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                  {errors.customer_name && (
                    <p className="text-sm text-destructive">{errors.customer_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email *</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                  {errors.customer_email && (
                    <p className="text-sm text-destructive">{errors.customer_email}</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone Number</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_phone: e.target.value })
                    }
                    placeholder="+91 9731897976"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    placeholder="Your Company"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Service Type *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, service_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.service_type && (
                  <p className="text-sm text-destructive">{errors.service_type}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(date) =>
                          date < new Date() || date.getDay() === 0 || date.getDay() === 6
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.appointment_date && (
                    <p className="text-sm text-destructive">{errors.appointment_date}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time *</Label>
                  <Select
                    value={formData.appointment_time}
                    onValueChange={(value) =>
                      setFormData({ ...formData, appointment_time: value })
                    }
                  >
                    <SelectTrigger>
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select a time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.appointment_time && (
                    <p className="text-sm text-destructive">{errors.appointment_time}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Tell us about your requirements, preferred location, or any questions..."
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full"
                disabled={isSendingOTP}
              >
                {isSendingOTP ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Verification Code...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Verify Email & Book
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        email={formData.customer_email}
        isVerifying={isVerifyingOTP}
        error={otpError}
      />
    </Layout>
  );
}
