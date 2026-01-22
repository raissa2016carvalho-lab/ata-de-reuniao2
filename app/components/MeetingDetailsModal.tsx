"use client";

import { useState } from "react";

interface Action {
  text: string;
  area: string;
  done: boolean;
  time?: string;
  type: string;
}

interface MeetingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    date: string;
    presentations: number;
    actions: number;
    completed: number;
    pending: number;
    csv_data: string;
  } | null;
}

export default function MeetingDetailsModal({ isOpen, onClose, meeting }: MeetingDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"actions" | "transcript">("actions");

  if (!isOpen || !meeting) return null;

  // Parse CSV para extrair ações e transcrição
  const parseCSV = () => {
    const lines = meeting.csv_data.split('\n').filter(line => line.trim());
    const actions: Action[] = [];
    let transcription = "";

    // Pular header (primeira linha)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Parse CSV respeitando aspas
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.replace(/^"|"$/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.replace(/^"|"$/g, ''));

      if (values.length >= 4) {
        const [tipo, texto, responsavel, data, status, tempo] = values;
        
        if (tipo === "Ação") {
          actions.push({
            type: tipo,
            text: texto,
            area: responsavel,
            done: status === "Concluído",
            time: tempo
          });
        } else if (tipo === "Apresentação") {
          actions.push({
            type: tipo,
            text: texto,
            area: responsavel,
            done: status === "Concluído",
            time: tempo
          });
        }
      }
    }

    // Tentar extrair transcrição (se existir no CSV ou em outro campo)
    // Por enquanto, vamos deixar como placeholder
    transcription = "Transcrição não disponível para esta reunião. Para incluir transcrições nas próximas reuniões, certifique-se de salvá-las junto com as ações.";

    return { actions, transcription };
  };

  const { actions, transcription } = parseCSV();

  const actionItems = actions.filter(a => a.type === "Ação");
  const presentationItems = actions.filter(a => a.type === "Apresentação");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white py-6 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              📋 Detalhes da Ata - {meeting.date}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              {meeting.presentations} apresentações • {meeting.actions} ações • {meeting.completed} concluídas • {meeting.pending} pendentes
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-8">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("actions")}
              className={`py-4 px-6 font-semibold transition-all ${
                activeTab === "actions"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              📊 Ações ({actionItems.length + presentationItems.length})
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`py-4 px-6 font-semibold transition-all ${
                activeTab === "transcript"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              📝 Transcrição
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-8">
          {activeTab === "actions" && (
            <div className="space-y-6">
              {/* Apresentações */}
              {presentationItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    🗺️ Apresentações por SESMT ({presentationItems.length})
                  </h3>
                  <div className="space-y-3">
                    {presentationItems.map((item, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border-l-4 ${
                          item.done 
                            ? "bg-green-50 border-green-500" 
                            : "bg-gray-50 border-gray-400"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {item.done ? (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                                  ✓ Concluído
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-full">
                                  ⏳ Pendente
                                </span>
                              )}
                              {item.time && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-mono font-bold rounded-full">
                                  ⏱️ {item.time}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-800 font-semibold">{item.text}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Responsável:</strong> {item.area}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações */}
              {actionItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    ✅ Ações de Segurança ({actionItems.length})
                  </h3>
                  <div className="space-y-3">
                    {actionItems.map((item, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border-l-4 ${
                          item.done 
                            ? "bg-green-50 border-green-500" 
                            : "bg-yellow-50 border-yellow-500"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {item.done ? (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                                  ✓ Concluído
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                                  ⏳ Pendente
                                </span>
                              )}
                            </div>
                            <p className="text-gray-800">{item.text}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Responsável:</strong> {item.area}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {actionItems.length === 0 && presentationItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhuma ação ou apresentação registrada nesta reunião</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "transcript" && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📄 Transcrição da Reunião
                </h3>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {transcription}
                  </p>
                </div>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Dica:</strong> Para incluir transcrições completas nas próximas reuniões, 
                    certifique-se de salvar o campo de transcrição junto com as ações no sistema.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
