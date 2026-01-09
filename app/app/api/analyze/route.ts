import OpenAI from "openai";
import { NextResponse } from "next/server";

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
        { actions: [], error: "Chave da OpenAI não configurada" },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'Extraia APENAS ações concretas e específicas. Retorne JSON válido: {"actions":["ação 1"]}',
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    let text = completion.choices[0].message.content || "";
    text = text.replace(/```json|```/g, "").trim();

    const result = JSON.parse(text);

    return NextResponse.json({ actions: result.actions || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { actions: [], error: "Erro ao analisar transcrição" },
      { status: 500 }
    );
  }
}
