"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function analyzeTranscript(
  transcript: string,
): Promise<{ actions: string[]; error?: string }> {
  if (!transcript) {
    return { actions: [], error: "Transcrição não fornecida" };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'Você é um assistente especializado em análise de atas de reunião de segurança. Extraia APENAS ações concretas e específicas que precisam ser executadas. Retorne um JSON válido no formato: {"actions": ["ação 1", "ação 2"]}. Seja conciso (máximo 10 palavras por ação).',
        },
        {
          role: "user",
          content: `Analise esta transcrição e extraia as ações:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    let responseText = completion.choices[0].message.content?.trim() || "";
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const result = JSON.parse(responseText);
    return { actions: result.actions || [] };
  } catch (error) {
    console.error("Erro ao analisar:", error);
    return {
      actions: [],
      error:
        error instanceof Error
          ? error.message
          : "Erro ao processar transcrição",
    };
  }
}
