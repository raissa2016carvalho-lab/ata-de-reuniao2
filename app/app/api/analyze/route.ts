import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json(
        { actions: [], error: "Transcrição não fornecida" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { actions: [], error: "Chave da API OpenAI não configurada" },
        { status: 500 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            'Você é um assistente especializado em análise de atas de reunião de segurança. Extraia APENAS ações concretas e específicas. Retorne JSON no formato {"actions": ["ação 1"]}. Máx 10 palavras.',
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    const text =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "";

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({
      actions: parsed.actions || [],
    });
  } catch (error) {
    console.error("Erro API:", error);
    return NextResponse.json(
      { actions: [], error: "Erro ao processar transcrição" },
      { status: 500 }
    );
  }
}
