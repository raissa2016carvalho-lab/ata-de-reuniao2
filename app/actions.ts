"use client";
import { useState } from "react";
import VoiceRecorder from "./VoiceRecorder";
import { analyzeTranscript } from "./actions";

export default function MeetingPage() {
  const [transcript, setTranscript] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleTranscriptUpdate = (newTranscript: string) => {
    setTranscript(newTranscript);
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      setError("Não há transcrição para analisar");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    
    try {
      const result = await analyzeTranscript(transcript);
      
      if (result.error) {
        setError(result.error);
      } else {
        setActions(result.actions);
      }
    } catch (err) {
      setError("Erro ao analisar a transcrição");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Ata de Reunião de Segurança
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Gravação de Voz
          </h2>
          <VoiceRecorder onTranscriptUpdate={handleTranscriptUpdate} />
        </div>

        {transcript && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Análise de Ações
              </h2>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  isAnalyzing
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {isAnalyzing ? "Analisando..." : "Extrair Ações"}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg mb-4">
                {error}
              </div>
            )}

            {actions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Ações Identificadas:
                </h3>
                <ul className="space-y-2">
                  {actions.map((action, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <span className="text-green-600 font-bold text-lg">
                        {index + 1}.
                      </span>
                      <span className="text-gray-800">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
