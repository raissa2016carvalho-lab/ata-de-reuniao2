"use client";

import { useState, useEffect, useRef } from "react";
import { analyzeTranscript } from "../actions";
import { supabase } from "@/lib/supabase";

const STATES = [
  "SESMT - Ceará",
  "SESMT - Bahia",
  "SESMT - Piauí",
  "SESMT - Rio Grande do Norte",
  "SESMT - Minas Gerais",
  "SESMT - São Paulo",
  "SESMT - Monitoria",
];

// ✅ COMANDO ÚNICO E ESPECÍFICO - SÓ ESTE CRIA AÇÕES
const VOICE_COMMANDS = [
  "preciso que registre em ata",
];

interface ChecklistItem {
  type: string;
  text: string;
  area: string;
  done: boolean;
  time?: string;
}

interface PreviousActionItem {
  action: string;
  responsavel: string;
}

export default function Home() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [manualAction, setManualAction] = useState("");
  const [objective, setObjective] = useState("");
  const [previousActions, setPreviousActions] = useState<PreviousActionItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para o microfone
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Timers
  const [presentationTimes, setPresentationTimes] = useState<Record<string, number>>({});
  const [individualTimers, setIndividualTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // ✅ NOVO: Estados para edição de sugestões
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  
  // ✅ NOVO: Estado para visualização da transcrição
  const [showTranscript, setShowTranscript] = useState(false);

  // 📝 Função para formatar texto automaticamente
  const autoFormatText = (text: string): string => {
    let formatted = text.trim();
    
    // Remover espaços múltiplos
    formatted = formatted.replace(/\s+/g, ' ');
    
    // Primeira letra maiúscula
    if (formatted.length > 0) {
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    
    // Adicionar vírgulas antes de conectores
    const connectors = ['e ', 'mas ', 'porém ', 'então ', 'também ', 'além disso '];
    connectors.forEach(connector => {
      const regex = new RegExp(`\\s${connector}`, 'gi');
      formatted = formatted.replace(regex, `, ${connector}`);
    });
    
    // Adicionar ponto final se não tiver
    if (!formatted.match(/[.!?]$/)) {
      formatted += '.';
    }
    
    // Maiúscula após pontos
    formatted = formatted.replace(/([.!?])\s+([a-z])/g, (match, p1, p2) => {
      return p1 + ' ' + p2.toUpperCase();
    });
    
    // Adicionar espaço
    formatted += ' ';
    
    return formatted;
  };

  useEffect(() => {
  if (typeof window !== "undefined") {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      // ✅ CONFIGURAÇÕES OTIMIZADAS
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";
      recognition.maxAlternatives = 1;

      let finalTimeout: NodeJS.Timeout;

      recognition.onresult = (event: any) => {
        clearTimeout(finalTimeout);

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
          finalTimeout = setTimeout(() => {
            // ✨ FORMATAÇÃO AUTOMÁTICA
            const formattedText = autoFormatText(finalText);
            setTranscript(prev => prev + formattedText);
            
            // ✅ SÓ CAPTURA AÇÃO COM O COMANDO ESPECÍFICO
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
          }, 100);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Erro no reconhecimento:", event.error);
        
        switch(event.error) {
          case 'no-speech':
            console.warn('⚠️ Nenhuma fala detectada. Fale mais alto ou próximo ao microfone.');
            break;
          case 'audio-capture':
            alert('❌ Erro ao capturar áudio. Verifique as permissões do microfone.');
            setIsListening(false);
            break;
          case 'not-allowed':
            alert('❌ Permissão de microfone negada. Permita o acesso nas configurações do navegador.');
            setIsListening(false);
            break;
          case 'network':
            console.warn('⚠️ Erro de rede. Verifique sua conexão com a internet.');
            break;
          default:
            console.error('❌ Erro desconhecido:', event.error);
        }
      };

      // ✅ AUTO-RESTART FORÇADO
      recognition.onend = () => {
        console.log('🔴 Reconhecimento finalizado');
        if (isListening) {
          console.log('🔄 Reiniciando automaticamente...');
          setTimeout(() => {
            try {
              if (recognitionRef.current && isListening) {
                recognitionRef.current.start();
              }
            } catch (error) {
              console.error('❌ Erro ao reiniciar:', error);
              setTimeout(() => {
                try {
                  if (recognitionRef.current && isListening) {
                    recognitionRef.current.start();
                  }
                } catch (e) {
                  console.error('❌ Falha definitiva:', e);
                  setIsListening(false);
                }
              }, 500);
            }
          }, 100);
        }
      };

      recognition.onstart = () => {
        console.log('🎤 Reconhecimento de voz iniciado');
      };

      recognitionRef.current = recognition;
    } else {
      console.error('❌ SpeechRecognition não suportado neste navegador. Use Google Chrome.');
      alert('Seu navegador não suporta reconhecimento de voz. Use Google Chrome para melhor experiência.');
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
      
      const header = lines[0].toLowerCase();
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
    const area = selectedAreas[index] || STATES[0];

    setChecklist((prev) => [
      ...prev,
      {
        type: "Ação",
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

  const handleStopTimer = (state: string) => {
    const itemKey = state;
    if (individualTimers[itemKey]) {
      clearInterval(individualTimers[itemKey]);
      const newTimers = { ...individualTimers };
      delete newTimers[itemKey];
      setIndividualTimers(newTimers);
      
      const finalTime = formatItemTime(state);
      setChecklist(prev => 
        prev.map(item => 
          item.type === "Apresentação" && item.text === state
            ? { ...item, time: finalTime }
            : item
        )
      );
    }
  };

  const handleToggleState = (state: string, checked: boolean) => {
    const itemKey = state;
    
    if (checked) {
      const timerId = setInterval(() => {
        setPresentationTimes(prev => ({
          ...prev,
          [itemKey]: (prev[itemKey] || 0) + 1
        }));
      }, 1000);
      
      setIndividualTimers(prev => ({ ...prev, [itemKey]: timerId }));
      
      setChecklist((prev) => [
        ...prev.filter(c => !(c.type === "Apresentação" && c.text === state)),
        {
          type: "Apresentação",
          text: state,
          area: state,
          done: true,
        },
      ]);
    } else {
      handleStopTimer(state);
      
      setChecklist((prev) =>
        prev.filter((c) => !(c.type === "Apresentação" && c.text === state))
      );
      
      setPresentationTimes(prev => {
        const newTimes = { ...prev };
        delete newTimes[itemKey];
        return newTimes;
      });
    }
  };

  const formatItemTime = (state: string) => {
    const totalSeconds = presentationTimes[state] || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleToggleChecklistItem = (index: number, checked: boolean) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: checked } : item))
    );
  };

  const handleDownload = async () => {
  const presentationItems = checklist.filter((c) => c.type === "Apresentação");
  const actionItems = checklist.filter((c) => c.type === "Ação");
  const allItems = [...presentationItems, ...actionItems];

  if (allItems.length === 0) {
    alert("Adicione pelo menos uma apresentação ou ação antes de exportar");
    return;
  }

  setIsSaving(true);

  try {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 8);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const formatDateBR = (d: Date) => {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    let csv = '\ufeff"Entradas","Saídas: Decisões e ações","Responsável","Data","Status","Tempo"\n';

    allItems.forEach((c) => {
      const entrada = c.type;
      const saidas = c.text;
      const responsavel = c.area;
      const data = formatDate(dueDate);
      const status = c.done ? "Concluído" : "Pendente";
      const tempo = c.time || "";

      csv += `"${entrada}","${saidas}","${responsavel}","${data}","${status}","${tempo}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `RELATORIO_REUNIAO_${formatDate(today)}.csv`;
    a.click();

    const completedActions = actionItems.filter(c => c.done).length;
    const pendingActions = actionItems.filter(c => !c.done).length;

    const newMeeting = {
      id: `${formatDate(today)}-seguranca-${Date.now()}`,
      date: formatDateBR(today),
      presentations: presentationItems.length,
      actions: actionItems.length,
      completed: completedActions,
      pending: pendingActions,
      csv_data: csv,
      tipo: 'seguranca'
    };

    const { error } = await supabase
      .from('meetings')
      .insert([newMeeting]);

    if (error) throw error;
    
    alert("✅ Reunião salva com sucesso!\n\nAcesse 'Registros Gerais' para ver o histórico.");

  } catch (error) {
    console.error('Erro ao salvar reunião:', error);
    alert("❌ Erro ao salvar reunião no banco de dados. Verifique a conexão com o Supabase.");
  } finally {
    setIsSaving(false);
  }
};


  const completedItems = checklist.filter((c) => c.done);
  const pendingItems = checklist.filter((c) => !c.done);

  return (
    <div className="p-5 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white py-6 px-8">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-3xl font-bold mb-1">
                Reunião Semanal de Segurança
              </h2>
              <p className="opacity-90 text-sm md:text-base">
                Há 38 anos, unindo energias para ir mais longe!
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <a
                href="/"
                className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                ← Voltar
              </a>
              <a
                href="/ata-reunioes"
                className="px-6 py-3 bg-white text-[#1e3c72] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                🎤 Ata Reuniões Gerais
              </a>
              <a
                href="/registros"
                className="px-6 py-3 bg-white text-[#1e3c72] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                📋 Registros Gerais
              </a>
              <img
                src="/LogoBeqbranca.png"
                alt="Logo Beq"
                width={140}
                height={40}
                className="object-contain"
                onError={(e) => {
                  console.error("Erro ao carregar logo:", e);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

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

        <section className="p-8 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-5">
            Apresentação dos Números de Segurança
          </h3>
          <div className="space-y-3">
            {STATES.map((state) => {
              const isChecked = checklist.some(c => c.type === "Apresentação" && c.text === state);
              const currentTime = formatItemTime(state);
              const hasSavedTime = checklist.some(c => c.type === "Apresentação" && c.text === state && c.time);
              
              return (
                <div key={state} className="flex gap-3 items-start p-4 border-2 rounded-xl transition-all">
                  <label className="flex-1 flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all flex-grow">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleToggleState(state, e.target.checked)}
                      className="w-5 h-5 accent-emerald-500"
                    />
                    <span className="font-semibold">{state}</span>
                  </label>
                  
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-sm font-mono text-right min-w-[70px] ${
                      isChecked 
                        ? 'bg-emerald-100 text-emerald-800 font-bold shadow-md' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {hasSavedTime ? checklist.find(c => c.type === "Apresentação" && c.text === state)?.time || currentTime : currentTime}
                    </span>
                    {isChecked && (
                      <button
                        onClick={() => handleStopTimer(state)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md transition-all text-center whitespace-nowrap"
                      >
                        ⏹️ Parar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

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
                              value={selectedAreas[i] || STATES[0]}
                              onChange={(e) =>
                                setSelectedAreas((prev) => ({
                                  ...prev,
                                  [i]: e.target.value,
                                }))
                              }
                              className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                              disabled={editingIndex === i}
                            >
                              {STATES.map((state) => (
                                <option key={state} value={state}>{state}</option>
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
                          <p>• <strong>{checklist.filter(c => c.type === "Ação").length}</strong> ações aprovadas</p>
                          <p>• <strong>{suggestions.length + checklist.filter(c => c.type === "Ação").length}</strong> total</p>
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
                      <strong>{item.type}:</strong> {item.text}
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {item.area}
                      </span>
                      {item.time && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-mono">
                          {item.time}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={handleDownload}
            disabled={checklist.length === 0 || isSaving}
            className="w-full py-4 bg-[#217346] text-white font-semibold text-lg rounded-xl hover:bg-[#185c37] hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "💾 Salvando..." : `📥 Baixar e Salvar Relatório (${checklist.length} itens)`}
          </button>
        </section>
      </div>
    </div>
  );
}
