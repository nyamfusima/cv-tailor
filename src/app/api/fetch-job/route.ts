import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Use Jina AI Reader to extract clean text from any URL
    const jinaUrl = `https://r.jina.ai/${url}`;

    const response = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "text",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch job description from URL");
    }

    const text = await response.text();

    // Clean up the text — remove excessive whitespace
    const cleaned = text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s{3,}/g, " ")
      .trim();

    if (cleaned.length < 100) {
      throw new Error("Could not extract enough content from this URL. Try copying the job description manually.");
    }

    return NextResponse.json({ text: cleaned });
  } catch (err: any) {
    console.error("Fetch job error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch job description." },
      { status: 500 }
    );
  }
}