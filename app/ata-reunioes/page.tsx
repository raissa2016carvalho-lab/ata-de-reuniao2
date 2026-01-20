"use client";

import { useState, useEffect, useRef } from "react";
import { analyzeTranscript } from "../actions";
import { supabase } from "@/lib/supabase";

const DEFAULT_AREAS = [
  "ALMOXARIFADO",
  "ALMOXARIFADO CLIENTE",
  "CONTRATOS",
  "COMPRAS",
  "FROTA",
  "FACILITIES",
  "RECURSOS HUMANOS/ DEPARTAMENTO PESSOAL",
  "OFICINA",
  "SALA TECNICA",
  "QUALIDADE/MEIO AMBIENTE",
  "MARKETING",
  "OPERAÇÃO",
  "PLANEJAMENTO",
  "SESMT",
  "CONVIDADO EXTERNO",
];

// ✅ COMANDO ÚNICO E ESPECÍFICO - SÓ ESTE CRIA AÇÕES
const VOICE_COMMANDS = [
  "preciso que registre em ata",
];

interface ChecklistItem {
  text: string;
  area: string;
  done: boolean;
}

interface PreviousActionItem {
  action: string;
  responsavel: string;
}

interface Participant {
  id: string;
  name: string;
  area: string;
}

export default function AtaReunioes() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [manualAction, setManualAction] = useState("");
  const [previousActions, setPreviousActions] = useState<PreviousActionItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantArea, setNewParticipantArea] = useState(DEFAULT_AREAS[0]);
  
  const [showPauta, setShowPauta] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  const [pautaItems, setPautaItems] = useState<string[]>([""]);
  
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // ✅ NOVO: Estados para edição de sugestões
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  
  // ✅ NOVO: Estado para visualização da transcrição
  const [showTranscript, setShowTranscript] = useState(false);

  const availableResponsibles = [
    ...participants.map(p => `${p.name} (${p.area})`),
    ...DEFAULT_AREAS
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "pt-BR";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalText = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcriptPiece + " ";
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          setLiveTranscript(interimTranscript);
          
          // ✅ ADICIONA TUDO NA TRANSCRIÇÃO (independente de ser ação)
          if (finalText) {
            setTranscript(prev => prev + finalText);
            
            // ✅ SÓ CAPTURA AÇÃO COM O COMANDO ESPECÍFICO
            const lowerText = finalText.toLowerCase();
            const commandFound = VOICE_COMMANDS.find(cmd => lowerText.includes(cmd));
            
            if (commandFound) {
              const regex = new RegExp(commandFound, "i");
              const parts = finalText.split(regex);
              
              // ✅ PEGA O TEXTO **DEPOIS** DO COMANDO (não antes)
              if (parts.length > 1) {
                const textAfterCommand = parts[1].trim().replace(/^[,.\s]+/, '');
                
                if (textAfterCommand.length > 5) {
                  // Pega só a primeira frase
                  const firstSentence = textAfterCommand.split(/[.!?]/)[0].trim();
                  if (firstSentence.length > 5) {
                    setSuggestions(prev => [...prev, firstSentence]);
                    console.log(`✅ Ação capturada: "${firstSentence}"`);
                  }
                }
              }
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Erro no reconhecimento:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          if (isListening) {
            recognition.start();
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setLiveTranscript("");
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) {
      alert("Digite o nome do participante");
      return;
    }

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
      area: newParticipantArea,
    };

    setParticipants([...participants, newParticipant]);
    setNewParticipantName("");
    setNewParticipantArea(DEFAULT_AREAS[0]);
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      let text = event.target?.result as string;
      
      if (text.includes('Ã§Ã£') || text.includes('SaÃ­das') || text.includes('ResponsÃ¡vel')) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder('utf-8');
        try {
          const bytes = encoder.encode(text);
          text = decoder.decode(bytes);
        } catch (err) {
          console.log("Falha ao recodificar, continuando com texto original");
        }
      }
      
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) return;

      const actions: PreviousActionItem[] = [];
      
      let entradaIdx = 0;
      let acaoIdx = 1;
      let responsavelIdx = 2;
      
      const headerCols = lines[0].split(/\t|,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      headerCols.forEach((col, idx) => {
        const cleanCol = col.replace(/"/g, "").toLowerCase().trim();
        if (cleanCol.includes('entrada')) entradaIdx = idx;
        if (cleanCol.includes('saída') || cleanCol.includes('saida') || cleanCol.includes('ação') || cleanCol.includes('acao') || cleanCol.includes('decisão')) acaoIdx = idx;
        if (cleanCol.includes('responsável') || cleanCol.includes('responsavel')) responsavelIdx = idx;
      });

      lines.slice(1).forEach((line) => {
        const cols = line
          .split(/\t|,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map(c => c.replace(/"/g, "").trim());

        if (cols.length < 3) return;

        const entrada = cols[entradaIdx] || "";
        const actionText = cols[acaoIdx] || "";
        const responsavel = cols[responsavelIdx] || "Não definido";

        const isAction = entrada.toLowerCase().includes('acao') || 
                        entrada.toLowerCase().includes('ação') || 
                        entrada === 'Ação' ||
                        entrada.includes('Ã§Ã£o');
        
        const isPresentation = entrada.toLowerCase().includes('apresenta') ||
                              entrada.toLowerCase().includes('apresentação');

        if (isAction && !isPresentation && actionText && actionText.length > 3) {
          actions.push({
            action: actionText,
            responsavel,
          });
        }
      });

      setPreviousActions(actions);
      
      if (actions.length === 0) {
        alert("Nenhuma ação encontrada no CSV. Verifique o formato do arquivo.");
      }
    };

    reader.readAsText(file, "UTF-8");
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      alert("Cole a transcrição primeiro");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisMessage("IA está analisando a transcrição...");

    // ✅ FILTRAR APENAS TRECHOS COM O COMANDO ESPECÍFICO
    const lowerText = transcript.toLowerCase();
    const commandRegex = /preciso que registre em ata/gi;
    
    if (!commandRegex.test(lowerText)) {
      setAnalysisMessage("⚠️ Nenhum comando 'preciso que registre em ata' encontrado na transcrição");
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisMessage(""), 3000);
      return;
    }

    // ✅ EXTRAIR TEXTO **DEPOIS** DE CADA COMANDO
    const parts = transcript.split(/preciso que registre em ata/gi);
    const actionsFromCommands: string[] = [];
    
    // Para cada parte DEPOIS do comando (ignora a primeira que vem antes)
    for (let i = 1; i < parts.length; i++) {
      const textAfterCommand = parts[i].trim();
      
      // Remove vírgulas e pontos do início
      let cleanText = textAfterCommand.replace(/^[,.\s]+/, '');
      
      // Pega a primeira frase completa depois do comando
      const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      if (sentences.length > 0) {
        const firstSentence = sentences[0].trim();
        
        // Se for muito longo, pega só até 200 caracteres
        if (firstSentence.length > 200) {
          const shortened = firstSentence.substring(0, 200).trim();
          actionsFromCommands.push(shortened);
        } else if (firstSentence.length > 10) {
          actionsFromCommands.push(firstSentence);
        }
      }
    }

    if (actionsFromCommands.length === 0) {
      setAnalysisMessage("⚠️ Nenhuma ação clara encontrada depois dos comandos");
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisMessage(""), 3000);
      return;
    }

    setSuggestions(prev => {
      const existingActions = new Set(prev.map(a => a.toLowerCase().trim()));
      const newActions = actionsFromCommands.filter(
        action => !existingActions.has(action.toLowerCase().trim())
      );
      return [...prev, ...newActions];
    });
    
    setAnalysisMessage(`✅ ${actionsFromCommands.length} ações capturadas pelos comandos!`);
    setTimeout(() => setAnalysisMessage(""), 2000);

    setIsAnalyzing(false);
  };

  const handleAddManualAction = () => {
    if (manualAction.trim()) {
      setSuggestions((prev) => [...prev, manualAction.trim()]);
      setManualAction("");
    }
  };

  // ✅ NOVO: Função para REPROVAR/REMOVER ação
  const handleRejectSuggestion = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
    setSelectedAreas((prev) => {
      const newAreas = { ...prev };
      delete newAreas[index];
      return newAreas;
    });
  };

  // ✅ NOVO: Função para iniciar EDIÇÃO
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(suggestions[index]);
  };

  // ✅ NOVO: Função para SALVAR edição
  const handleSaveEdit = (index: number) => {
    if (editingText.trim()) {
      setSuggestions((prev) => 
        prev.map((item, i) => (i === index ? editingText.trim() : item))
      );
    }
    setEditingIndex(null);
    setEditingText("");
  };

  // ✅ NOVO: Função para CANCELAR edição
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  const handleApprove = (index: number) => {
    const action = suggestions[index];
    const area = selectedAreas[index] || availableResponsibles[0];

    setChecklist((prev) => [
      ...prev,
      {
        text: action,
        area,
        done: true,
      },
    ]);

    setSuggestions((prev) => prev.filter((_, i) => i !== index));
    setSelectedAreas((prev) => {
      const newAreas = { ...prev };
      delete newAreas[index];
      return newAreas;
    });
  };

  const handleToggleChecklistItem = (index: number, checked: boolean) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: checked } : item))
    );
  };

  const handleDownload = async () => {
    if (checklist.length === 0) {
      alert("Adicione pelo menos uma ação antes de exportar");
      return;
    }

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const formatDateBR = (d: Date) => {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    const formatDateTimeBR = (d: Date) => {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    };

    let csv = '\ufeff';
    
    csv += `"=== ATA DE REUNIÃO ==="\n`;
    csv += `"Data: ${formatDateTimeBR(today)}"\n\n`;
    
    if (participants.length > 0) {
      csv += `"PARTICIPANTES:"\n`;
      participants.forEach((p, i) => {
        csv += `"${i + 1}. ${p.name} - ${p.area}"\n`;
      });
      csv += `\n`;
    }
    
    if (objetivo) {
      csv += `"OBJETIVO DA REUNIÃO:"\n`;
      csv += `"${objetivo}"\n\n`;
    }
    
    const pautaPreenchida = pautaItems.filter(item => item.trim());
    if (pautaPreenchida.length > 0) {
      csv += `"PAUTA:"\n`;
      pautaPreenchida.forEach((item, i) => {
        csv += `"${i + 1}. ${item}"\n`;
      });
      csv += `\n`;
    }
    
    csv += `"AÇÕES:"\n`;
    csv += '"Ação","Responsável","Data","Status"\n';

    checklist.forEach((c) => {
      const status = c.done ? "Concluído" : "Pendente";
      csv += `"${c.text}","${c.area}","${formatDate(today)}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ATA_REUNIAO_GERAL_${formatDate(today)}.csv`;
    a.click();

    // ✅ SALVAR NO SUPABASE
    try {
      const completedActions = checklist.filter(c => c.done).length;
      const pendingActions = checklist.filter(c => !c.done).length;

      const newMeeting = {
        id: `geral-${formatDate(today)}-${Date.now()}`,
        date: formatDateBR(today),
        participants: participants,
        objetivo: objetivo || null,
        pauta: pautaPreenchida,
        transcript: transcript || null,
        actions: checklist,
        total_actions: checklist.length,
        completed_actions: completedActions,
        pending_actions: pendingActions,
        csv_data: csv,
      };

      const { data: existingMeeting } = await supabase
        .from('meetings_general')
        .select('id')
        .eq('id', newMeeting.id)
        .single();

      if (existingMeeting) {
        const { error } = await supabase
          .from('meetings_general')
          .update(newMeeting)
          .eq('id', newMeeting.id);

        if (error) throw error;
        alert("✅ Ata atualizada com sucesso no banco de dados!");
      } else {
        const { error } = await supabase
          .from('meetings_general')
          .insert([newMeeting]);

        if (error) throw error;
        alert("✅ Ata salva com sucesso no banco de dados!");
      }
    } catch (error) {
      console.error('Erro ao salvar no Supabase:', error);
      alert("❌ Erro ao salvar no banco de dados. O arquivo CSV foi baixado normalmente.");
    }
  };

  const handleAddPautaItem = () => {
    setPautaItems([...pautaItems, ""]);
  };

  const handleRemovePautaItem = (index: number) => {
    if (pautaItems.length > 1) {
      setPautaItems(pautaItems.filter((_, i) => i !== index));
    }
  };

  const handlePautaItemChange = (index: number, value: string) => {
    const newItems = [...pautaItems];
    newItems[index] = value;
    setPautaItems(newItems);
  };

  return (
    <div className="p-5 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white py-6 px-8">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-3xl font-bold mb-1">
                🎤 Ata Reuniões Gerais
              </h2>
              <p className="opacity-90 text-sm md:text-base">
                Transcrição e análise inteligente de reuniões
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className={`px-6 py-3 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                  showParticipants 
                    ? "bg-amber-500 text-white" 
                    : "bg-white text-[#1e3c72]"
                }`}
              >
                👥 {showParticipants ? "Ocultar" : "Participantes"} {participants.length > 0 && `(${participants.length})`}
              </button>
              <button
                onClick={() => setShowPauta(!showPauta)}
                className={`px-6 py-3 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                  showPauta 
                    ? "bg-emerald-500 text-white" 
                    : "bg-white text-[#1e3c72]"
                }`}
              >
                📋 {showPauta ? "Ocultar Pauta" : "Incluir Pauta"}
              </button>
              <a
                href="/registros-gerais"
                className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                📋 Ver Registros
              </a>
              <a
                href="/"
                className="px-6 py-3 bg-white text-[#1e3c72] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                ← Voltar
              </a>
              <img
                src="/LogoBeqbranca.png"
                alt="Logo Beq"
                className="w-32 h-auto hidden md:block"
              />
            </div>
          </div>
        </div>

        {/* Seção de Participantes */}
        {showParticipants && (
          <section className="p-8 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">👥</span>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Participantes da Reunião</h3>
                  <p className="text-sm text-gray-600">Adicione os participantes que aparecerão como responsáveis pelas ações</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md mb-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nome do Participante
                    </label>
                    <input
                      type="text"
                      value={newParticipantName}
                      onChange={(e) => setNewParticipantName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newParticipantName.trim()) {
                          handleAddParticipant();
                        }
                      }}
                      placeholder="Ex: João Silva"
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Área/Setor
                    </label>
                    <select
                      value={newParticipantArea}
                      onChange={(e) => setNewParticipantArea(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    >
                      {DEFAULT_AREAS.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAddParticipant}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    ➕ Adicionar
                  </button>
                </div>
              </div>

              {participants.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <h4 className="text-sm font-bold text-gray-700 mb-4">
                    Participantes Cadastrados ({participants.length})
                  </h4>
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">👤</span>
                          <div>
                            <p className="font-semibold text-gray-800">{participant.name}</p>
                            <p className="text-sm text-gray-600">{participant.area}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold rounded-lg transition-all"
                          title="Remover participante"
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {participants.length === 0 && (
                <div className="bg-white rounded-xl p-8 shadow-md text-center">
                  <p className="text-gray-500">
                    Nenhum participante cadastrado ainda. Adicione participantes para que apareçam como responsáveis nas ações.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Pauta da Reunião */}
        {showPauta && (
          <section className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">📋</span>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Objetivo e Pauta da Reunião</h3>
                  <p className="text-sm text-gray-600">Defina o objetivo e os assuntos que serão discutidos</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    🎯 Objetivo da Reunião
                  </label>
                  <textarea
                    value={objetivo}
                    onChange={(e) => setObjetivo(e.target.value)}
                    placeholder="Ex: Revisar indicadores de segurança, discutir ações preventivas e alinhar estratégias para o próximo período"
                    className="w-full h-24 p-4 border-2 border-gray-200 rounded-xl resize-y focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-base"
                  />
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      📌 Pauta da Reunião
                    </label>
                    <button
                      onClick={handleAddPautaItem}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                    >
                      ➕ Adicionar Assunto
                    </button>
                  </div>

                  <div className="space-y-3">
                    {pautaItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center">
                          <span className="text-gray-600 font-semibold">{index + 1}.</span>
                        </div>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handlePautaItemChange(index, e.target.value)}
                          placeholder={`Ex: ${index === 0 ? "Análise de indicadores de segurança" : index === 1 ? "Revisão de procedimentos" : "Outro assunto"}`}
                          className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        {pautaItems.length > 1 && (
                          <button
                            onClick={() => handleRemovePautaItem(index)}
                            className="flex-shrink-0 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold rounded-lg transition-all"
                            title="Remover este assunto"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Ações da Reunião Anterior */}
        <section className="p-8 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-5">
            Ações da Reunião Anterior
          </h3>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileLoad}
            className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-white file:font-semibold hover:file:bg-emerald-600 file:cursor-pointer"
          />
          <div className="space-y-3">
            {previousActions.length === 0 ? (
              <p className="text-center py-5 text-gray-500">
                Carregue um arquivo CSV para ver as ações anteriores
              </p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Ação da reunião anterior</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Responsável</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previousActions.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600 align-top">{i + 1}</td>
                        <td className="px-3 py-2 text-gray-800 align-top">{item.action}</td>
                        <td className="px-3 py-2 text-gray-700 align-top">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {item.responsavel}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          <select className="px-2 py-1 border-2 border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" defaultValue="Pendente">
                            <option value="Pendente">Pendente</option>
                            <option value="Concluído">OK</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Transcrição COM MICROFONE */}
        <section className="p-8 border-b border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-gray-800">
              Transcrição da Reunião
            </h3>
            <button
              onClick={toggleListening}
              className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {isListening ? "🎤 Parar Gravação" : "🎤 Iniciar Gravação"}
            </button>
          </div>

          {isListening && (
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                🔴 Gravando... Para registrar uma ação, fale:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-full">
                  "preciso que registre em ata"
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-3 italic">
                ⚠️ Apenas este comando criará ações. Todo o resto será apenas transcrito.
              </p>
              <p className="text-gray-700 italic mt-3 font-semibold">
                {liveTranscript || "Aguardando fala..."}
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Cole a transcrição ou use o microfone..."
                className="w-full h-44 p-4 border-2 border-gray-200 rounded-xl resize-y focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex-1 py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? "Analisando..." : "Analisar com IA"}
                </button>

                <button
                  onClick={handleAddManualAction}
                  disabled={!manualAction.trim()}
                  className="px-6 py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  ➕ Manual
                </button>
              </div>

              <input
                type="text"
                value={manualAction}
                onChange={(e) => setManualAction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualAction.trim()) {
                    handleAddManualAction();
                  }
                }}
                placeholder="Digite ação manual + Enter"
                className="w-full mt-3 p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Ações identificadas ({suggestions.length})
              </h4>
              {analysisMessage && (
                <p className="text-center py-5 text-gray-500 mb-4">{analysisMessage}</p>
              )}
              {suggestions.length === 0 && !analysisMessage ? (
                <p className="text-center py-5 text-gray-500">
                  As ações aparecerão aqui quando você falar "preciso que registre em ata"
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Ação</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Responsável</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {suggestions.map((suggestion, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600 align-top">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-800 align-top text-xs">
                            {editingIndex === i ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="flex-1 p-2 border-2 border-blue-400 rounded-lg text-sm focus:outline-none focus:border-blue-600"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(i)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
                                  title="Salvar edição"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1 bg-gray-400 text-white text-xs font-semibold rounded-lg hover:bg-gray-500"
                                  title="Cancelar edição"
                                >
                                  ✖
                                </button>
                              </div>
                            ) : (
                              suggestion
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <select
                              value={selectedAreas[i] || availableResponsibles[0]}
                              onChange={(e) =>
                                setSelectedAreas((prev) => ({
                                  ...prev,
                                  [i]: e.target.value,
                                }))
                              }
                              className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                              disabled={editingIndex === i}
                            >
                              {participants.length > 0 && (
                                <optgroup label="👥 Participantes">
                                  {participants.map((p) => (
                                    <option key={p.id} value={`${p.name} (${p.area})`}>
                                      {p.name} ({p.area})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="🏢 Áreas Padrão">
                                {DEFAULT_AREAS.map((area) => (
                                  <option key={area} value={area}>{area}</option>
                                ))}
                              </optgroup>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            {editingIndex === i ? null : (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleStartEdit(i)}
                                  className="px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-all"
                                  title="Editar ação"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleApprove(i)}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all"
                                  title="Aprovar ação"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleRejectSuggestion(i)}
                                  className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-all"
                                  title="Reprovar/Remover ação"
                                >
                                  ✖
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ✅ NOVA SEÇÃO: Visualização da Transcrição */}
        {transcript.trim() && (
          <section className="p-8 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">📝</span>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Transcrição Completa da Reunião</h3>
                    <p className="text-sm text-gray-600">
                      {transcript.split(' ').length} palavras • {Math.ceil(transcript.length / 500)} minutos de leitura
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className={`px-6 py-3 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                    showTranscript 
                      ? "bg-purple-600 text-white" 
                      : "bg-white text-purple-600 border-2 border-purple-600"
                  }`}
                >
                  {showTranscript ? "🔼 Ocultar Transcrição" : "🔽 Ver Transcrição Completa"}
                </button>
              </div>

              {showTranscript && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-purple-200">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold">📄 Texto Completo</h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(transcript);
                          alert("✅ Transcrição copiada para a área de transferência!");
                        }}
                        className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-semibold transition-all"
                      >
                        📋 Copiar Texto
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 max-h-96 overflow-y-auto border border-gray-200">
                      <div className="prose prose-sm max-w-none">
                        {transcript.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="text-gray-700 leading-relaxed mb-4 text-justify">
                            {paragraph.split('\n').map((line, lineIdx) => (
                              <span key={lineIdx}>
                                {line}
                                {lineIdx < paragraph.split('\n').length - 1 && <br />}
                              </span>
                            ))}
                          </p>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-3">
                      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">📊</span>
                          <span className="font-bold text-blue-900">Estatísticas</span>
                        </div>
                        <div className="space-y-1 text-sm text-blue-800">
                          <p>• <strong>{transcript.split(' ').length}</strong> palavras</p>
                          <p>• <strong>{transcript.split('\n').filter(l => l.trim()).length}</strong> linhas</p>
                          <p>• <strong>{transcript.length}</strong> caracteres</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">✅</span>
                          <span className="font-bold text-green-900">Ações Capturadas</span>
                        </div>
                        <div className="space-y-1 text-sm text-green-800">
                          <p>• <strong>{suggestions.length}</strong> ações identificadas</p>
                          <p>• <strong>{checklist.length}</strong> ações aprovadas</p>
                          <p>• <strong>{suggestions.length + checklist.length}</strong> total</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🎤</span>
                          <span className="font-bold text-amber-900">Comandos</span>
                        </div>
                        <div className="space-y-1 text-sm text-amber-800">
                          <p>• Comando usado:</p>
                          <p className="font-semibold">"preciso que registre em ata"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Checklist Final */}
        <section className="p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-5">
            Checklist Final ({checklist.length} itens)
          </h3>
          {checklist.length === 0 ? (
            <p className="text-center py-5 text-gray-500">Nenhum item no checklist</p>
          ) : (
            <div className="space-y-3 mb-5">
              {checklist.map((item, i) => (
                <div key={i} className="bg-gray-50 p-4 border-l-4 border-emerald-500 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => handleToggleChecklistItem(i, e.target.checked)}
                      className="w-5 h-5 accent-emerald-500"
                    />
                    <span className="flex-1">
                      <strong>Ação:</strong> {item.text}
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {item.area}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={handleDownload}
            disabled={checklist.length === 0}
            className="w-full py-4 bg-[#217346] text-white font-semibold text-lg rounded-xl hover:bg-[#185c37] hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Baixar e Salvar Relatório ({checklist.length} itens)
          </button>
        </section>
      </div>
    </div>
  );
}
