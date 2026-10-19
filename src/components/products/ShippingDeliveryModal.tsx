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
  type LucideIcon,
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
import { DISPATCH_WORKING_DAYS, FREE_DELIVERY_PIN_PREFIXES_TEXT, TRANSIT_WORKING_DAYS } from "@/data/shippingZones";

function InfoItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <span className="text-muted-foreground text-sm">{text}</span>
    </li>
  );
}

/**
 * Checkout-accurate shipping lines, read from shippingZones.ts — the same source the cart,
 * checkout, Razorpay order, JSON-LD handlingTime and Merchant feed shipping use. Zones are
 * described by PIN-code prefix (FREE_DELIVERY_PIN_PREFIXES_TEXT, how checkout assigns them),
 * never by distance.
 */
const DISPATCH = `${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`;

/**
 * Lines shown in EVERY mode. The modal used to promise "GPS shipment tracking provided for all
 * orders", a "Damage-free guarantee (damaged items replaced or refunded)" and installation
 * durations ("1–2 days", "1 day", "Same day"); the owner marked all three unverified (2026-10-19).
 * Tracking is now an offer to give status updates; transit damage states the published process
 * (Refund & Cancellation Policy §7 / Shipping & Delivery policy: report within 48 hours with
 * photographs; once confirmed in transit, repair at no cost, replace the affected components or
 * agree compensation); the installation steps keep their order but no longer promise durations.
 */
const SHIPMENT_UPDATES = "Ask our team for shipment status updates once your order is dispatched";
const TRANSIT_DAMAGE =
  "Damage in transit: tell us within 48 hours of delivery, with photographs. Once our team confirms it, we repair the unit at no cost, replace the affected components or agree compensation, as set out in our Refund & Cancellation Policy";
const INSTALLATION_STEPS = [
  { step: "1", title: "Site Preparation", time: "Completed before delivery" },
  { step: "2", title: "Delivery & Setup", time: "On the scheduled date" },
  { step: "3", title: "Final Inspection", time: "At handover" },
];

/**
 * `showWarranty` (default true) hides the Warranty tab for a product whose warranty terms the
 * owner has not confirmed — the structural term depends on the cabin's material, so the policy
 * table cannot be shown as applying to it. Omitted = the three-tab modal every page had before.
 *
 * `transportAtCheckout` (default false) is set for a product that is bought online, where
 * checkout prices transport by PIN-code zone before payment and the dispatch window is the
 * fixed DISPATCH_WORKING_DAYS. The generic lines ("within a 50 km radius", "confirmed in your
 * written quotation", "7–14 working days", "express 3–7 working days") contradicted that, so
 * they are replaced with the checkout terms. Enquiry-only callers (rentals, quote-only products)
 * omit it and keep the original quotation wording, which is accurate for them.
 */
export function ShippingDeliveryModal({
  showWarranty = true,
  transportAtCheckout = false,
}: { showWarranty?: boolean; transportAtCheckout?: boolean } = {}) {
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
          <TabsList className={`grid w-full ${showWarranty ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="shipping" className="text-xs sm:text-sm">🚚 Shipping</TabsTrigger>
            {showWarranty && (
              <TabsTrigger value="warranty" className="text-xs sm:text-sm">📦 Warranty</TabsTrigger>
            )}
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
                  {transportAtCheckout ? (
                    <ul className="space-y-3">
                      <InfoItem icon={CheckCircle2} text={`Free delivery to PIN codes beginning ${FREE_DELIVERY_PIN_PREFIXES_TEXT}`} />
                      <InfoItem icon={MapPin} text="Other PIN codes: transport is charged by delivery zone and shown at checkout before you pay" />
                      <InfoItem icon={CheckCircle2} text="Need it sooner? Ask our team before you order — express delivery is not a checkout option" />
                      <InfoItem icon={Wrench} text="Professional installation available upon request" />
                    </ul>
                  ) : (
                    <ul className="space-y-3">
                      <InfoItem icon={CheckCircle2} text={`Free delivery to PIN codes beginning ${FREE_DELIVERY_PIN_PREFIXES_TEXT}`} />
                      <InfoItem icon={MapPin} text="Other PIN codes: transport is charged by delivery zone — confirmed in your written quotation" />
                      <InfoItem icon={CheckCircle2} text="Need it sooner? Ask our team before you order" />
                      <InfoItem icon={Wrench} text="Professional installation available upon request" />
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delivery-time">
                <AccordionTrigger className="font-semibold">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" /> Delivery Time
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {transportAtCheckout ? (
                    <ul className="space-y-3">
                      <InfoItem icon={CalendarDays} text={`Dispatched within ${DISPATCH}, then ${TRANSIT_WORKING_DAYS.min}–${TRANSIT_WORKING_DAYS.max} working days in transit, depending on your delivery zone`} />
                      <InfoItem icon={MapPin} text={SHIPMENT_UPDATES} />
                    </ul>
                  ) : (
                    <ul className="space-y-3">
                      <InfoItem icon={CalendarDays} text="Delivery timeline: set out in your written quotation" />
                      <InfoItem icon={MapPin} text={SHIPMENT_UPDATES} />
                    </ul>
                  )}
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
                    <InfoItem icon={CheckCircle2} text={TRANSIT_DAMAGE} />
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Warranty Tab */}
          {showWarranty && (
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
                  <InfoItem icon={CheckCircle2} text="Leakage: 1 year" />
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
          )}

          {/* Installation Tab */}
          <TabsContent value="installation">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4 text-accent" /> Installation Steps
              </h4>
              <div className="grid gap-3">
                {INSTALLATION_STEPS.map((item) => (
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
                {transportAtCheckout ? (
                  <ul className="space-y-2">
                    <InfoItem icon={CalendarDays} text={`After you place the order, it is dispatched within ${DISPATCH}`} />
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    <InfoItem icon={CalendarDays} text="The manufacturing timeline is set out in your written quotation" />
                  </ul>
                )}
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
                  <InfoItem
                    icon={MapPin}
                    text={transportAtCheckout ? "Transport for your PIN code is shown at checkout before you pay" : "Transport outside the free delivery zone is confirmed in your written quotation"}
                  />
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
