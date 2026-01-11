"use client";

import { useState, useEffect } from "react";

interface Meeting {
  id: string;
  date: string;
  presentations: number;
  actions: number;
  completed: number;
  pending: number;
}

export default function RegistrosPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);

  // Carregar reuniões salvas
  useEffect(() => {
    const savedMeetings = localStorage.getItem("meetings");
    if (savedMeetings) {
      setMeetings(JSON.parse(savedMeetings));
    } else {
      // Dados de exemplo para demonstração
      setMeetings([
        {
          id: "2026-01-10",
          date: "10/01/2026",
          presentations: 7,
          actions: 6,
          completed: 6,
          pending: 0,
        },
        {
          id: "2026-01-03",
          date: "03/01/2026",
          presentations: 7,
          actions: 8,
          completed: 5,
          pending: 3,
        },
      ]);
    }
  }, []);

  const totalMeetings = meetings.length;
  const totalActions = meetings.reduce((sum, m) => sum + m.actions, 0);
  const totalCompleted = meetings.reduce((sum, m) => sum + m.completed, 0);
  const totalPending = meetings.reduce((sum, m) => sum + m.pending, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-5 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white rounded-2xl shadow-2xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">📋 Registros Gerais</h1>
              <p className="text-lg opacity-90">
                Histórico completo de reuniões de segurança
              </p>
            </div>
            <a
              href="/"
              className="px-6 py-3 bg-white text-[#1e3c72] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              ← Voltar para Reunião
            </a>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {totalMeetings}
            </div>
            <div className="text-gray-600 font-semibold">Total de Reuniões</div>
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

        {/* Lista de Reuniões */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6">
            <h2 className="text-2xl font-bold">Histórico de Reuniões</h2>
          </div>

          {meetings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                Nenhuma reunião salva ainda
              </h3>
              <p className="text-gray-500 mb-6">
                Comece criando sua primeira ata de reunião
              </p>
              <a
                href="/"
                className="inline-block px-8 py-4 bg-[#1e3c72] text-white font-semibold rounded-xl hover:bg-[#2a5298] transition-all shadow-lg"
              >
                Criar Nova Reunião
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
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">
                      Apresentações
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
                              Reunião Semanal
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                          {meeting.presentations}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-700">
                          {meeting.actions}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          {meeting.completed}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          {meeting.pending}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setSelectedMeeting(meeting.id)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all"
                          >
                            👁️ Ver Detalhes
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = `/relatorios/${meeting.id}.csv`;
                              link.download = `RELATORIO_${meeting.date.replace(/\//g, "-")}.csv`;
                              link.click();
                            }}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all"
                          >
                            📥 Baixar
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

        {/* Rodapé */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Sistema de Gestão de Reuniões de Segurança</p>
          <p className="mt-1">Há 38 anos, unindo energias para ir mais longe!</p>
        </div>
      </div>
    </div>
  );
}
