"use client";

import { useState } from "react";
import {
  Truck,
  Clock,
  Package,
  Shield,
  Wrench,
  MapPin,
  Phone,
  CheckCircle2,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function InfoItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <span className="text-muted-foreground text-sm">{text}</span>
    </li>
  );
}

export function ShippingDeliveryModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Truck className="h-5 w-5" />
          Shipping & Delivery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Truck className="h-6 w-6 text-accent" />
            Shipping & Delivery
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="shipping" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shipping" className="text-xs sm:text-sm">🚚 Shipping</TabsTrigger>
            <TabsTrigger value="warranty" className="text-xs sm:text-sm">📦 Warranty</TabsTrigger>
            <TabsTrigger value="installation" className="text-xs sm:text-sm">🛠 Installation</TabsTrigger>
          </TabsList>

          {/* Shipping Tab */}
          <TabsContent value="shipping">
            <Accordion type="multiple" defaultValue={["delivery-options", "delivery-time", "packaging"]} className="w-full">
              <AccordionItem value="delivery-options">
                <AccordionTrigger className="font-semibold">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-accent" /> Delivery Options
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3">
                    <InfoItem icon={CheckCircle2} text="Free standard delivery within a 50 km radius" />
                    <InfoItem icon={MapPin} text="Beyond 50 km, transport is charged based on distance — confirmed in your written quotation" />
                    <InfoItem icon={CheckCircle2} text="Express delivery available at an additional cost (optional)" />
                    <InfoItem icon={Wrench} text="Professional installation available upon request" />
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delivery-time">
                <AccordionTrigger className="font-semibold">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" /> Delivery Time
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3">
                    <InfoItem icon={CalendarDays} text="Standard delivery: 7–14 working days" />
                    <InfoItem icon={CalendarDays} text="Express delivery: 3–7 working days" />
                    <InfoItem icon={MapPin} text="GPS shipment tracking provided for all orders" />
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="packaging">
                <AccordionTrigger className="font-semibold">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-accent" /> Packaging & Handling
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3">
                    <InfoItem icon={Shield} text="Secure, high-quality packaging to prevent damage" />
                    <InfoItem icon={CheckCircle2} text="Weather-protected transport" />
                    <InfoItem icon={CheckCircle2} text="Damage-free guarantee (damaged items replaced or refunded)" />
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Warranty Tab */}
          <TabsContent value="warranty">
            <Accordion type="multiple" defaultValue={["structural-warranty", "warranty-coverage", "support"]} className="w-full">
              <AccordionItem value="structural-warranty">
                <AccordionTrigger className="font-semibold">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" /> Structural Warranty
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3">
                    <InfoItem icon={CheckCircle2} text="MS Cabin – 5 Years" />
                    <InfoItem icon={CheckCircle2} text="GI Cabin – 15 Years" />
                    <InfoItem icon={CheckCircle2} text="ACP Cabin – 20 Years" />
                    <InfoItem icon={CheckCircle2} text="PUF Panels Cabin – 25 Years" />
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="warranty-coverage">
                <AccordionTrigger className="font-semibold">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" /> Additional Warranty
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3">
                    <InfoItem icon={CheckCircle2} text="Electrical components: 1 year" />
                    <InfoItem icon={CheckCircle2} text="Paint & finish: 6 months" />
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="support">
                <AccordionTrigger className="font-semibold">
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-accent" /> Support Services
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3">
                    <InfoItem icon={Phone} text="Customer support 7 days a week — Mon-Sat 7:00 AM - 10:00 PM, Sun 10:00 AM - 7:00 PM" />
                    <InfoItem icon={Wrench} text="On-site maintenance service available" />
                    <InfoItem icon={CheckCircle2} text="Spare parts readily available" />
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Installation Tab */}
          <TabsContent value="installation">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4 text-accent" /> Installation Timeline
              </h4>
              <div className="grid gap-3">
                {[
                  { step: "1", title: "Site Preparation", time: "1–2 days" },
                  { step: "2", title: "Delivery & Setup", time: "1 day" },
                  { step: "3", title: "Final Inspection", time: "Same day" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-4 bg-muted/50 rounded-lg p-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Manufacturing & Lead Time */}
              <div className="mt-6 bg-accent/5 border border-accent/20 rounded-lg p-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-accent" /> Manufacturing & Lead Time
                </h4>
                <ul className="space-y-2">
                  <InfoItem icon={CalendarDays} text="After placing the order, the manufacturing lead time is 7–14 days or 20–30 working days" />
                  <InfoItem icon={Package} text="Manufacturing time may vary depending on the project size (Small, Medium, or Large)" />
                </ul>
              </div>

              {/* Order Confirmation */}
              <div className="mt-4 bg-accent/5 border border-accent/20 rounded-lg p-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-accent" /> Before You Order
                </h4>
                <ul className="space-y-2">
                  <InfoItem icon={CheckCircle2} text="Please confirm all details before placing the order" />
                  <InfoItem icon={Phone} text="You can confirm via phone call, email, WhatsApp, or appointment booking" />
                </ul>
              </div>

              {/* Important Notes */}
              <div className="mt-4 bg-accent/5 border border-accent/20 rounded-lg p-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-accent" /> Important Notes
                </h4>
                <ul className="space-y-2">
                  <InfoItem icon={CalendarDays} text="Delivery times begin after order confirmation" />
                  <InfoItem icon={Clock} text="Installation scheduling is subject to availability" />
                  <InfoItem icon={MapPin} text="Additional charges may apply outside the 50 km radius" />
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
