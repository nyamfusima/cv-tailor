"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { TailoredCV } from "@/lib/types";

interface CoverLetter {
  subject: string;
  greeting: string;
  paragraphs: string[];
  sign_off: string;
  name: string;
}

const letterStyles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
    fontFamily: "Times-Roman",
    lineHeight: 1.6,
    color: "#0f172a",
  },
  subject: {
    fontSize: 12,
    marginBottom: 16,
    fontFamily: "Times-Bold",
  },
  paragraph: {
    marginBottom: 12,
  },
  signOff: {
    marginTop: 8,
  },
  name: {
    marginTop: 4,
    fontFamily: "Times-Bold",
  },
});

function CoverLetterDoc({ letter }: { letter: CoverLetter }) {
  return (
    <Document>
      <Page size="A4" style={letterStyles.page}>
        <Text style={letterStyles.subject}>{letter.subject}</Text>
        <Text style={letterStyles.paragraph}>{letter.greeting}</Text>
        {letter.paragraphs.map((p, i) => (
          <Text key={i} style={letterStyles.paragraph}>
            {p}
          </Text>
        ))}
        <View style={letterStyles.signOff}>
          <Text>{letter.sign_off}</Text>
          <Text style={letterStyles.name}>{letter.name}</Text>
        </View>
      </Page>
    </Document>
  );
}

export default function CoverLetterPage() {
  const router = useRouter();
  const [cv, setCV] = useState<TailoredCV | null>(null);
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("tailoredCV");
    const jd = sessionStorage.getItem("jobDescription");
    if (!stored) { router.push("/"); return; }
    const parsed = JSON.parse(stored);
    setCV(parsed);
    generate(parsed, jd || "");
  }, [router]);

  const generate = async (cvData: TailoredCV, jobDescription: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv: cvData, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setLetter(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!letter) return;
    const text = [letter.greeting, "", ...letter.paragraphs, "", letter.sign_off, letter.name].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateParagraph = (idx: number, value: string) => {
    if (!letter) return;
    setLetter({ ...letter, paragraphs: letter.paragraphs.map((p, i) => i === idx ? value : p) });
  };

  const handleDownload = async () => {
    if (!letter) return;
    setDownloading(true);
    try {
      const blob = await pdf(<CoverLetterDoc letter={letter} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = letter.name ? letter.name.replace(/\s+/g, "_") : "cover_letter";
      a.download = `${safeName}_Cover_Letter.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <svg className="animate-spin w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <p className="text-sm text-slate-400">Writing your cover letter...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={() => cv && generate(cv, sessionStorage.getItem("jobDescription") || "")} className="text-sm text-slate-600 underline">Try again</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/favicon.ico" alt="TailorCV" className="w-7 h-7" />
          <span className="font-semibold text-slate-800 tracking-tight">TailorCV</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
          >
            ← Back to CV
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-1">Cover Letter</h1>
            <p className="text-sm text-slate-400">Click any paragraph to edit. Copy when ready.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <button
              onClick={() => cv && generate(cv, sessionStorage.getItem("jobDescription") || "")}
              className="hidden sm:block text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-xl transition-colors"
            >
              ↺ Regenerate
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-slate-700 font-semibold px-4 sm:px-5 py-2.5 rounded-xl transition-all text-sm flex items-center gap-2 border border-slate-200 bg-white hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5 5-5M12 15V3" />
              </svg>
              {downloading ? "Preparing..." : "Download"}
            </button>
            <button
              onClick={handleCopy}
              className="text-white font-semibold px-4 sm:px-5 py-2.5 rounded-xl transition-all text-sm flex items-center gap-2"
              style={{ backgroundColor: copied ? "#10b981" : "#0d1f3c" }}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy text
                </>
              )}
            </button>
          </div>
        </div>

        {letter && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 sm:px-10 py-6 border-b border-slate-100" style={{ backgroundColor: "#0d1f3c" }}>
              <p className="text-xs text-blue-300 uppercase tracking-widest mb-1">Subject</p>
              <p className="text-white font-medium text-sm">{letter.subject}</p>
            </div>

            <div className="bg-blue-50 border-b border-blue-100 px-6 sm:px-10 py-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-xs text-blue-500 font-medium">Click any paragraph to edit it directly.</p>
            </div>

            <div className="px-6 sm:px-10 py-8 space-y-5 font-serif">
              <p className="text-sm text-slate-700">{letter.greeting}</p>

              {letter.paragraphs.map((para, i) => (
                <div key={i} onClick={() => setEditingIdx(editingIdx === i ? null : i)}>
                  {editingIdx === i ? (
                    <textarea
                      autoFocus
                      value={para}
                      onChange={(e) => updateParagraph(i, e.target.value)}
                      onBlur={() => setEditingIdx(null)}
                      className="w-full text-sm text-slate-700 leading-relaxed border border-indigo-400 rounded-xl px-4 py-3 outline-none bg-white shadow-sm focus:ring-2 focus:ring-indigo-300 resize-none"
                      rows={6}
                    />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed cursor-pointer hover:bg-slate-50 rounded-xl px-4 py-3 -mx-4 transition-colors border border-transparent hover:border-slate-200">
                      {para}
                    </p>
                  )}
                </div>
              ))}

              <div className="pt-2">
                <p className="text-sm text-slate-700">{letter.sign_off}</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{letter.name}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-start">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium"
          >
            ← Tailor another CV
          </button>
        </div>
      </main>
    </div>
  );
}
