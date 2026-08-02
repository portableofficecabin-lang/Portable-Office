"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CalendarRange, RotateCcw } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/**
 * "Help Me Decide" — the 3-question buy-vs-rent helper promised by the Still-unsure band.
 * Pure client-side scoring (no network): each answer pushes toward purchase or rental, ties go to
 * "contact us" because a genuinely split brief needs a human. The recommendation links straight to
 * the matching CTA (/products, /rental-service or /contact) so the dialog ends in an action.
 */

interface Question {
  id: string;
  title: string;
  options: { label: string; hint: string; score: number }[]; // +1 → purchase, −1 → rental
}

const QUESTIONS: Question[] = [
  {
    id: "duration",
    title: "How long will you use the cabin?",
    options: [
      { label: "Under 12 months", hint: "Short project or one season", score: -1 },
      { label: "1–3 years", hint: "Medium-term project", score: 0 },
      { label: "3+ years / permanent", hint: "Long-term or permanent site", score: 1 },
    ],
  },
  {
    id: "budget",
    title: "How do you prefer to pay?",
    options: [
      { label: "Small monthly outgo", hint: "Keep upfront cash free", score: -1 },
      { label: "One-time investment", hint: "Own the asset outright", score: 1 },
    ],
  },
  {
    id: "custom",
    title: "How custom does it need to be?",
    options: [
      { label: "Standard layout is fine", hint: "Ready sizes and finishes", score: -1 },
      { label: "Fully customised", hint: "My layout, sizes and interiors", score: 1 },
    ],
  },
];

type Answers = Record<string, number | undefined>;

export function BuyOrRentHelper() {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});

  const answeredAll = QUESTIONS.every((q) => answers[q.id] !== undefined);
  const score = useMemo(
    () => QUESTIONS.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0),
    [answers],
  );

  const verdict = !answeredAll
    ? null
    : score > 0
      ? {
          tone: "#2563EB",
          bg: "#F7FAFF",
          border: "#BFD5F6",
          icon: Building2,
          title: "Purchase fits your project best",
          body: "A long-term, customised or permanent requirement pays back ownership quickly — and the cabin stays yours to reuse or resell.",
          cta: { href: "/products", label: "Explore Cabins to Buy" },
        }
      : score < 0
        ? {
            tone: "#EA580C",
            bg: "#FFF9F4",
            border: "#F6CDAF",
            icon: CalendarRange,
            title: "Rental fits your project best",
            body: "For a shorter project with standard layouts, renting keeps your upfront cost low and the cabin goes back when the job is done.",
            cta: { href: "/rental-service", label: "View Rental Cabins" },
          }
        : {
            tone: "#16A34A",
            bg: "#F2FBF5",
            border: "#BBE5C8",
            icon: CalendarRange,
            title: "It's a close call — let's price both",
            body: "Your brief sits right between buying and renting. Share the details and our team will help you compare both options with real numbers.",
            cta: { href: "/contact", label: "Contact Us" },
          };

  const reset = () => setAnswers({});

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
        >
          Help Me Decide <ArrowRight className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="light max-h-[85vh] overflow-y-auto border-slate-200 bg-white text-slate-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-slate-900">Buy or rent — 3 quick questions</DialogTitle>
          <DialogDescription className="text-slate-500">
            Pick one answer per question; the recommendation updates instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {QUESTIONS.map((q, qi) => (
            <fieldset key={q.id}>
              <legend className="mb-2 font-semibold text-slate-800">
                {qi + 1}. {q.title}
              </legend>
              <div className="grid gap-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.score;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.score }))}
                      className={`rounded-lg border-2 px-3.5 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-[#2563EB] bg-[#F7FAFF]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="block font-medium text-slate-800">{opt.label}</span>
                      <span className="block text-sm text-slate-500">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {verdict && (
            <div
              className="rounded-xl border-2 p-4"
              style={{ background: verdict.bg, borderColor: verdict.border }}
            >
              <div className="mb-1 flex items-center gap-2 font-display text-lg font-bold" style={{ color: verdict.tone }}>
                <verdict.icon className="h-5 w-5" /> {verdict.title}
              </div>
              <p className="mb-3 text-sm text-slate-600">{verdict.body}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={verdict.cta.href}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white"
                  style={{ background: verdict.tone }}
                  onClick={() => setOpen(false)}
                >
                  {verdict.cta.label} <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
