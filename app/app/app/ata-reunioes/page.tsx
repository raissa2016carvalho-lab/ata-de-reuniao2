"use client";

import { useState, useEffect, useRef } from "react";
import { analyzeTranscript } from "../actions";

const STATES = [
  "SESMT - Ceará",
  "SESMT - Bahia",
  "SESMT - Piauí",
  "SESMT - Rio Grande do Norte",
  "SESMT - Minas Gerais",
  "SESMT - São Paulo",
  "SESMT - Monitoria",
];

interface ChecklistItem {
  text: string;
  area: string;
  done: boolean;
}

export default function AtaReunioes() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [manualAction, setManualAction] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  
  // Estados para o microfone
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Inicializar Web Speech API
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
            setTranscript(prev => {
              const newTranscript = prev + finalText;
              if (newTranscript.length % 500 < finalText.length) {
                analyzeTranscriptAuto(newTranscript);
              }
              return newTranscript;
            });
            
            const lowerText = finalText.toLowerCase();
            if (lowerText.includes("anotar na ata") || lowerText.includes("anotar ata")) {
              const textBeforeCommand = finalText.split(/anotar na ata|anotar ata/i)[0].trim();
              if (textBeforeCommand.length > 5) {
                setSuggestions(prev => [...prev, textBeforeCommand]);
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

  const analyzeTranscriptAuto = async (text: string) => {
    if (!text.trim() || text.length < 50) return;

    try {
      const result = await analyzeTranscript(text);
      
      if (!result.error && result.actions.length > 0) {
        setSuggestions(prev => {
          const existingActions = new Set(prev.map(a => a.toLowerCase().trim()));
          const newActions = result.actions.filter(
            action => !existingActions.has(action.toLowerCase().trim())
          );
          return [...prev, ...newActions];
        });
      }
    } catch (error) {
      console.error("Erro na análise automática:", error);
    }
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
      setAnalysisMessage("Nenhuma ação identificada na transcrição");
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

  const handleApprove = (index: number) => {
    const action = suggestions[index];
    const area = selectedAreas[index] || STATES[0];

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

  const handleDownload = () => {
    if (checklist.length === 0) {
      alert("Adicione pelo menos uma ação antes de exportar");
      return;
    }

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    let csv = '\ufeff"Ação","Responsável","Data","Status"\n';

    checklist.forEach((c) => {
      const status = c.done ? "Concluído" : "Pendente";
      csv += `"${c.text}","${c.area}","${formatDate(today)}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ATA_REUNIAO_${formatDate(today)}.csv`;
    a.click();

    alert("✅ Ata salva com sucesso!");
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
                🔴 Gravando... (Diga "anotar na ata" para capturar ação específica)
              </p>
              <p className="text-gray-700 italic">
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
                  As ações aparecerão aqui (IA automática + comando de voz + manual)
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Ação</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Responsável</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Aprovar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {suggestions.map((suggestion, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600 align-top">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-800 align-top text-xs">{suggestion}</td>
                          <td className="px-3 py-2 align-top">
                            <select
                              value={selectedAreas[i] || STATES[0]}
                              onChange={(e) =>
                                setSelectedAreas((prev) => ({
                                  ...prev,
                                  [i]: e.target.value,
                                }))
                              }
                              className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                            >
                              {STATES.map((state) => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            <button
                              onClick={() => handleApprove(i)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all"
                            >
                              Aprovar
                            </button>
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
            📥 Baixar Relatório ({checklist.length} itens)
          </button>
        </section>
      </div>
    </div>
  );
}
