"use client";

import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Product } from "@/data/products";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EnquiryModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EnquiryModal({ product, isOpen, onClose }: EnquiryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const enquiryData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        company: formData.company.trim() || null,
        message: formData.message.trim(),
        enquiry_type: "quote" as const,
        product_id: product.id,
        product_name: product.name,
        subject: `Quote Request for ${product.name}`,
      };

      const { error } = await supabase.from("enquiries").insert(enquiryData as any);

      if (error) {
        throw error;
      }

      // Send notification email via edge function (don't wait/block on this)
      supabase.functions.invoke("send-enquiry-notification", {
        body: enquiryData,
      }).catch((emailError) => {
        console.error("Failed to send notification email:", emailError);
      });

      toast({
        title: "Enquiry Sent!",
        description: "We'll get back to you within 24 hours.",
      });
      
      setFormData({ name: "", email: "", phone: "", company: "", message: "" });
      onClose();
    } catch (err: any) {
      console.error("Error submitting enquiry:", err);
      toast({
        title: "Error",
        description: "Failed to send enquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto animate-fade-up">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Request a Quote
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Your Company"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us about your requirements, quantity needed, customization requests, etc."
              rows={4}
            />
          </div>

          {/* Product Summary */}
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm font-medium text-foreground mb-2">Product Summary</div>
            <div className="text-sm text-muted-foreground">{product.name}</div>
            {product.price && (
              <div className="text-sm text-accent font-medium mt-1">
                {product.priceLabel}: ₹{product.price.toLocaleString('en-IN')}
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Enquiry
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
