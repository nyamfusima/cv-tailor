"use client"

import { motion } from "motion/react"

export default function PricingCreative() {
  return (
    <section className="relative flex flex-col items-center py-24">
      <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
        {/* Starter Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -6 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative z-10 w-72 rounded-2xl border border-sky-300/30 bg-slate-900/60 px-8 py-10 text-foreground shadow-[0_0_0_1px_rgba(125,211,252,.16)_inset] backdrop-blur-md transition-transform hover:scale-105"
        >
          <div className="mb-2 text-lg font-bold text-sky-200">Starter</div>
          <div className="mb-4 text-3xl font-extrabold text-white">$10</div>
          <ul className="mb-6 space-y-2 text-sm text-white/70">
            <li><span className="mr-2 text-emerald-400">✔</span>10 tailors</li>
            <li><span className="mr-2 text-emerald-400">✔</span>10 PDF downloads</li>
            <li><span className="mr-2 text-emerald-400">✔</span>Email support</li>
          </ul>
          <button className="w-full rounded-md bg-sky-300 py-2 font-semibold text-slate-900 hover:bg-sky-200 transition">
            Start now
          </button>
        </motion.div>

        {/* Creative Pro Card (Floating) */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotate: 0 }}
          animate={{ opacity: 1, y: -20, rotate: 0 }}
          transition={{ type: "spring", duration: 0.7 }}
          className="relative z-20 w-80 scale-110 rounded-3xl border-4 border-sky-200/60 bg-gradient-to-b from-[#0d1f3c] via-[#1a3a6b] to-[#2563eb] px-10 py-14 text-white shadow-xl transition-transform hover:scale-[1.12]"
        >
          <motion.div
            animate={{ y: [10, 6, 10] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-white/90 px-5 py-1 text-xs font-extrabold text-[#0d1f3c] shadow"
          >
            Best Deal
          </motion.div>
          <div className="mb-2 text-lg font-bold">Growth</div>
          <div className="mb-4 text-5xl font-black text-white">$20</div>
          <ul className="mb-6 space-y-2 text-base">
            <li><span className="mr-2 text-emerald-200">✔</span>Unlimited tailors</li>
            <li><span className="mr-2 text-emerald-200">✔</span>Unlimited PDF downloads</li>
            <li><span className="mr-2 text-emerald-200">✔</span>Priority support</li>
            <li><span className="mr-2 text-emerald-200">✔</span>Early feature access</li>
          </ul>
          <button className="w-full rounded-md bg-white py-2 font-bold text-slate-900 hover:bg-slate-100 transition">
            Choose growth
          </button>
        </motion.div>

        {/* Enterprise Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 6 }}
          animate={{ opacity: 1, y: 0, rotate: 6 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="relative z-10 w-72 rounded-2xl border border-sky-300/30 bg-slate-900/60 px-8 py-10 text-foreground shadow-[0_0_0_1px_rgba(125,211,252,.16)_inset] backdrop-blur-md transition-transform hover:scale-105"
        >
          <div className="mb-2 text-lg font-bold text-sky-200">Unlimited</div>
          <div className="mb-4 text-3xl font-extrabold text-white">Custom</div>
          <ul className="mb-6 space-y-2 text-sm text-white/70">
            <li><span className="mr-2 text-emerald-400">✔</span>Dedicated success partner</li>
            <li><span className="mr-2 text-emerald-400">✔</span>Team seats & SSO</li>
            <li><span className="mr-2 text-emerald-400">✔</span>Custom SLAs & onboarding</li>
          </ul>
          <button className="w-full rounded-md bg-sky-300 py-2 font-semibold text-slate-900 hover:bg-sky-200 transition">
            Talk to us
          </button>
        </motion.div>
      </div>
    </section>
  )
}
