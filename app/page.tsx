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
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [objective, setObjective] = useState("");
  const [previousActions, setPreviousActions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  // ⏱ Timer
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  };

  // 📂 CARREGAR CSV (CORRIGIDO)
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      const separator = text.includes(";") ? ";" : ",";
      const lines = text.split(/\r?\n/).filter(Boolean);

      if (lines.length < 2) return;

      const headers = lines[0]
        .replace("\uFEFF", "")
        .split(separator)
        .map((h) => h.trim().toLowerCase());

      const tipoIndex = headers.indexOf("tipo");
      const descIndex = headers.indexOf("descrição");

      if (tipoIndex === -1 || descIndex === -1) {
        alert("CSV inválido: colunas TIPO ou DESCRIÇÃO não encontradas");
        return;
      }

      const actions: string[] = [];

      lines.slice(1).forEach((line) => {
        const cols = line
          .split(separator)
          .map((c) => c.replace(/"/g, "").trim());

        const tipo = cols[tipoIndex]?.toLowerCase();
        const descricao = cols[descIndex];

        if (
          (tipo === "ação" || tipo === "ação anterior") &&
          descricao
        ) {
          actions.push(descricao);
        }
      });

      setPreviousActions(actions);
    };

    reader.readAsText(file, "utf-8");
  };

  // 🤖 IA
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
      setSuggestions(result.actions);
      setAnalysisMessage("");
    }

    setIsAnalyzing(false);
  };

  // ✅ Aprovar ação IA
  const handleApprove = (index: number) => {
    const action = suggestions[index];
    const area = selectedAreas[index] || STATES[0];

    setChecklist((prev) => [
      ...prev,
      { type: "Ação", text: action, area, done: true },
    ]);

    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  // 📍 Estados
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

  const handleToggleChecklistItem = (index: number, checked: boolean) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: checked } : item)),
    );
  };

  // 📥 EXPORTAR CSV
  const handleDownload = () => {
    const markedItems = checklist.filter((c) => c.done);
    if (markedItems.length === 0) {
      alert("Marque pelo menos um item");
      return;
    }

    const today = new Date();
    const prazo = new Date(today);
    prazo.setDate(prazo.getDate() + 7);

    const f = (d: Date) => d.toISOString().split("T")[0];
    const obj = objective || "Reunião Semanal de Segurança";

    let csv =
      "TIPO,DESCRIÇÃO,ÁREA,DATA,PRAZO,STATUS,OBJETIVO,TEMPO\n";

    markedItems.forEach((c) => {
      csv += `${c.type},"${c.text}",${c.area},${f(today)},${f(
        prazo,
      )},Concluído,"${obj}",${formatTime(seconds)}\n`;
    });

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ATA_REUNIAO_${f(today)}.csv`;
    a.click();
  };

  const markedItems = checklist.filter((c) => c.done);

  return (
    <div className="p-5 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="bg-linear-to-r from-[#1e3c72] to-[#2a5298] text-white py-10 px-8 text-center">
          <h2 className="text-3xl font-bold mb-2">
            Reunião Semanal de Segurança
          </h2>
          <p className="opacity-90">
            Há 38 anos, unindo energias para ir mais longe!
          </p>
        </div>

        {/* AÇÕES ANTERIORES */}
        <section className="p-8 border-b">
          <h3 className="text-xl font-bold mb-5">
            Ações da Reunião Anterior
          </h3>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileLoad}
            className="w-full p-3 border-2 rounded-xl mb-4 file:bg-emerald-500 file:text-white file:px-4 file:py-2 file:rounded-lg"
          />

          {previousActions.length === 0 ? (
            <p className="text-gray-500 text-center">
              Nenhuma ação carregada
            </p>
          ) : (
            <div className="space-y-3">
              {previousActions.map((a, i) => (
                <div
                  key={i}
                  className="p-4 border-l-4 border-emerald-500 rounded-xl bg-white shadow"
                >
                  {a}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RESTANTE DO FLUXO SEGUE IGUAL */}
        {/* Checklist final + exportação continuam funcionando */}
      </div>
    </div>
  );
}
