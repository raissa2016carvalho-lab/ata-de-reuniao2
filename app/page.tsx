"use client";

import { useState } from "react";
import Image from "next/image";
import { analyzeTranscript } from "./actions";

const STATES = [
  "Ceará ",
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

export default function Home() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>({});
  const [selectedStatus, setSelectedStatus] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [manualAction, setManualAction] = useState("");
  const [objective, setObjective] = useState("");
  const [previousActions, setPreviousActions] = useState<PreviousActionItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  const [presentationTimes, setPresentationTimes] = useState<Record<string, number>>({});
  const [individualTimers, setIndividualTimers] = useState<Record<string, NodeJS.Timeout>>({});

  /* =========================
     LOAD CSV – REUNIÃO ANTERIOR
  ========================= */
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      const actions: PreviousActionItem[] = [];

      lines.slice(1).forEach((line) => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        const entrada =
          cols[0]?.replace(/"/g, "").trim().toLowerCase() || "";

        if (entrada.includes("ação")) {
          const actionText = cols[1]?.replace(/"/g, "").trim();
          const responsavel =
            cols[2]?.replace(/"/g, "").trim() || "Não definido";

          if (actionText) {
            actions.push({
              action: actionText,
              responsavel,
            });
          }
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
      setAnalysisMessage("Nenhuma ação identificada na transcrição");
    } else {
      setSuggestions(result.actions);
      setAnalysisMessage("");
    }

    setIsAnalyzing(false);
  };

  /* =========================
     AÇÃO MANUAL
  ========================= */
  const handleAddManualAction = () => {
    if (manualAction.trim()) {
      setSuggestions((prev) => [...prev, manualAction.trim()]);
      setManualAction("");
    }
  };

  /* =========================
     APROVAR AÇÃO
  ========================= */
  const handleApprove = (index: number) => {
    const action = suggestions[index];
    const area = selectedAreas[index] || STATES[0];
    const status = selectedStatus[index] || "Concluído";

    setChecklist((prev) => [
      ...prev,
      {
        type: "Ação",
        text: action,
        area,
        done: status === "Concluído",
      },
    ]);

    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  /* =========================
     TIMER APRESENTAÇÃO
  ========================= */
  const formatItemTime = (state: string) => {
    const totalSeconds = presentationTimes[state] || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStopTimer = (state: string) => {
    if (individualTimers[state]) {
      clearInterval(individualTimers[state]);

      setIndividualTimers((prev) => {
        const t = { ...prev };
        delete t[state];
        return t;
      });

      const finalTime = formatItemTime(state);

      setChecklist((prev) =>
        prev.map((item) =>
          item.type === "Apresentação" && item.text === state
            ? { ...item, time: finalTime }
            : item
        )
      );
    }
  };

  const handleToggleState = (state: string, checked: boolean) => {
    if (checked) {
      const timerId = setInterval(() => {
        setPresentationTimes((prev) => ({
          ...prev,
          [state]: (prev[state] || 0) + 1,
        }));
      }, 1000);

      setIndividualTimers((prev) => ({
        ...prev,
        [state]: timerId,
      }));

      setChecklist((prev) => [
        ...prev.filter(
          (c) => !(c.type === "Apresentação" && c.text === state)
        ),
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
        prev.filter(
          (c) => !(c.type === "Apresentação" && c.text === state)
        )
      );
    }
  };

  /* =========================
     DOWNLOAD CSV (IGUAL AO ORIGINAL)
  ========================= */
  const handleDownload = () => {
    const actionItems = checklist.filter((c) => c.type === "Ação");
    if (actionItems.length === 0) return;

    const today = new Date().toISOString().split("T")[0];

    let csv = `"Saídas: Decisões e ações",Responsável,Data,Status\n`;

    actionItems.forEach((c) => {
      csv += `"${c.text}","${c.area}","${today}","${
        c.done ? "Concluído" : "Pendente"
      }"\n`;
    });

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `RELATORIO_REUNIAO_${today}.csv`;
    a.click();
  };

  const pendingItems = checklist.filter((c) => !c.done);

  /* =========================
     JSX
  ========================= */
  return (
    <div className="p-5 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white py-6 px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-1">
                Reunião Semanal de Segurança
              </h2>
              <p className="opacity-90">
                Há 38 anos, unindo energias para ir mais longe!
              </p>
            </div>

            <Image
              src="/Logo-Beq-branca.jpg"
              alt="Logo Beq"
              width={140}
              height={40}
            />
          </div>
        </div>

        {/* botão final */}
        <section className="p-8">
          <button
            onClick={handleDownload}
            className="w-full py-4 bg-[#217346] text-white font-semibold rounded-xl"
          >
            📥 Baixar Relatório
          </button>
        </section>
      </div>
    </div>
  );
}
