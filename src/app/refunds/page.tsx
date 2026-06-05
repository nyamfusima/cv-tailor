import Link from "next/link";

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="font-semibold text-slate-800 tracking-tight">my</span>
          <img src="/favicon.ico" alt="myCVtailor.co.za" className="w-5 h-5" />
          <span className="font-semibold text-slate-800 tracking-tight">tailor.co.za</span>
        </Link>
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Back</Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-4xl font-semibold text-slate-900 mb-2">Refund Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-slate-600 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">7-Day Money Back Guarantee</h2>
            <p>We stand behind our product. If you are not satisfied with myCVtailor.co.za for any reason, we will give you a full refund within 7 days of your purchase — no questions asked.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">How to Request a Refund</h2>
            <p>Email us at <a href="mailto:nyamfusima@gmail.com" className="underline" style={{ color: "#0d1f3c" }}>nyamfusima@gmail.com</a> within 7 days of your purchase with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your account email address</li>
              <li>The date of purchase</li>
              <li>The plan you purchased</li>
            </ul>
            <p className="mt-3">We will process your refund within 3–5 business days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Partial Refunds</h2>
            <p>If you have used some of your credits, we may offer a partial refund proportional to the unused credits remaining on your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Non-Refundable Situations</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Refund requests made more than 7 days after purchase</li>
              <li>Accounts found to be in violation of our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Contact</h2>
            <p>Questions about refunds? Email us at <a href="mailto:nyamfusima@gmail.com" className="underline" style={{ color: "#0d1f3c" }}>nyamfusima@gmail.com</a></p>
          </section>

        </div>
      </main>

      <footer className="border-t border-slate-100 px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 mt-8">
        <div className="flex items-center">
          <span className="text-sm text-slate-400">my</span>
          <img src="/favicon.ico" alt="myCVtailor.co.za" className="w-4 h-4" />
          <span className="text-sm text-slate-400">tailor.co.za</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-slate-700">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-700">Privacy</Link>
          <Link href="/refunds" className="hover:text-slate-700">Refunds</Link>
        </div>
      </footer>
    </div>
  );
}
