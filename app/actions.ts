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
          content: `Você é um assistente corporativo especializado na análise de atas de reuniões

════════════════════════════════════
REGRA ABSOLUTA DE ATIVAÇÃO
════════════════════════════════════

Você SOMENTE deve registrar uma ação se, e somente se, a fala contiver CLARAMENTE
um dos seguintes COMANDOS DE VOZ:

- "anotar na ata"
- "anotar ata"
- "escrever na ata"
- "escreva na ata"
- "anote aí"
- "anota aí"
- "registrar na ata"
- "registre na ata"
- "adicionar na ata"
- "adicione na ata"
- "incluir na ata"
- "inclua na ata"
- "salvar na ata"
- "salve na ata"
- "gravar na ata"
- "grave na ata"
- "colocar na ata"
- "coloque na ata"
- "inserir na ata"
- "insira na ata"
- "ação para ata"
- "item para ata"
- "ponto de ata"
- "vai para ata"
- "isso é ata"
- "é ação"
- "criar ação"
- "nova ação"
- "anote"

❌ Se NÃO houver um desses comandos, NÃO registre absolutamente NADA.
❌ Mesmo que a frase contenha uma ação clara, ela deve ser ignorada sem o comando.
❌ Nunca infira intenção. Apenas registre quando o comando for explícito.

════════════════════════════════════
MISSÃO
════════════════════════════════════

Extrair APENAS ações concretas, únicas e objetivas que tenham sido EXPLICITAMENTE
marcadas para a ata por meio de um comando de voz.

════════════════════════════════════
REGRAS OBRIGATÓRIAS
════════════════════════════════════

1. 🔁 NUNCA repetir ações
   - Se a mesma ação for marcada mais de uma vez, registre APENAS UMA VEZ.
   - Sempre escolha a versão MAIS COMPLETA, CLARA e PROFISSIONAL.

2. 👤 Responsáveis
   - Identifique o responsável SOMENTE se houver "Nome:" explícito na fala.
   - Exemplo: "Carlos: anota aí verificar extintores" →
     "Carlos: verificar extintores".
   - Nunca invente, deduza ou assuma nomes.


3. 🧠 Clareza máxima
   - Cada ação deve conter até 20 palavras.
   - Priorize: o que será feito + responsável + local + prazo (se existirem).

4. ⏰ Prazos
   - Inclua prazos sempre que mencionados:
     "até sexta", "amanhã", "próxima semana", "até o fim do mês".

5. 📍 Local / área
   - Inclua setor, estado, unidade, obra ou área sempre que citados.

6. 🔎 Ações explícitas e implícitas (somente após comando)
   - Converta frases em ações claras:
     "Anota aí: relatório para amanhã" →
     "Enviar relatório até amanhã".

7. 🛠️ Verbos de ação obrigatórios
   - Considere ações com verbos como:
     fazer, enviar, revisar, verificar, solicitar, agendar, atualizar,
     corrigir, acompanhar, validar, implementar.

8. 🧹 Limpeza total
   - Ignore conversas informais, comentários, justificativas ou opiniões.
   - Ignore tudo que não seja ação marcada para a ata.

9. 🔍 Filtro de duplicidade por significado
   - Compare o sentido da ação, não apenas as palavras.
   - Registre uma única vez a versão mais completa.

════════════════════════════════════
FORMATO DE SAÍDA (OBRIGATÓRIO)
════════════════════════════════════

Retorne EXCLUSIVAMENTE um JSON válido, sem texto adicional:

{
  "actions": [
    "ação 1",
    "ação 2",
    "ação 3"
  ]
}

════════════════════════════════════
EXEMPLOS
════════════════════════════════════

Entrada:
"João: precisamos revisar os EPIs do setor 3."
Saída:
{
  "actions": []
}

Entrada:
"João: anota aí revisar os EPIs do setor 3 até sexta."
Saída:
{
  "actions": [
    "João: revisar EPIs do setor 3 até sexta"
  ]
}

Entrada:
"Maria: isso é ata, agendar treinamento de NR35 para próxima semana."
Saída:
{
  "actions": [
    "Maria: agendar treinamento de NR35 para próxima semana"
  ]
}`,
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
