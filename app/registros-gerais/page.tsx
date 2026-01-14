"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface MeetingGeneral {
  id: string;
  date: string;
  participants: Array<{
    id: string;
    name: string;
    area: string;
  }>;
  objetivo?: string;
  pauta: string[];
  transcript?: string;
  actions: Array<{
    text: string;
    area: string;
    done: boolean;
  }>;
  total_actions: number;
  completed_actions: number;
  pending_actions: number;
  csv_data?: string;
  created_at?: string;
}

export default function RegistrosGeraisPage() {
  const [meetings, setMeetings] = useState<MeetingGeneral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingGeneral | null>(null);

  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    try {
      const { data, error } = await supabase
        .from('meetings_general')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar atas gerais:', error);
        throw error;
      }
      
      setMeetings(data || []);
    } catch (error) {
      console.error('Erro ao carregar atas gerais:', error);
      alert('Erro ao carregar atas. Verifique a conexão com o Supabase.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteMeeting(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta ata?')) return;

    try {
      const { error } = await supabase
        .from('meetings_general')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMeetings(meetings.filter(m => m.id !== id));
      alert('Ata excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir ata:', error);
      alert('Erro ao excluir ata.');
    }
  }

  function handleDownloadCSV(meeting: MeetingGeneral) {
    if (meeting.csv_data) {
      const blob = new Blob([meeting.csv_data], { 
        type: "text/csv;charset=utf-8;" 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ATA_GERAL_${meeting.date.replace(/\//g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert("CSV não encontrado para esta ata");
    }
  }

  const totalMeetings = meetings.length;
  const totalActions = meetings.reduce((sum, m) => sum + m.total_actions, 0);
  const totalCompleted = meetings.reduce((sum, m) => sum + m.completed_actions, 0);
  const totalPending = meetings.reduce((sum, m) => sum + m.pending_actions, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <div className="text-2xl font-bold text-gray-700">Carregando atas gerais...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-5 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white rounded-2xl shadow-2xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">📋 Registros de Atas Gerais</h1>
              <p className="text-lg opacity-90">
                Histórico completo de atas gerais
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/ata-reunioes"
                className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                ➕ Nova Ata Geral
              </a>
              <a
                href="/"
                className="px-6 py-3 bg-white text-[#1e3c72] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                ← Voltar
              </a>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {totalMeetings}
            </div>
            <div className="text-gray-600 font-semibold">Total de Atas</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {totalActions}
            </div>
            <div className="text-gray-600 font-semibold">Total de Ações</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {totalCompleted}
            </div>
            <div className="text-gray-600 font-semibold">Ações Concluídas</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {totalPending}
            </div>
            <div className="text-gray-600 font-semibold">Ações Pendentes</div>
          </div>
        </div>

        {/* Lista de Atas */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6">
            <h2 className="text-2xl font-bold">Histórico de Atas Gerais</h2>
          </div>

          {meetings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                Nenhuma ata salva ainda
              </h3>
              <p className="text-gray-500 mb-6">
                Comece criando sua primeira ata geral
              </p>
              <a
                href="/ata-reunioes"
                className="inline-block px-8 py-4 bg-[#1e3c72] text-white font-semibold rounded-xl hover:bg-[#2a5298] transition-all shadow-lg"
              >
                Criar Nova Ata Geral
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Data
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Participantes
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">
                      Total de Ações
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">
                      Concluídas
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">
                      Pendentes
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {meetings.map((meeting) => (
                    <tr
                      key={meeting.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">📅</span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {meeting.date}
                            </div>
                            <div className="text-sm text-gray-500">
                              Ata Geral
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {meeting.participants.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {meeting.participants.slice(0, 3).map((p, i) => (
                                <span key={i} className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                  {p.name}
                                </span>
                              ))}
                              {meeting.participants.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  +{meeting.participants.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Sem participantes</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-700">
                          {meeting.total_actions}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          {meeting.completed_actions}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          {meeting.pending_actions}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setSelectedMeeting(meeting)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all"
                          >
                            👁️ Ver Detalhes
                          </button>
                          <button
                            onClick={() => handleDownloadCSV(meeting)}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all"
                          >
                            📥 Baixar CSV
                          </button>
                          <button
                            onClick={() => deleteMeeting(meeting.id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-all"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Detalhes */}
        {selectedMeeting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white p-6 sticky top-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">📋 Detalhes da Ata - {selectedMeeting.date}</h2>
                  <button
                    onClick={() => setSelectedMeeting(null)}
                    className="px-4 py-2 bg-white text-[#1e3c72] font-semibold rounded-lg hover:bg-gray-100 transition-all"
                  >
                    ✖ Fechar
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Objetivo */}
                {selectedMeeting.objetivo && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">🎯 Objetivo da Reunião</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedMeeting.objetivo}</p>
                  </div>
                )}

                {/* Participantes */}
                {selectedMeeting.participants.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">👥 Participantes ({selectedMeeting.participants.length})</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedMeeting.participants.map((p, i) => (
                        <div key={i} className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          <p className="text-sm text-gray-600">{p.area}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pauta */}
                {selectedMeeting.pauta.filter(Boolean).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">📌 Pauta</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      {selectedMeeting.pauta.filter(Boolean).map((item, i) => (
                        <li key={i} className="text-gray-700 bg-blue-50 p-3 rounded-lg">{item}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Ações */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">✅ Ações ({selectedMeeting.actions.length})</h3>
                  <div className="space-y-2">
                    {selectedMeeting.actions.map((action, i) => (
                      <div key={i} className="bg-gray-50 border-l-4 border-emerald-500 p-4 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-gray-800 font-medium">{action.text}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-semibold">Responsável:</span>{" "}
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {action.area}
                              </span>
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            action.done 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {action.done ? "✓ Concluído" : "⏳ Pendente"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transcrição */}
                {selectedMeeting.transcript && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">📝 Transcrição</h3>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">{selectedMeeting.transcript}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Sistema de Gestão de Atas de Reunião</p>
          <p className="mt-1">Há 38 anos, unindo energias para ir mais longe!</p>
        </div>
      </div>
    </div>
  );
}
