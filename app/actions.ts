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

IMPORTANTE:
- Se NÃO houver um desses comandos, NÃO registre absolutamente NADA.
- Mesmo que a frase contenha uma ação clara, ela deve ser ignorada sem o comando.
- Nunca infira intenção. Apenas registre quando o comando for explícito.

════════════════════════════════════
LIMPEZA OBRIGATÓRIA DOS COMANDOS
════════════════════════════════════

Ao extrair a ação, você DEVE:

1. ❌ REMOVER COMPLETAMENTE o comando de voz da ação
   - NÃO inclua "anotar na ata", "anota aí", "registrar na ata", etc.
   - A ação final NÃO pode conter essas palavras-chave.
   - REMOVA também variações como "anote", "registre", "coloque na ata"

2. ✅ CAPTURAR APENAS o conteúdo da ação após o comando

Exemplos de limpeza:
┌─────────────────────────────────────────────────────────────────────┐
│ Entrada: "João: anota aí revisar os EPIs do setor 3 até sexta"     │
│ ❌ ERRADO: "anota aí revisar os EPIs do setor 3 até sexta"          │
│ ✅ CORRETO: "João: revisar os EPIs do setor 3 até sexta."           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Entrada: "Maria: registrar na ata enviar relatório até amanhã"     │
│ ❌ ERRADO: "registrar na ata enviar relatório até amanhã"           │
│ ✅ CORRETO: "Maria: enviar relatório até amanhã."                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Entrada: "isso é ata verificar extintores da obra 5"               │
│ ❌ ERRADO: "isso é ata verificar extintores da obra 5"              │
│ ✅ CORRETO: "Verificar extintores da obra 5."                       │
└─────────────────────────────────────────────────────────────────────┘

════════════════════════════════════
FORMATAÇÃO E ESTRUTURA
════════════════════════════════════

Cada ação deve ser:

1. 📝 BEM FORMATADA
   - Iniciar com letra MAIÚSCULA (ou nome próprio se houver responsável)
   - Terminar SEMPRE com ponto final (.)
   - Usar vírgulas quando apropriado para separar informações
   - Máximo de 25 palavras por ação

2. 🎯 CLARA E OBJETIVA
   - Verbo de ação + complemento
   - Se houver nome do responsável no início, manter: "Nome: verbo..."
   - Incluir prazo se mencionado
   - Incluir local/setor se mencionado

3. ✨ PROFISSIONAL
   - Texto coeso e natural
   - Sem comandos de voz
   - Sem redundâncias
   - Tom formal e direto

════════════════════════════════════
REGRAS DE CONTEÚDO
════════════════════════════════════

1. 🔁 NUNCA repetir ações
   - Se a mesma ação for marcada mais de uma vez, registre APENAS UMA VEZ
   - Sempre escolha a versão MAIS COMPLETA e CLARA

2. 👤 Responsáveis
   - Identifique o responsável SOMENTE se houver nome explícito ANTES do comando
   - Formato: "Nome: ação."
   - Nunca invente ou assuma nomes

3. ⏰ Prazos
   - Inclua prazos sempre que mencionados:
     "até sexta", "amanhã", "próxima semana", "até o fim do mês"

4. 📍 Local / Área
   - Inclua setor, estado, unidade, obra ou área sempre que citados

5. 🛠️ Verbos de ação obrigatórios
   - Priorize verbos como:
     revisar, verificar, enviar, agendar, atualizar, corrigir,
     solicitar, implementar, validar, acompanhar, conferir

6. 🧹 Limpeza total
   - Ignore conversas informais
   - Ignore comentários que não sejam ações
   - Ignore justificativas ou opiniões

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
EXEMPLOS COMPLETOS
════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│ Entrada:                                                            │
│ "João: precisamos revisar os EPIs do setor 3"                       │
│                                                                     │
│ Saída:                                                              │
│ {                                                                   │
│   "actions": []                                                     │
│ }                                                                   │
│                                                                     │
│ Motivo: Sem comando de voz                                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Entrada:                                                            │
│ "João: anota aí revisar os EPIs do setor 3 até sexta"              │
│                                                                     │
│ Saída:                                                              │
│ {                                                                   │
│   "actions": [                                                      │
│     "João: revisar EPIs do setor 3 até sexta."                     │
│   ]                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Entrada:                                                            │
│ "Maria: isso é ata agendar treinamento de NR35 para próxima semana"│
│                                                                     │
│ Saída:                                                              │
│ {                                                                   │
│   "actions": [                                                      │
│     "Maria: agendar treinamento de NR35 para próxima semana."      │
│   ]                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Entrada:                                                            │
│ "Carlos: registrar na ata verificar extintores obra 5 e sala 12"   │
│                                                                     │
│ Saída:                                                              │
│ {                                                                   │
│   "actions": [                                                      │
│     "Carlos: verificar extintores da obra 5 e sala 12."            │
│   ]                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Entrada:                                                            │
│ "anote enviar relatório semanal até amanhã"                        │
│                                                                     │
│ Saída:                                                              │
│ {                                                                   │
│   "actions": [                                                      │
│     "Enviar relatório semanal até amanhã."                         │
│   ]                                                                 │
│ }                                                                   │
│                                                                     │
│ Observação: Sem responsável identificado, inicia com maiúscula     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Entrada:                                                            │
│ "João: anota aí revisar EPIs setor 3"                              │
│ "Maria: também registra na ata revisar EPIs setor 3"               │
│                                                                     │
│ Saída:                                                              │
│ {                                                                   │
│   "actions": [                                                      │
│     "João: revisar EPIs do setor 3."                               │
│   ]                                                                 │
│ }                                                                   │
│                                                                     │
│ Observação: Ações duplicadas registradas apenas uma vez            │
└─────────────────────────────────────────────────────────────────────┘

════════════════════════════════════
CHECKLIST FINAL ANTES DE RETORNAR
════════════════════════════════════

Para cada ação extraída, verifique:

☑️ Removeu completamente o comando de voz?
☑️ Começa com letra maiúscula (ou nome próprio)?
☑️ Termina com ponto final?
☑️ Tem vírgulas onde necessário?
☑️ Está clara e objetiva?
☑️ Não está duplicada?
☑️ Tem no máximo 25 palavras?
☑️ Inclui prazo (se mencionado)?
☑️ Inclui local/setor (se mencionado)?
☑️ Está em formato JSON válido?`,
        },
        {
          role: "user",
          content: `Analise esta transcrição e extraia TODAS as ações ÚNICAS (sem repetições), já formatadas e SEM os comandos de voz:\n\n${transcript}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    let responseText = completion.choices[0].message.content?.trim() || "";
    
    // Limpar markdown se houver
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const result = JSON.parse(responseText);
    
    // Validação e limpeza adicional no backend (segurança extra)
    const cleanedActions = (result.actions || []).map((action: string) => {
      let cleaned = action.trim();
      
      // Lista de comandos para remover (caso a IA não tenha removido)
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
    }).filter((action: string) => action.length > 3); // Filtrar ações muito curtas

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

// Nova função para formatar a transcrição completa com parágrafos e pontuação
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
Transformar uma transcrição bruta em um texto profissional, bem estruturado e legível.

REGRAS DE FORMATAÇÃO:

1. 📝 PONTUAÇÃO
   - Adicione vírgulas, pontos finais, pontos de interrogação onde apropriado
   - Use dois-pontos (:) para introduzir listas ou explicações
   - Use ponto e vírgula (;) para separar ideias relacionadas

2. 📋 PARÁGRAFOS
   - Crie parágrafos lógicos quando o assunto mudar
   - Máximo de 4-5 frases por parágrafo
   - Deixe uma linha em branco entre parágrafos

3. ✨ ESTRUTURA
   - Mantenha a ordem cronológica da conversa
   - Agrupe falas sobre o mesmo tópico
   - Identifique mudanças de assunto

4. 🎯 CLAREZA
   - Corrija erros óbvios de transcrição (mas mantenha o conteúdo)
   - Transforme fragmentos em frases completas
   - Mantenha o significado original

5. 👤 SPEAKERS
   - Se houver nomes mencionados, mantenha o formato "Nome: fala"
   - Se não houver identificação, apenas formate o texto

6. 🚫 O QUE NÃO FAZER
   - Não invente informações
   - Não remova conteúdo importante
   - Não altere o significado
   - Não adicione interpretações

FORMATO DE SAÍDA:
Retorne apenas o texto formatado, sem JSON, sem marcações especiais.`,
        },
        {
          role: "user",
          content: `Formate esta transcrição adicionando pontuação, vírgulas, pontos finais e estruturando em parágrafos:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const formattedText = completion.choices[0].message.content?.trim() || transcript;
    
    return { formattedText };
  } catch (error) {
    console.error("Erro ao formatar transcrição:", error);
    return {
      formattedText: transcript,
      error: "Erro ao formatar. Mantendo texto original.",
    };
  }
}
