import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Metodă nepermisă" }),
    };
  }

  if (!GEMINI_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Cheia API pentru Gemini nu este configurată pe server." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const prompt = body.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Parametrul 'prompt' lipsește din cerere." }),
      };
    }

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
      },
       safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    const url = `${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`;
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Eroare Gemini API:", errorText);
      return {
        statusCode: geminiRes.status,
        body: JSON.stringify({ error: `Eroare la apelul Gemini API: ${errorText}` }),
      };
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return {
      statusCode: 200,
      body: JSON.stringify({ text: text.trim() }),
    };

  } catch (e: any) {
    console.error("Eroare în funcția Netlify:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || "Eroare internă de server" }),
    };
  }
};

export { handler };