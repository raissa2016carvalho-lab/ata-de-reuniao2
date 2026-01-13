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
          content: `Você é um assistente especializado em análise de atas de reunião de segurança do trabalho. eu preciso que voce so anote depois que dar o comando e as palavras apoos
          o comando

MISSÃO: Extrair APENAS ações únicas e concretas mencionadas na reunião, SEM REPETIÇÕES.

REGRAS OBRIGATÓRIAS:
1. NUNCA repita a mesma ação - se uma ação já foi mencionada, NÃO inclua novamente
2. SEMPRE identifique quem falou quando houver "Nome:" no texto (ex: "João: fazer relatório")
3. MANTENHA o máximo de contexto possível (até 20 palavras por ação)
4. Capture ações explícitas ("preciso fazer", "vou enviar", "tem que revisar")
5. Inclua prazos quando mencionados ("até sexta", "amanhã", "próxima semana")
6. Inclua áreas/locais quando relevantes ("no setor 3", "do Ceará", "na obra")
7. NÃO ignore verbos de ação: fazer, enviar, revisar, verificar, solicitar, agendar, atualizar, corrigir
8. Capture compromissos mesmo sem verbo explícito (ex: "relatório para amanhã" → "Enviar relatório para amanhã")
9. NÃO registre palavrões ou conversas casuais
10. Se houver múltiplas menções à mesma ação, inclua APENAS UMA VEZ a versão mais completa

FILTRO DE DUPLICATAS:
- "Enviar relatório" e "João vai enviar o relatório" = MESMA AÇÃO (escolha a mais completa)
- "Revisar EPIs" mencionado 3 vezes = REGISTRE APENAS UMA VEZ
- Compare o significado, não só as palavras exatas

FORMATO DE SAÍDA:
Retorne APENAS um JSON válido: {"actions": ["ação 1", "ação 2", "ação 3"]}

EXEMPLOS:

Entrada: "João: preciso enviar o relatório do Ceará até sexta. Maria: também vou enviar um relatório"
Saída: {"actions": ["João: enviar relatório do Ceará até sexta", "Maria: enviar relatório"]}

Entrada: "Falta revisar os EPIs. Precisamos revisar os EPIs do setor 3. A revisão dos EPIs é urgente"
Saída: {"actions": ["Revisar EPIs do setor 3"]}

Entrada: "Maria vai agendar treinamento de NR35 para próxima semana"
Saída: {"actions": ["Maria: agendar treinamento de NR35 para próxima semana"]}`,
        },
        {
          role: "user",
          content: `Analise esta transcrição e extraia TODAS as ações ÚNICAS (sem repetições):\n\n${transcript}`,
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
