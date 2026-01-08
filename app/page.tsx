"use client";

import { useState, useEffect, useRef } from "react";
import { analyzeTranscript } from "./actions";

const STATES = [
  "Ceará",
  "Bahia",
  "Rio Grande do Norte",
  "Minas Gerais",
  "São Paulo",
];

interface ChecklistItem {
  type: string;
  text: string;
  area: string;
  done: boolean;
}

export default function Home() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>(
    {},
  );
  const [transcript, setTranscript] = useState("");
  const [objective, setObjective] = useState("");
  const [previousActions, setPreviousActions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  // Timer state
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer functions
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hours, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  };

  // Load CSV file
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      const actions: string[] = [];

      lines.slice(1).forEach((line) => {
        const cols = line.split(",");
        if (cols[0] && cols[0].toLowerCase().trim() === "ação") {
          const actionText = cols[1]?.replace(/"/g, "").trim();
          if (actionText) {
            actions.push(actionText);
          }
        }
      });

      setPreviousActions(actions);
    };
    reader.readAsText(file);
  };

  // Analyze with AI
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
      setSuggestions(result.actions);
      setAnalysisMessage("");
    }

    setIsAnalyzing(false);
  };

  // Approve action
  const handleApprove = (index: number) => {
    const action = suggestions[index];
    const area = selectedAreas[index] || STATES[0];

    setChecklist((prev) => [
      ...prev,
      { type: "Ação", text: action, area, done: true },
    ]);

    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle state checkbox
  const handleToggleState = (state: string, checked: boolean) => {
    if (checked) {
      setChecklist((prev) => [
        ...prev,
        { type: "Estado", text: state, area: state, done: true },
      ]);
    } else {
      setChecklist((prev) =>
        prev.filter((c) => !(c.type === "Estado" && c.text === state)),
      );
    }
  };

  // Toggle checklist item
  const handleToggleChecklistItem = (index: number, checked: boolean) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: checked } : item)),
    );
  };

  // Download Excel/CSV
  const handleDownload = () => {
    const markedItems = checklist.filter((c) => c.done);
    if (markedItems.length === 0) {
      alert("Marque pelo menos um item antes de exportar");
      return;
    }

    const objectiveValue = objective || "Reunião Semanal de Segurança";
    const today = new Date();
    const prazo = new Date(today);
    prazo.setDate(prazo.getDate() + 7);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    let csv = "TIPO,DESCRIÇÃO,ÁREA,DATA,PRAZO,STATUS,OBJETIVO,TEMPO\n";
    markedItems.forEach((c) => {
      csv += `${c.type},"${c.text}",${c.area},${formatDate(today)},${formatDate(prazo)},Concluído,"${objectiveValue}",${formatTime(seconds)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ATA_REUNIAO_${formatDate(today)}.csv`;
    a.click();
  };

  const markedItems = checklist.filter((c) => c.done);

  return (
    <div className="p-5 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-[#1e3c72] to-[#2a5298] text-white py-10 px-8 text-center">
          <h2 className="text-3xl font-bold mb-2">
            Reunião Semanal de Segurança
          </h2>
          <p className="opacity-90">
            Há 38 anos, unindo energias para ir mais longe!
          </p>
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
              previousActions.map((action, i) => (
                <div
                  key={i}
                  className="bg-white p-4 border-l-4 border-emerald-500 rounded-xl shadow-sm"
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-emerald-500"
                    />
                    <span>{action}</span>
                  </label>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Apresentação dos Números */}
        <section className="p-8 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-5">
            Apresentação dos Números de Segurança
          </h3>
          <div className="space-y-3">
            {STATES.map((state) => (
              <label
                key={state}
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all"
              >
                <input
                  type="checkbox"
                  onChange={(e) => handleToggleState(state, e.target.checked)}
                  className="w-5 h-5 accent-emerald-500"
                />
                <span className="font-semibold">{state}</span>
              </label>
            ))}
          </div>

          {/* Timer */}
          <div className="text-5xl font-extrabold text-center text-[#1e3c72] my-6 tracking-wider font-mono">
            {formatTime(seconds)}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setIsRunning(true)}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
            >
              Iniciar
            </button>
            <button
              onClick={() => setIsRunning(false)}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
            >
              Pausar
            </button>
            <button
              onClick={() => {
                setIsRunning(false);
                setSeconds(0);
              }}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
            >
              Resetar
            </button>
          </div>
        </section>

        {/* Transcrição */}
        <section className="p-8 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-5">
            Transcrição da Reunião
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Cole a transcrição completa da reunião aqui..."
                className="w-full h-44 p-4 border-2 border-gray-200 rounded-xl resize-y focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full mt-3 py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isAnalyzing ? "Analisando com IA..." : "Analisar com IA"}
              </button>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Ações identificadas
              </h4>
              {analysisMessage && (
                <p className="text-center py-5 text-gray-500">
                  {analysisMessage}
                </p>
              )}
              {suggestions.length === 0 && !analysisMessage && (
                <p className="text-center py-5 text-gray-500">
                  As ações identificadas aparecerão aqui
                </p>
              )}
              <div className="space-y-3">
                {suggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className="bg-white p-4 border-l-4 border-emerald-500 rounded-xl shadow-sm"
                  >
                    <p className="font-medium mb-3">{suggestion}</p>
                    <select
                      value={selectedAreas[i] || STATES[0]}
                      onChange={(e) =>
                        setSelectedAreas((prev) => ({
                          ...prev,
                          [i]: e.target.value,
                        }))
                      }
                      className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-emerald-500"
                    >
                      {STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleApprove(i)}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
                    >
                      Aprovar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Objetivo */}
        <section className="p-8 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-5">
            Objetivo da Reunião
          </h3>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Descreva o objetivo principal desta reunião"
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </section>

        {/* Checklist Final */}
        <section className="p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-5">
            Checklist Final da Ata
          </h3>
          {markedItems.length === 0 ? (
            <p className="text-center py-5 text-gray-500">
              Nenhum item marcado
            </p>
          ) : (
            <div className="space-y-3 mb-5">
              {checklist.map((item, i) =>
                item.done ? (
                  <div
                    key={i}
                    className="bg-gray-50 p-4 border-l-4 border-emerald-500 rounded-xl shadow-sm opacity-70 line-through"
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) =>
                          handleToggleChecklistItem(i, e.target.checked)
                        }
                        className="w-5 h-5 accent-emerald-500"
                      />
                      <span>
                        <strong>{item.type}:</strong> {item.text} — {item.area}
                      </span>
                    </label>
                  </div>
                ) : null,
              )}
            </div>
          )}
          <button
            onClick={handleDownload}
            className="w-full py-4 bg-[#217346] text-white font-semibold text-lg rounded-xl hover:bg-[#185c37] hover:-translate-y-0.5 transition-all"
          >
            Baixar ATA em Excel
          </button>
        </section>
      </div>
    </div>
  );
}
