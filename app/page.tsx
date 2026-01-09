"use client";

import { useState } from "react";
import Image from "next/image";
import { analyzeTranscript } from "./actions";

/* =========================
   CONSTANTES
========================= */

const STATES = [
  "Ceará",
  "Bahia",
  "Piauí",
  "Rio Grande do Norte",
  "Minas Gerais",
  "São Paulo",
  "Monitoria",
];

/* =========================
   TIPOS
========================= */

interface ChecklistItem {
  type: string; // "Ação" | "Apresentação"
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
   FUNÇÕES AUXILIARES
========================= */

// remove acentos e caracteres estranhos
const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s:.-]/g, "")
    .trim();

// split CSV respeitando aspas
const splitCSVLine = (line: string) =>
  line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v =>
    v.replace(/^"|"$/g, "").trim()
  );

/* =========================
   COMPONENTE
========================= */

export default function Home() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [manualAction, setManualAction] = useState("");
  const [previousActions, setPreviousActions] = useState<PreviousActionItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  /* =========================
     UPLOAD CSV (SÓ AÇÕES)
  ========================= */

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const actions: PreviousActionItem[] = [];

      lines.slice(1).forEach(line => {
        const cols = splitCSVLine(line);

        const tipo = normalizeText(cols[0] || "").toLowerCase();
        const acao = cols[1];
        const responsavel = cols[2];

        // ✔️ SOMENTE QUANDO A COLUNA ENTRADA FOR "acao"
        if (tipo === "acao" && acao) {
          actions.push({
            action: acao,
            responsavel: responsavel || "Nao definido",
          });
        }
      });

      setPreviousActions(actions);
    };

    reader.readAsText(file, "UTF-8");
  };

  /* =========================
     IA
  ========================= */

  const handleAnalyze = async () => {
    if (!transcript.trim()) return alert("Cole a transcrição");

    setIsAnalyzing(true);
    setAnalysisMessage("IA analisando...");

    const result = await analyzeTranscript(transcript);

    if (result.error) setAnalysisMessage(result.error);
    else setSuggestions(result.actions);

    setIsAnalyzing(false);
  };

  /* =========================
     APROVAR AÇÃO
  ========================= */

  const handleApprove = (index: number) => {
    setChecklist(prev => [
      ...prev,
      {
        type: "Ação",
        text: suggestions[index],
        area: selectedAreas[index] || STATES[0],
        done: true,
      },
    ]);

    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  /* =========================
     DOWNLOAD CSV (BONITINHO)
  ========================= */

  const handleDownload = () => {
    const actions = checklist.filter(c => c.type === "Ação");

    if (actions.length === 0) {
      alert("Nenhuma ação para exportar");
      return;
    }

    let csv =
      "Tipo,Acao,Responsavel,Hora,Data,Status\n";

    const today = new Date().toISOString().split("T")[0];

    actions.forEach(a => {
      csv += `"acao","${normalizeText(a.text)}","${normalizeText(
        a.area
      )}","${a.time || ""}","${today}","${
        a.done ? "Concluido" : "Pendente"
      }"\n`;
    });

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `RELATORIO_ACOES_${today}.csv`;
    link.click();
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white p-6 flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reunião Semanal</h1>
            <p className="text-sm opacity-90">Checklist Inteligente</p>
          </div>
          <Image src="/Logo-Beq-branca.jpg" alt="logo" width={120} height={40} />
        </div>

        {/* CSV ANTERIOR */}
        <section className="p-6">
          <h2 className="font-bold mb-3">Ações da reunião anterior</h2>
          <input type="file" accept=".csv" onChange={handleFileLoad} />

          <ul className="mt-4 space-y-2">
            {previousActions.map((a, i) => (
              <li key={i} className="p-3 border rounded">
                <strong>{a.action}</strong>
                <span className="ml-2 text-sm text-gray-600">
                  ({a.responsavel})
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* TRANSCRIÇÃO */}
        <section className="p-6 border-t">
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            className="w-full h-40 border rounded p-3"
            placeholder="Cole a transcrição..."
          />

          <button
            onClick={handleAnalyze}
            className="mt-3 bg-emerald-600 text-white px-6 py-3 rounded"
          >
            Analisar IA
          </button>
        </section>

        {/* AÇÕES */}
        <section className="p-6 border-t">
          {suggestions.map((s, i) => (
            <div key={i} className="flex gap-3 mb-2">
              <span className="flex-1">{s}</span>
              <select
                onChange={e =>
                  setSelectedAreas(p => ({ ...p, [i]: e.target.value }))
                }
              >
                {STATES.map(st => (
                  <option key={st}>{st}</option>
                ))}
              </select>
              <button
                onClick={() => handleApprove(i)}
                className="bg-blue-600 text-white px-3 rounded"
              >
                Aprovar
              </button>
            </div>
          ))}
        </section>

        {/* DOWNLOAD */}
        <section className="p-6 border-t">
          <button
            onClick={handleDownload}
            className="w-full bg-[#217346] text-white py-4 rounded-xl"
          >
            📥 Baixar Excel (somente ações)
          </button>
        </section>
      </div>
    </div>
  );
}
