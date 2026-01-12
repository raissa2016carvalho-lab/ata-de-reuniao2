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

// Comandos de voz para capturar ações - LISTA COMPLETA
const VOICE_COMMANDS = [
  "anotar na ata",
  "anotar ata",
  "escrever na ata",
  "escreva na ata",
  "anote aí",
  "anota aí",
  "registrar na ata",
  "registre na ata",
  "adicionar na ata",
  "adicione na ata",
  "incluir na ata",
  "inclua na ata",
  "salvar na ata",
  "salve na ata",
  "gravar na ata",
  "grave na ata",
  "colocar na ata",
  "coloque na ata",
  "inserir na ata",
  "insira na ata",
  "ação para ata",
  "item para ata",
  "ponto de ata",
  "vai para ata",
  "isso é ata",
  "é ação",
  "criar ação",
  "nova ação",
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

export default function AtaReunioes() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [manualAction, setManualAction] = useState("");
  const [previousActions, setPreviousActions] = useState<PreviousActionItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  
  // Estados para pauta da reunião
  const [showPauta, setShowPauta] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [objetivo, setObjetivo] = useState("");
  
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
            // Adiciona à transcrição completa
            setTranscript(prev => prev + finalText);
            
            // DETECTAR QUALQUER COMANDO DE VOZ
            const lowerText = finalText.toLowerCase();
            const commandFound = VOICE_COMMANDS.find(cmd => lowerText.includes(cmd));
            
            if (commandFound) {
              // Extrair texto ANTES do comando
              const regex = new RegExp(commandFound, "i");
              const parts = finalText.split(regex);
              const textBeforeCommand = parts[0].trim();
              
              if (textBeforeCommand.length > 5) {
                // Adiciona SOMENTE quando houver comando
                setSuggestions(prev => [...prev, textBeforeCommand]);
                
                // Feedback visual/sonoro (opcional)
                console.log(`✅ Ação capturada pelo comando: "${commandFound}"`);
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

  // Load CSV file com UTF-8 correto
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      let text = event.target?.result as string;
      
      // Corrigir encoding se necessário
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
      
      // Detectar índice das colunas pelo header
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

        // Aceita APENAS "Ação" (ignora "Apresentação")
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

  const analyzeTranscriptAuto = async (text: string) => {
    // FUNÇÃO DESATIVADA - Não analisa automaticamente mais
    // Agora só captura com comandos de voz específicos
    return;
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
    const formatDateTimeBR = (d: Date) => {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    };

    let csv = '\ufeff';
    
    // Cabeçalho da Ata com Pauta
    if (assunto || objetivo) {
      csv += `"=== ATA DE REUNIÃO ==="\n`;
      csv += `"Data: ${formatDateTimeBR(today)}"\n`;
      if (assunto) csv += `"Assunto: ${assunto}"\n`;
      if (objetivo) csv += `"Objetivo: ${objetivo}"\n`;
      csv += `\n`;
    }
    
    csv += '"Ação","Responsável","Data","Status"\n';

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
                🔴 Gravando... Use um dos comandos abaixo para capturar ações:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {VOICE_COMMANDS.slice(0, 10).map((cmd, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-200 text-blue-900 text-xs rounded-full">
                    "{cmd}"
                  </span>
                ))}
                <span className="text-xs text-blue-700 italic">...e mais {VOICE_COMMANDS.length - 10} comandos</span>
              </div>
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
