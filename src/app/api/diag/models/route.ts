import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment" }, { status: 500 });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message, details: data.error }, { status: 500 });
    }

    const supportedModels = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
      .map((m: any) => ({
        name: m.name,
        displayName: m.displayName,
      }));

    return NextResponse.json({ 
      source: "Production Vercel Discovery",
      apiKeyPresent: true,
      models: supportedModels 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
