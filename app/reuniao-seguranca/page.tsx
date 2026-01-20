"use client";

import { useState, useEffect, useRef } from "react";
import { analyzeTranscript } from "../actions";
import { supabase } from "@/lib/supabase";

// ✅ COMANDO ÚNICO E ESPECÍFICO - SÓ ESTE CRIA AÇÕES
const VOICE_COMMANDS = [
  "preciso que registre em ata",
];

const ESTADOS = [
  "Acre",
  "Alagoas", 
  "Amapá",
  "Amazonas",
  "Bahia",
  "Ceará",
  "Distrito Federal",
  "Espírito Santo",
  "Goiás",
  "Maranhão",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais",
  "Pará",
  "Paraíba",
  "Paraná",
  "Pernambuco",
  "Piauí",
  "Rio de Janeiro",
  "Rio Grande do Norte",
  "Rio Grande do Sul",
  "Rondônia",
  "Roraima",
  "Santa Catarina",
  "São Paulo",
  "Sergipe",
  "Tocantins"
];

interface PresentationData {
  estado: string;
  tempo: number;
}

interface ActionItem {
  text: string;
  area: string;
  done: boolean;
}

interface PreviousActionItem {
  action: string;
  responsavel: string;
}

export default function ReuniaoSeguranca() {
  const [presentations, setPresentations] = useState<PresentationData[]>([]);
  const [selectedEstado, setSelectedEstado] = useState(ESTADOS[0]);
  const [tempoMinutos, setTempoMinutos] = useState("");
  
  const [checklist, setChecklist] = useState<ActionItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [manualAction, setManualAction] = useState("");
  const [previousActions, setPreviousActions] = useState<PreviousActionItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // ✅ NOVO: Estados para edição de sugestões
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  
  // ✅ NOVO: Estado para visualização da transcrição
  const [showTranscript, setShowTranscript] = useState(false);

  const DEFAULT_AREAS = [
    "SESMT",
    "OPERAÇÃO",
    "PLANEJAMENTO",
    "QUALIDADE",
    "RH",
    "FACILITIES",
    "MANUTENÇÃO",
    "COMPRAS",
    "ALMOXARIFADO",
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
          
          if (finalText) {
            setTranscript(prev => prev + finalText);
            
            const lowerText = finalText.toLowerCase();
            const commandFound = VOICE_COMMANDS.find(cmd => lowerText.includes(cmd));
            
            if (commandFound) {
              const regex = new RegExp(commandFound, "i");
              const parts = finalText.split(regex);
              const textBeforeCommand = parts[0].trim();
              
              if (textBeforeCommand.length > 5) {
                setSuggestions(prev => [...prev, textBeforeCommand]);
                console.log(`✅ Ação capturada: "${textBeforeCommand}"`);
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

  const handleAddPresentation = () => {
    if (!tempoMinutos || parseFloat(tempoMinutos) <= 0) {
      alert("Digite um tempo válido (em minutos)");
      return;
    }

    const existingIndex = presentations.findIndex(p => p.estado === selectedEstado);
    
    if (existingIndex >= 0) {
      const updated = [...presentations];
      updated[existingIndex].tempo = parseFloat(tempoMinutos);
      setPresentations(updated);
    } else {
      setPresentations([
        ...presentations,
        { estado: selectedEstado, tempo: parseFloat(tempoMinutos) }
      ]);
    }
    
    setTempoMinutos("");
  };

  const handleRemovePresentation = (estado: string) => {
    setPresentations(presentations.filter(p => p.estado !== estado));
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target?.result as string;
      
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) return;

      const actions: PreviousActionItem[] = [];
      
      let acaoIdx = 0;
      let responsavelIdx = 1;
      
      const headerCols = lines[0].split(/\t|,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      headerCols.forEach((col, idx) => {
        const cleanCol = col.replace(/"/g, "").toLowerCase().trim();
        if (cleanCol.includes('ação') || cleanCol.includes('acao')) acaoIdx = idx;
        if (cleanCol.includes('responsável') || cleanCol.includes('responsavel')) responsavelIdx = idx;
      });

      lines.slice(1).forEach((line) => {
        const cols = line
          .split(/\t|,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map(c => c.replace(/"/g, "").trim());

        if (cols.length >= 2) {
          const actionText = cols[acaoIdx] || "";
          const responsavel = cols[responsavelIdx] || "Não definido";

          if (actionText && actionText.length > 3) {
            actions.push({ action: actionText, responsavel });
          }
        }
      });

      setPreviousActions(actions);
      
      if (actions.length === 0) {
        alert("Nenhuma ação encontrada no CSV.");
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

    const result = await analyzeTranscript(transcript);

    if (result.error) {
      setAnalysisMessage(`Erro: ${result.error}`);
    } else if (result.actions.length === 0) {
      setAnalysisMessage("Nenhuma ação identificada");
    } else {
      setSuggestions(prev => {
        const existingActions = new Set(prev.map(a => a.toLowerCase().trim()));
        const newActions = result.actions.filter(
          action => !existingActions.has(action.toLowerCase().trim())
        );
        return [...prev, ...newActions];
      });
      setAnalysisMessage(`✅ ${result.actions.length} novas ações identificadas!`);
      setTimeout(() => setAnalysisMessage(""), 2000);
    }

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
    const area = selectedAreas[index] || DEFAULT_AREAS[0];

    setChecklist((prev) => [
      ...prev,
      { text: action, area, done: false }
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
    if (presentations.length === 0 && checklist.length === 0) {
      alert("Adicione pelo menos uma apresentação ou ação antes de exportar");
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

    let csv = '\ufeff';
    csv += `"=== REUNIÃO SEMANAL DE SEGURANÇA ==="\n`;
    csv += `"Data: ${formatDateBR(today)}"\n\n`;
    
    if (presentations.length > 0) {
      csv += `"APRESENTAÇÕES POR ESTADO:"\n`;
      csv += '"Estado","Tempo (minutos)"\n';
      presentations.forEach((p) => {
        csv += `"${p.estado}","${p.tempo}"\n`;
      });
      csv += `\n`;
    }
    
    if (checklist.length > 0) {
      csv += `"AÇÕES:"\n`;
      csv += '"Ação","Responsável","Data","Status"\n';
      checklist.forEach((c) => {
        const status = c.done ? "Concluído" : "Pendente";
        csv += `"${c.text}","${c.area}","${formatDate(today)}","${status}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `REUNIAO_SEGURANCA_${formatDate(today)}.csv`;
    a.click();

    // Salvar no Supabase
    try {
      const completedActions = checklist.filter(c => c.done).length;
      const pendingActions = checklist.filter(c => !c.done).length;

      const newMeeting = {
        id: `seguranca-${formatDate(today)}-${Date.now()}`,
        date: formatDateBR(today),
        presentations: presentations.length,
        actions: checklist.length,
        completed: completedActions,
        pending: pendingActions,
        csv_data: csv,
      };

      const { error } = await supabase
        .from('meetings')
        .insert([newMeeting]);

      if (error) throw error;
      alert("✅ Reunião salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert("❌ Erro ao salvar. O CSV foi baixado normalmente.");
    }
  };

  const totalTempo = presentations.reduce((sum, p) => sum + p.tempo, 0);

  return (
    <div className="p-5 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-6 px-8">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-3xl font-bold mb-1">
                🛡️ Reunião Semanal de Segurança
              </h2>
              <p className="opacity-90 text-sm md:text-base">
                Apresentações por estado e ações de segurança
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/registros"
                className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                📋 Ver Registros
              </a>
              <a
                href="/"
                className="px-6 py-3 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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

        {/* Apresentações por Estado */}
        <section className="p-8 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">🗺️</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Apresentações por SESMT</h3>
                <p className="text-sm text-gray-600">
                  Registre o tempo de apresentação de cada estado
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md mb-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={selectedEstado}
                    onChange={(e) => setSelectedEstado(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tempo (minutos)
                  </label>
                  <input
                    type="number"
                    value={tempoMinutos}
                    onChange={(e) => setTempoMinutos(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tempoMinutos) {
                        handleAddPresentation();
                      }
                    }}
                    placeholder="Ex: 10"
                    min="0"
                    step="0.5"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <button
                  onClick={handleAddPresentation}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  ➕ Adicionar
                </button>
              </div>
            </div>

            {presentations.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-700">
                    Apresentações Registradas ({presentations.length})
                  </h4>
                  <div className="text-sm font-bold text-emerald-700">
                    Tempo Total: {totalTempo.toFixed(1)} minutos
                  </div>
                </div>
                <div className="space-y-2">
                  {presentations.map((presentation) => (
                    <div
                      key={presentation.estado}
                      className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📍</span>
                        <div>
                          <p className="font-semibold text-gray-800">{presentation.estado}</p>
                          <p className="text-sm text-gray-600">{presentation.tempo} minutos</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePresentation(presentation.estado)}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold rounded-lg transition-all"
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {presentations.length === 0 && (
              <div className="bg-white rounded-xl p-8 shadow-md text-center">
                <p className="text-gray-500">
                  Nenhuma apresentação registrada ainda
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Ações Anteriores */}
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
          {previousActions.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Ação</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Responsável</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previousActions.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-800">{item.action}</td>
                      <td className="px-3 py-2 text-gray-700">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {item.responsavel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select className="px-2 py-1 border-2 border-gray-200 rounded-lg text-xs" defaultValue="Pendente">
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
        </section>

        {/* Transcrição */}
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
                  className="flex-1 py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 hover:-translate-y-0.5 transition-all disabled:opacity-60"
                >
                  {isAnalyzing ? "Analisando..." : "Analisar com IA"}
                </button>

                <button
                  onClick={handleAddManualAction}
                  disabled={!manualAction.trim()}
                  className="px-6 py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 hover:-translate-y-0.5 transition-all disabled:opacity-60"
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
                              value={selectedAreas[i] || DEFAULT_AREAS[0]}
                              onChange={(e) =>
                                setSelectedAreas((prev) => ({
                                  ...prev,
                                  [i]: e.target.value,
                                }))
                              }
                              className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                              disabled={editingIndex === i}
                            >
                              {DEFAULT_AREAS.map((area) => (
                                <option key={area} value={area}>{area}</option>
                              ))}
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
            disabled={presentations.length === 0 && checklist.length === 0}
            className="w-full py-4 bg-emerald-600 text-white font-semibold text-lg rounded-xl hover:bg-emerald-700 hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-50"
          >
            📥 Baixar e Salvar Relatório ({checklist.length} ações)
          </button>
        </section>
      </div>
    </div>
  );
}
