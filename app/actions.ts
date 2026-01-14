"use server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// Função auxiliar para normalizar texto para comparação
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ')    // Normaliza espaços
    .trim();
}

// Função auxiliar para verificar similaridade semântica
function areSimilarActions(action1: string, action2: string): boolean {
  const norm1 = normalizeForComparison(action1);
  const norm2 = normalizeForComparison(action2);
  
  // Se são idênticas após normalização
  if (norm1 === norm2) return true;
  
  // Se uma contém a outra (mais de 80% de overlap)
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  const commonWords = words1.filter(w => words2.includes(w));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);
  
  return similarity > 0.8;
}

// Função para remover duplicatas semânticas
function removeSimilarDuplicates(actions: string[]): string[] {
  const unique: string[] = [];
  
  for (const action of actions) {
    const isDuplicate = unique.some(existing => 
      areSimilarActions(action, existing)
    );
    
    if (!isDuplicate) {
      unique.push(action);
    } else {
      // Se for duplicata, mantém a versão mais completa
      const existingIndex = unique.findIndex(existing => 
        areSimilarActions(action, existing)
      );
      if (existingIndex >= 0 && action.length > unique[existingIndex].length) {
        unique[existingIndex] = action;
      }
    }
  }
  
  return unique;
}

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
          content: `Você é um assistente corporativo especializado na análise de atas de reuniões.

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
- "anotar na nata"
- "anotar nata"
- "escrever na nata"
- "escreva na nata"
- "registrar na nata"
- "registre na nata"
- "adicionar na nata"
- "adicione na nata"
- "incluir na nata"
- "inclua na nata"
- "salvar na nata"
- "salve na nata"
- "gravar na nata"
- "grave na nata"
- "colocar na nata"
- "coloque na nata"
- "inserir na nata"
- "insira na nata"
- "ação para nata"
- "item para nata"
- "ponto de nata"
- "vai para nata"

════════════════════════════════════
LIMPEZA OBRIGATÓRIA DOS COMANDOS
════════════════════════════════════

CRÍTICO: Você DEVE REMOVER COMPLETAMENTE o comando de voz da ação final.

Exemplos:
❌ ERRADO: "anota aí ir para Bahia"
✅ CORRETO: "Ir para Bahia."

❌ ERRADO: "registrar na ata verificar extintores"
✅ CORRETO: "Verificar extintores."

════════════════════════════════════
DEDUPLICAÇÃO SEMÂNTICA RIGOROSA
════════════════════════════════════

MUITO IMPORTANTE: Se houver múltiplas menções da MESMA ação (mesmo com palavras diferentes), registre APENAS UMA VEZ.

Exemplos de DUPLICATAS que devem ser UNIFICADAS:

❌ NÃO FAZER ISSO:
- "Ir para Bahia"
- "Registrar que eu vou para Bahia"  
- "Ir para Bahia"
- "Que vou para Bahia"

✅ FAZER ISSO (apenas UMA ação):
- "Ir para Bahia."

Outro exemplo:

❌ NÃO FAZER ISSO:
- "Verificar extintores"
- "Checar os extintores"
- "Conferir extintores"

✅ FAZER ISSO (apenas UMA ação):
- "Verificar extintores."

════════════════════════════════════
FORMATAÇÃO OBRIGATÓRIA
════════════════════════════════════

TODA ação deve seguir este formato EXATO:

1. ✅ Começar com letra MAIÚSCULA
2. ✅ Terminar com ponto final (.)
3. ✅ Usar vírgulas quando houver múltiplas informações
4. ✅ Máximo 25 palavras

Exemplos corretos:
✅ "Verificar extintores do setor 3."
✅ "João: enviar relatório até sexta-feira."
✅ "Agendar reunião com equipe de segurança na próxima semana."

Exemplos ERRADOS:
❌ "verificar extintores" (sem maiúscula, sem ponto)
❌ "Verificar extintores" (sem ponto final)
❌ "verificar extintores." (sem maiúscula)

════════════════════════════════════
ESTRUTURA DE AÇÃO COMPLETA
════════════════════════════════════

Quando possível, inclua:

1. 👤 Responsável (se mencionado): "Nome: ação."
2. 🎯 O que fazer (verbo + complemento)
3. 📍 Onde (local/setor se mencionado)
4. ⏰ Quando (prazo se mencionado)

Exemplo completo:
"João: verificar extintores do setor 3, obra 5, até sexta-feira."

════════════════════════════════════
FORMATO DE SAÍDA
════════════════════════════════════

Retorne EXCLUSIVAMENTE um JSON válido:

{
  "actions": [
    "Ação 1.",
    "Ação 2.",
    "Ação 3."
  ]
}

IMPORTANTE:
- Cada ação DEVE terminar com ponto final
- Sem comandos de voz
- Sem duplicatas semânticas
- Máximo 25 palavras por ação

════════════════════════════════════
EXEMPLOS COMPLETOS
════════════════════════════════════

Entrada:
"João: anota aí ir para Bahia verificar obra nova."

Saída:
{
  "actions": [
    "João: ir para Bahia verificar obra nova."
  ]
}

---

Entrada:
"Maria: registrar na ata enviar relatório até amanhã."
"Pedro: também anota aí o relatório precisa ser enviado amanhã."

Saída (OBSERVE: só uma ação, pois são duplicatas):
{
  "actions": [
    "Maria: enviar relatório até amanhã."
  ]
}

---

Entrada:
"anote verificar extintores"
"também registra na ata conferir os extintores do setor 3"

Saída (OBSERVE: só uma ação, pois são duplicatas semânticas):
{
  "actions": [
    "Verificar extintores do setor 3."
  ]
}`,
        },
        {
          role: "user",
          content: `Analise esta transcrição e extraia TODAS as ações ÚNICAS (elimine duplicatas semânticas). 

IMPORTANTE: Se a mesma ação foi mencionada várias vezes com palavras diferentes, registre apenas UMA VEZ (a versão mais completa).

Transcrição:
${transcript}`,
        },
      ],
      temperature: 0.1, // Mais conservador para consistência
      max_tokens: 1500,
    });

    let responseText = completion.choices[0].message.content?.trim() || "";
    
    // Limpar markdown se houver
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const result = JSON.parse(responseText);
    
    // Validação e limpeza adicional no backend
    let cleanedActions = (result.actions || []).map((action: string) => {
      let cleaned = action.trim();
      
      // Lista de comandos para remover
      const commandsToRemove = [
        /^anotar na ata:?\s*/gi,
        /^anotar ata:?\s*/gi,
        /^escrever na ata:?\s*/gi,
        /^escreva na ata:?\s*/gi,
        /^anote aí:?\s*/gi,
        /^anota aí:?\s*/gi,
        /^registrar na ata:?\s*/gi,
        /^registre na ata:?\s*/gi,
        /^adicionar na ata:?\s*/gi,
        /^adicione na ata:?\s*/gi,
        /^incluir na ata:?\s*/gi,
        /^inclua na ata:?\s*/gi,
        /^salvar na ata:?\s*/gi,
        /^salve na ata:?\s*/gi,
        /^gravar na ata:?\s*/gi,
        /^grave na ata:?\s*/gi,
        /^colocar na ata:?\s*/gi,
        /^coloque na ata:?\s*/gi,
        /^inserir na ata:?\s*/gi,
        /^insira na ata:?\s*/gi,
        /^ação para ata:?\s*/gi,
        /^item para ata:?\s*/gi,
        /^ponto de ata:?\s*/gi,
        /^vai para ata:?\s*/gi,
        /^isso é ata:?\s*/gi,
        /^é ação:?\s*/gi,
        /^criar ação:?\s*/gi,
        /^nova ação:?\s*/gi,
        /^anote:?\s*/gi,
        /^que\s+/gi, // Remove "que" no início (ex: "que vou para Bahia")
        /^registrar\s+que\s+/gi, // Remove "registrar que"
      ];

      // Remover todos os comandos
      commandsToRemove.forEach(regex => {
        cleaned = cleaned.replace(regex, '');
      });

      // Garantir que começa com maiúscula
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }

      // Garantir que termina com ponto
      if (cleaned.length > 0 && !cleaned.endsWith('.')) {
        cleaned += '.';
      }

      return cleaned;
    }).filter((action: string) => action.length > 3);

    // Remover duplicatas semânticas (proteção extra)
    cleanedActions = removeSimilarDuplicates(cleanedActions);

    return { actions: cleanedActions };
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

// Função para formatar a transcrição completa
export async function formatTranscript(
  transcript: string,
): Promise<{ formattedText: string; error?: string }> {
  if (!transcript) {
    return { formattedText: "", error: "Transcrição não fornecida" };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um assistente especializado em formatar transcrições de reuniões.

MISSÃO:
Transformar uma transcrição bruta em um texto profissional e bem estruturado.

REGRAS:

1. 📝 PONTUAÇÃO
   - Adicione vírgulas, pontos finais, pontos de interrogação
   - Use dois-pontos para listas
   - Use ponto e vírgula para ideias relacionadas

2. 📋 PARÁGRAFOS
   - Crie parágrafos quando o assunto mudar
   - Máximo 4-5 frases por parágrafo
   - Linha em branco entre parágrafos

3. ✨ ESTRUTURA
   - Mantenha ordem cronológica
   - Agrupe falas sobre o mesmo tópico

4. 🚫 NÃO FAZER
   - Não invente informações
   - Não remova conteúdo importante
   - Não altere significado

SAÍDA: Apenas o texto formatado, sem JSON.`,
        },
        {
          role: "user",
          content: `Formate esta transcrição com pontuação, vírgulas, pontos e parágrafos:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const formattedText = completion.choices[0].message.content?.trim() || transcript;
    
    return { formattedText };
  } catch (error) {
    console.error("Erro ao formatar:", error);
    return {
      formattedText: transcript,
      error: "Erro ao formatar. Mantendo texto original.",
    };
  }
}
