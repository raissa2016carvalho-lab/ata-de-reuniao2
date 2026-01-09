"use client";

import { useState } from "react";
import Image from "next/image";
import { analyzeTranscript } from "./actions";

const STATES = [
  "Ceará",
  "Bahia",
  "Piauí",
  "Rio Grande do Norte",
  "Minas Gerais",
  "São Paulo",
  "Monitoria",
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

/* =========================
   UTIL – REMOVE ACENTOS / EXCEL SAFE
========================= */
const normalizeText = (text: string = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 .,;:!?@()-]/g, "")
    .trim();

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

  const [presentationTimes, setPresentationTimes] = useState<Record<string, number>>({});
  const [individualTimers, setIndividualTimers] = useState<Record<string, NodeJS.Timeout>>({});

  /* =========================
     LOAD CSV – SOMENTE AÇÕES
  ========================= */
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;

      const actions: PreviousActionItem[] = [];

      lines.slice(1).forEach((line) => {
        const cols = line
          .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map((c) => c.replace(/"/g, "").trim());

        const entrada = cols[0];
        const actionText = cols[1];
        const responsavel = cols[2] || "Não definido";

        if (entrada === "Ação" && actionText) {
          actions.push({ action: actionText, responsavel });
        }
      });

      setPreviousActions(actions);
    };

    reader.readAsText(file, "UTF-8");
  };

  /* =========================
     ANALISAR TRANSCRIÇÃO
  ========================= */
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

  const handleAddManualAction = () => {
    if (manualAction.trim()) {
      setSuggestions((p) => [...p, manualAction.trim()]);
      setManualAction("");
    }
  };

  const handleApprove = (index: number) => {
    const action = suggestions[index];
    const area = selectedAreas[index] || STATES[0];

    setChecklist((prev) => [
      ...prev,
      { type: "Ação", text: action, area, done: true },
    ]);

    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  /* =========================
     TIMER APRESENTAÇÃO
  ========================= */
  const formatItemTime = (state: string) => {
    const total = presentationTimes[state] || 0;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleToggleState = (state: string, checked: boolean) => {
    if (checked) {
      const timer = setInterval(() => {
        setPresentationTimes((p) => ({
          ...p,
          [state]: (p[state] || 0) + 1,
        }));
      }, 1000);

      setIndividualTimers((p) => ({ ...p, [state]: timer }));

      setChecklist((p) => [
        ...p,
        { type: "Apresentação", text: state, area: state, done: true },
      ]);
    } else {
      clearInterval(individualTimers[state]);
    }
  };

  /* =========================
     DOWNLOAD CSV – FINAL
  ========================= */
  const handleDownload = () => {
    const actions = checklist.filter((c) => c.type === "Ação");

    if (actions.length === 0) {
      alert("Nenhuma ação para exportar");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    let csv =
      "Saidas_Decisoes_e_Acoes,Tipo,Responsavel,Data,Hora,Status\n";

    actions.forEach((c) => {
      csv += `"${normalizeText(c.text)}",` +
             `"${normalizeText(c.type)}",` +
             `"${normalizeText(c.area)}",` +
             `"${today}",` +
             `"${normalizeText(c.time || "")}",` +
             `"${c.done ? "Concluido" : "Pendente"}"\n`;
    });

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `RELATORIO_REUNIAO_${today}.csv`;
    a.click();
  };

  /* =========================
     JSX
  ========================= */
  return (
    <div className="p-5 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white py-6 px-8">
          <h2 className="text-3xl font-bold">Reunião Semanal de Segurança</h2>
        </div>

        <section className="p-8 border-b">
          <h3 className="font-bold mb-3">Ações da Reunião Anterior</h3>
          <input type="file" accept=".csv" onChange={handleFileLoad} />
        </section>

        <section className="p-8 border-b">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-40 border p-3"
            placeholder="Cole a transcrição"
          />
          <button onClick={handleAnalyze} className="mt-3 bg-emerald-500 text-white px-6 py-2 rounded">
            Analisar
          </button>
        </section>

        <section className="p-8">
          <button
            onClick={handleDownload}
            className="w-full py-4 bg-[#217346] text-white rounded-xl font-semibold"
          >
            📥 Baixar Relatório
          </button>
        </section>
      </div>
    </div>
  );
}
