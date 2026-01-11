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
          content: `Você é um assistente especializado em análise de atas de reunião de segurança do trabalho.

MISSÃO: Extrair TODAS as ações concretas, tarefas, compromissos e responsabilidades mencionadas na reunião.

REGRAS OBRIGATÓRIAS:
1. SEMPRE identifique quem falou quando houver "Nome:" no texto (ex: "João: fazer relatório" → "João: fazer relatório")
2. MANTENHA o máximo de contexto possível (até 20 palavras por ação)
3. Capture ações explícitas ("preciso fazer", "vou enviar", "tem que revisar") e implícitas ("falta revisar", "pendente o envio")
4. Inclua prazos quando mencionados ("até sexta", "amanhã", "próxima semana")
5. Inclua áreas/locais quando relevantes ("no setor 3", "do Ceará", "na obra")
6. NÃO ignore verbos de ação: fazer, enviar, revisar, verificar, solicitar, agendar, atualizar, corrigir, etc.
7. Capture compromissos mesmo sem verbo explícito (ex: "relatório de segurança para amanhã" → "Enviar relatório de segurança para amanhã")
8. Não registrar palavrões

FORMATO DE SAÍDA:
Retorne APENAS um JSON válido: {"actions": ["ação 1", "ação 2", "ação 3"]}

EXEMPLOS:
Entrada: "João: preciso enviar o relatório de inspeção do Ceará até sexta-feira"
Saída: {"actions": ["João: enviar relatório de inspeção do Ceará até sexta-feira"]}

Entrada: "falta revisar os EPIs do setor 3 e atualizar a planilha"
Saída: {"actions": ["Revisar EPIs do setor 3", "Atualizar planilha"]}

Entrada: "Maria vai agendar treinamento de NR35 para próxima semana"
Saída: {"actions": ["Maria: agendar treinamento de NR35 para próxima semana"]}`,
        },
        {
          role: "user",
          content: `Analise esta transcrição e extraia TODAS as ações:\n\n${transcript}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
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
