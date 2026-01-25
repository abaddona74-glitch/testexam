import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";

export async function POST(req) {
  try {
    const ip = getClientIp(req);
    // Limit: 10 requests per minute
    if (!rateLimit(ip, 10, 60 * 1000)) {
        return NextResponse.json(
            { error: "Too many requests. Please wait a minute." },
            { status: 429 }
        );
    }

    const { question, options, recaptchaToken } = await req.json();

    // 1. Verify reCAPTCHA (if configured)
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaResult.success) {
       return NextResponse.json({ error: "Bot detected" }, { status: 403 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // User has access to Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are an expert tutor helping a student with a test.
    Analyze the following question and options. Provide a helpful explanation and identify the correct answer.
    
    Question: ${question}
    
    Options:
    ${options.map((o) => `- ${o.text} (ID: ${o.id})`).join("\n")}
    
    Please provide the response in this specific Markdown format:
    
    ### 🧠 Analysis
    [Brief explanation of the core concept]

    ### 🔍 Options Breakdown
    - **[Option Text]**: [Why it is correct or incorrect]
    - **[Option Text]**: [Why it is correct or incorrect]
    ...

    ### ✅ Correct Answer
    **[The correct option text]**
    
    Use bolding for key terms. Keep explanations concise.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate AI response", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
