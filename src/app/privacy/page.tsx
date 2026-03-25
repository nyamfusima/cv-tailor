import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="border-b border-slate-100 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="font-semibold text-slate-800 tracking-tight">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-5 h-5" />
          <span className="font-semibold text-slate-800 tracking-tight">tailor.ai</span>
        </Link>
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Back</Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-4xl text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-slate-600 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">1. Information We Collect</h2>
            <p>We collect the following information when you use myCVtailor.ai:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your email address and name (via Google Sign-In)</li>
              <li>Credit balance and usage history</li>
              <li>CV and job description content — processed in real time only, never stored</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and improve the Service</li>
              <li>To manage your account and credit balance</li>
              <li>To process payments</li>
              <li>To send important service updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">3. CV and Job Description Data</h2>
            <p>Your CV and job description content is sent to our AI provider (Anthropic) for processing and is immediately discarded after your tailored CV is generated. We do not store, sell, or use your CV content for any other purpose.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">4. Third Party Services</h2>
            <p>We use the following third party services:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase</strong> — authentication and user data storage</li>
              <li><strong>Anthropic</strong> — AI processing of CV content</li>
              <li><strong>Vercel</strong> — hosting and analytics</li>
              <li><strong>Paddle</strong> — payment processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">5. Data Storage</h2>
            <p>Your account data (email, credit balance) is stored securely in Supabase with row-level security. Your CV content is never stored — it is processed in memory and immediately discarded.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">6. Cookies</h2>
            <p>We use cookies only for authentication purposes to keep you signed in. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. To delete your account and all associated data, contact us at <a href="mailto:nyamfusima@gmail.com" className="underline" style={{ color: "#0d1f3c" }}>nyamfusima@gmail.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">8. Contact</h2>
            <p>For any privacy questions, contact us at <a href="mailto:nyamfusima@gmail.com" className="underline" style={{ color: "#0d1f3c" }}>nyamfusima@gmail.com</a></p>
          </section>

        </div>
      </main>

      <footer className="border-t border-slate-100 px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 mt-8">
        <div className="flex items-center">
          <span className="text-sm text-slate-400">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-4 h-4" />
          <span className="text-sm text-slate-400">tailor.ai</span>
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