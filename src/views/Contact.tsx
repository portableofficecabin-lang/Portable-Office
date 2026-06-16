"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Send, Clock, Loader2, Check, ChevronLeft, ChevronRight, User, Package, ClipboardList, FileCheck, Copy } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { seoData, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { OTPVerificationModal } from "@/components/booking/OTPVerificationModal";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { FreshInsightSection } from "@/components/products/FreshInsightSection";

const PRODUCT_OPTIONS = [
  "Portable Cabins",
  "Site Office Containers",
  "Container Offices",
  "Prefab Homes",
  "Security Cabins",
  "Portable Toilet Cabins",
  "G+1 Workmen Accommodation",
  "Cargo, Storage & Shipping Containers",
  "Other / Custom Requirement",
];

const TIMELINE_OPTIONS = [
  "Immediate (Within 7 days)",
  "Within 2-3 weeks",
  "Within 1 month",
  "1-3 months",
  "Just exploring",
];

const BUDGET_OPTIONS = [
  "Under ₹1 Lakh",
  "₹1 - 5 Lakhs",
  "₹5 - 10 Lakhs",
  "₹10 - 25 Lakhs",
  "Above ₹25 Lakhs",
  "Need help estimating",
];

const PURPOSE_OPTIONS = [
  "Purchase (Buy)",
  "Rental",
  "Both — open to either",
];

type FormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  products: string[];
  purpose: string;
  quantity: string;
  budget: string;
  timeline: string;
  location: string;
  message: string;
};

const initialData: FormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  products: [],
  purpose: "",
  quantity: "",
  budget: "",
  timeline: "",
  location: "",
  message: "",
};

const step1Schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(7, "Phone number is required").max(20),
  company: z.string().trim().max(150).optional(),
});

const step2Schema = z.object({
  products: z.array(z.string()).min(1, "Please select at least one product"),
  purpose: z.string().min(1, "Please select your purpose"),
});

const step3Schema = z.object({
  quantity: z.string().trim().min(1, "Please enter quantity").max(50),
  budget: z.string().min(1, "Please select a budget range"),
  timeline: z.string().min(1, "Please select a timeline"),
  location: z.string().trim().min(2, "Please enter delivery location").max(150),
  message: z.string().trim().max(2000).optional(),
});

const STEPS = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "Products", icon: Package },
  { id: 3, label: "Requirements", icon: ClipboardList },
  { id: 4, label: "Review", icon: FileCheck },
];

function generateRefNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `CT-${s}`;
}

export default function ContactPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((p) => ({ ...p, [key]: value }));
  };

  const toggleProduct = (product: string) => {
    setFormData((p) => ({
      ...p,
      products: p.products.includes(product)
        ? p.products.filter((x) => x !== product)
        : [...p.products, product],
    }));
  };

  const validateStep = (s: number): boolean => {
    let result;
    if (s === 1) result = step1Schema.safeParse(formData);
    else if (s === 2) result = step2Schema.safeParse(formData);
    else if (s === 3) result = step3Schema.safeParse(formData);
    else return true;

    if (!result.success) {
      toast({
        title: "Please complete required fields",
        description: result.error.errors[0]?.message || "Invalid input",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => Math.min(4, s + 1));
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const sendOTP = async () => {
    const { data, error } = await supabase.functions.invoke("send-booking-otp", {
      body: {
        email: formData.email.trim(),
        customer_name: formData.name.trim(),
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;
    setIsSubmitting(true);
    setOtpError(null);
    try {
      await sendOTP();
      setShowOTPModal(true);
      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the 6-digit code.",
      });
    } catch (err) {
      console.error("Error sending OTP:", err);
      setShowOTPModal(true);
      toast({
        title: "Verification Code Sent",
        description: "Please check your email. If you didn't receive it, tap Resend.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildMessageBody = (ref: string) => {
    return [
      `Reference: ${ref}`,
      `Purpose: ${formData.purpose}`,
      `Products of Interest: ${formData.products.join(", ")}`,
      `Quantity: ${formData.quantity}`,
      `Budget: ${formData.budget}`,
      `Timeline: ${formData.timeline}`,
      `Delivery Location: ${formData.location}`,
      formData.message ? `\nAdditional Notes:\n${formData.message}` : "",
    ].filter(Boolean).join("\n");
  };

  const handleVerifyOTP = async (otp: string) => {
    setIsVerifyingOTP(true);
    setOtpError(null);
    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "verify-booking-otp",
        { body: { email: formData.email.trim(), otp } }
      );
      if (verifyError) {
        setOtpError("Verification service unavailable. Please try again.");
        return;
      }
      if (!verifyData?.valid) {
        setOtpError(verifyData?.error || "Invalid verification code");
        return;
      }

      const ref = generateRefNumber();
      const subject = `[${ref}] Quote Request — ${formData.products.slice(0, 2).join(", ")}${formData.products.length > 2 ? " +more" : ""}`;

      const enquiryData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim() || null,
        subject,
        message: buildMessageBody(ref),
        enquiry_type: "quote" as const,
      };

      const { error } = await supabase.from("enquiries").insert(enquiryData as any);
      if (error) throw error;

      supabase.functions.invoke("send-enquiry-notification", {
        body: enquiryData,
      }).catch((emailError) => {
        console.error("Failed to send notification email:", emailError);
      });

      setShowOTPModal(false);
      setReferenceNumber(ref);
      toast({
        title: "Quote Request Submitted!",
        description: `Your reference number is ${ref}`,
      });
    } catch (err: any) {
      console.error("Error submitting:", err);
      setOtpError(err.message || "Failed to submit. Please try again.");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    setOtpError(null);
    await sendOTP();
  };

  const copyRef = () => {
    if (referenceNumber) {
      navigator.clipboard.writeText(referenceNumber);
      toast({ title: "Copied!", description: "Reference number copied to clipboard." });
    }
  };

  const resetForm = () => {
    setFormData(initialData);
    setStep(1);
    setReferenceNumber(null);
  };

  const contactInfo = [
    { icon: Phone, title: "Phone", details: ["+91 9731897976", "+91 90199 10931"], action: "tel:+919731897976" },
    { icon: Mail, title: "Email", details: ["sales@portableofficecabin.com", "portableofficecabin@gmail.com"], action: "mailto:sales@portableofficecabin.com" },
    { icon: MapPin, title: "Tamil Nadu Factory", details: ["Survey No. 222, Door No. 2/149-6, Road 1C", "Post Addakurukki, Kamandoddi, Tamil Nadu 635117", "Phone: +91 90199 10931"], action: "#" },
    { icon: MapPin, title: "Karnataka Factory (Bangalore)", details: ["Sy. No. 51, Mylapur Post, Mugabala", "Hoskote, Karnataka 562114", "Phone: +91 97318 97976"], action: "#" },
    { icon: Clock, title: "Business Hours", details: ["Mon - Sat: 7:00 AM - 10:00 PM", "Sunday: 10:00 AM - 7:00 PM"], action: "#" },
  ];

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <Layout>
      <SEOHead
        title={seoData.contact.title}
        description={seoData.contact.description}
        keywords={seoData.contact.keywords}
        canonicalUrl="https://portableofficecabin.com/contact"
        structuredData={[
          generateBreadcrumbSchema([
            { name: "Home", url: "https://portableofficecabin.com" },
            { name: "Contact Us", url: "https://portableofficecabin.com/contact" },
          ]),
        ]}
      />

      <section className="bg-primary text-primary-foreground py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-lg text-primary-foreground/80">
              Share your requirements in 4 quick steps. We'll respond within 24 hours with a detailed estimate.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Get in Touch</h2>
              <p className="text-muted-foreground">
                Reach out through any of these channels. Our team is ready to assist you with your portable cabin needs.
              </p>
              <div className="space-y-4">
                {contactInfo.map((item) => (
                  <a
                    key={item.title}
                    href={item.action}
                    className="flex gap-4 p-4 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all group"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-colors">
                      <item.icon className="w-5 h-5 text-accent group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{item.title}</div>
                      {item.details.map((detail) => (
                        <div key={detail} className="text-sm text-muted-foreground">{detail}</div>
                      ))}
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Wizard */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl shadow-card p-6 sm:p-8">
                {referenceNumber ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
                      <Check className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="font-display text-3xl font-bold text-foreground mb-3">Thank You!</h2>
                    <p className="text-muted-foreground mb-2">Your quote request has been submitted successfully.</p>
                    <p className="text-muted-foreground mb-6">We'll contact you within 24 hours with a detailed estimate.</p>
                    <div className="bg-secondary/50 rounded-xl p-5 max-w-sm mx-auto mb-6">
                      <div className="text-sm text-muted-foreground mb-1">Reference Number</div>
                      <div className="flex items-center justify-center gap-3">
                        <span className="font-mono text-2xl font-bold text-accent tracking-wider">{referenceNumber}</span>
                        <button onClick={copyRef} className="text-muted-foreground hover:text-accent transition-colors" aria-label="Copy">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Save this number to track your request.</p>
                    </div>
                    <Button variant="outline" onClick={resetForm}>Submit Another Request</Button>
                  </div>
                ) : (
                  <>
                    {/* Stepper */}
                    <div className="mb-8">
                      <div className="flex justify-between items-start mb-4 relative">
                        {STEPS.map((s) => {
                          const Icon = s.icon;
                          const done = step > s.id;
                          const active = step === s.id;
                          return (
                            <div key={s.id} className="flex flex-col items-center gap-2 z-10 flex-1">
                              <div
                                className={cn(
                                  "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border-2",
                                  done && "bg-accent border-accent text-white",
                                  active && "bg-accent border-accent text-white ring-4 ring-accent/20",
                                  !done && !active && "bg-secondary border-border text-muted-foreground"
                                )}
                              >
                                {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                              </div>
                              <div className={cn("text-xs sm:text-sm font-medium text-center", (done || active) ? "text-foreground" : "text-muted-foreground")}>
                                {s.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Step content */}
                    <div className="min-h-[300px]">
                      {step === 1 && (
                        <div className="space-y-5 animate-fade-in">
                          <h3 className="font-display text-xl font-bold">Tell us about yourself</h3>
                          <div className="grid sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <Label htmlFor="name">Full Name *</Label>
                              <Input id="name" value={formData.name} onChange={(e) => update("name", e.target.value)} placeholder="John Doe" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">Email *</Label>
                              <Input id="email" type="email" value={formData.email} onChange={(e) => update("email", e.target.value)} placeholder="john@example.com" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone Number *</Label>
                              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 9731897976" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="company">Company / Organisation</Label>
                              <Input id="company" value={formData.company} onChange={(e) => update("company", e.target.value)} placeholder="Optional" />
                            </div>
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-5 animate-fade-in">
                          <h3 className="font-display text-xl font-bold">What are you interested in?</h3>
                          <div className="space-y-2">
                            <Label>Products of Interest * (select one or more)</Label>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {PRODUCT_OPTIONS.map((p) => {
                                const checked = formData.products.includes(p);
                                return (
                                  <label
                                    key={p}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                                      checked ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                                    )}
                                  >
                                    <Checkbox checked={checked} onCheckedChange={() => toggleProduct(p)} />
                                    <span className="text-sm font-medium">{p}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Purpose *</Label>
                            <Select value={formData.purpose} onValueChange={(v) => update("purpose", v)}>
                              <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                              <SelectContent>
                                {PURPOSE_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {step === 3 && (
                        <div className="space-y-5 animate-fade-in">
                          <h3 className="font-display text-xl font-bold">Your requirements</h3>
                          <div className="grid sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <Label htmlFor="quantity">Quantity / Size *</Label>
                              <Input id="quantity" value={formData.quantity} onChange={(e) => update("quantity", e.target.value)} placeholder="e.g. 2 units, 20x10 ft" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="location">Delivery Location *</Label>
                              <Input id="location" value={formData.location} onChange={(e) => update("location", e.target.value)} placeholder="City, State" />
                            </div>
                            <div className="space-y-2">
                              <Label>Budget Range *</Label>
                              <Select value={formData.budget} onValueChange={(v) => update("budget", v)}>
                                <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                                <SelectContent>
                                  {BUDGET_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Timeline *</Label>
                              <Select value={formData.timeline} onValueChange={(v) => update("timeline", v)}>
                                <SelectTrigger><SelectValue placeholder="When do you need it?" /></SelectTrigger>
                                <SelectContent>
                                  {TIMELINE_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="message">Additional Notes (optional)</Label>
                            <Textarea id="message" value={formData.message} onChange={(e) => update("message", e.target.value)} rows={4} placeholder="Specific features, customisations, or questions..." />
                          </div>
                        </div>
                      )}

                      {step === 4 && (
                        <div className="space-y-5 animate-fade-in">
                          <h3 className="font-display text-xl font-bold">Review your request</h3>
                          <div className="space-y-4">
                            <ReviewBlock title="Personal Info" rows={[
                              ["Name", formData.name],
                              ["Email", formData.email],
                              ["Phone", formData.phone],
                              ["Company", formData.company || "—"],
                            ]} />
                            <ReviewBlock title="Products" rows={[
                              ["Interested In", formData.products.join(", ")],
                              ["Purpose", formData.purpose],
                            ]} />
                            <ReviewBlock title="Requirements" rows={[
                              ["Quantity / Size", formData.quantity],
                              ["Delivery Location", formData.location],
                              ["Budget", formData.budget],
                              ["Timeline", formData.timeline],
                              ...(formData.message ? [["Notes", formData.message] as [string, string]] : []),
                            ]} />
                          </div>
                          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-sm text-muted-foreground">
                            <strong className="text-foreground">Email verification required:</strong> When you submit, we'll send a 6-digit code to <strong className="text-foreground">{formData.email || "your email"}</strong> to verify your request.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nav buttons */}
                    <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
                      <Button variant="outline" onClick={prevStep} disabled={step === 1 || isSubmitting}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Back
                      </Button>
                      {step < 4 ? (
                        <Button variant="accent" onClick={nextStep}>
                          Continue <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="accent" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending OTP...</>
                          ) : (
                            <><Send className="mr-2 h-5 w-5" /> Verify & Submit</>
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <FreshInsightSection slug="contact" />
      </section>

      <OTPVerificationModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        email={formData.email}
        isVerifying={isVerifyingOTP}
        error={otpError}
        verifyButtonLabel="Verify & Submit Request"
        verifyingLabel="Submitting..."
      />
    </Layout>
  );
}

function ReviewBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-accent font-semibold mb-3">{title}</div>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-muted-foreground text-xs">{k}</dt>
            <dd className="text-foreground font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
