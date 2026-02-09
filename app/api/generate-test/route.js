import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req) {
  try {
    const body = await req.json();
    const { lectureText, godmode } = body;

    // Only godmode users can generate tests
    if (godmode !== true) {
      return NextResponse.json(
        { error: "Unauthorized. Godmode required." },
        { status: 403 }
      );
    }

    if (!lectureText || lectureText.length < 50) {
      return NextResponse.json(
        { error: "Lecture text is too short. Please provide more content." },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    // Rate limit even for godmode (prevent abuse)
    if (!rateLimit(ip, 5, 60 * 1000)) {
        return NextResponse.json(
            { error: "Too many generation requests. Please wait a minute." },
            { status: 429 }
        );
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
    // Using gemini-2.5-flash as requested by user (same as ai-help)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are an expert exam creator.
    Generate a JSON object containing a multiple-choice test based on the following lecture content.
    
    The JSON structure MUST be EXACTLY as follows (options is an OBJECT with keys, NOT an array):
    {
      "test_questions": [
        {
          "question": "Question text here",
          "options": {
            "a": "Option A text",
            "b": "Option B text",
            "c": "Option C text",
            "d": "Option D text"
          },
          "correct_answer": "a"
        }
      ]
    }
    
    IMPORTANT RULES:
    - "options" MUST be an object with keys "a", "b", "c", "d" and string values. NOT an array.
    - Use "correct_answer" field (NOT "answer_id").
    - Each option value must be a plain string.
    - Create between 10 and 30 questions depending on the length and depth of the content.
    - Ensure questions are accurate and directly derived from the text.
    - Return ONLY the raw JSON, no markdown code blocks.
    
    Lecture Content:
    ${lectureText}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up markdown if present
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse AI response:", text);
        return NextResponse.json({ error: "AI generated invalid JSON. Please try again." }, { status: 500 });
    }

    if (!json.test_questions || !Array.isArray(json.test_questions)) {
       return NextResponse.json({ error: "AI generated invalid structure." }, { status: 500 });
    }

    // Normalize: fix if AI still returns array-style options or answer_id
    json.test_questions = json.test_questions.map(q => {
        // Fix options if array instead of object
        if (Array.isArray(q.options)) {
            const optObj = {};
            q.options.forEach((opt, i) => {
                const key = opt.id || String.fromCharCode(97 + i); // a, b, c, d...
                optObj[key] = typeof opt.text === 'string' ? opt.text : String(opt.text || opt);
            });
            q.options = optObj;
        }

        // Fix answer_id -> correct_answer
        if (q.answer_id && !q.correct_answer) {
            q.correct_answer = q.answer_id;
            delete q.answer_id;
        }

        return q;
    });

    return NextResponse.json({ success: true, content: json });

  } catch (error) {
    console.error("Generate error", error);
    return NextResponse.json({ error: "Failed to generate test: " + error.message }, { status: 500 });
  }
}
