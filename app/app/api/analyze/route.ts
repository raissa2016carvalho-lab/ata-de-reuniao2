import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json({ actions: [], error: "Transcrição vazia" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'Você é um assistente especializado em análise de atas de reunião de segurança. Extraia APENAS ações concretas e específicas. Retorne JSON válido: {"actions": []}. Máx 10 palavras.',
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const raw =
      completion.choices[0].message.content?.replace(/```json|```/g, "") || "{}";

    return NextResponse.json(JSON.parse(raw));
  } catch (e) {
    return NextResponse.json(
      { actions: [], error: "Erro ao analisar transcrição" },
      { status: 500 }
    );
  }
}
