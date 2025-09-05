// src/lib/gemini.ts
// Read Gemini API key from Environment Variables (Vite):
// - Local:   .env → VITE_GEMINI_API_KEY=xxx
// - Netlify: Site settings → Environment variables → VITE_GEMINI_API_KEY
// Do NOT hardcode secrets in code.

export const GEMINI_API_KEY: string | undefined = (import.meta as any)?.env?.VITE_GEMINI_API_KEY;

export function requireGeminiKey(): string {
  if (!GEMINI_API_KEY || typeof GEMINI_API_KEY !== "string" || GEMINI_API_KEY.trim() === "") {
    throw new Error(
      "Missing Gemini API key. Set VITE_GEMINI_API_KEY in your .env (local) and in Netlify Environment Variables."
    );
  }
  return GEMINI_API_KEY;
}

// Optional helpers: if you use @google/generative-ai, you can expose a lazy client.
// Uncomment after installing the SDK with:  npm i @google/generative-ai
/*
import { GoogleGenerativeAI } from "@google/generative-ai";
let _client: GoogleGenerativeAI | null = null;
export function geminiClient() {
  if (!_client) _client = new GoogleGenerativeAI(requireGeminiKey());
  return _client;
}
*/
