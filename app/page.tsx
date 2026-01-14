"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c72] via-[#2a5298] to-[#1e3c72] flex items-center justify-center p-5">
      <div className="max-w-5xl w-full">
        {/* Logo e Header */}
        <div className="text-center mb-12">
          <img
            src="/LogoBeqbranca.png"
            alt="Logo Beq"
            className="w-48 h-auto mx-auto mb-6 drop-shadow-2xl"
          />
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            AI Ata de Reunião
          </h1>
          <p className="text-xl text-white/90 font-medium">
            Há 38 anos, unindo energias para ir mais longe!
          </p>
        </div>

        {/* Cards de Seleção */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Card Reunião Semanal de Segurança */}
          <Link href="/reuniao-seguranca">
            <div className="group bg-white rounded-3xl shadow-2xl p-8 hover:shadow-3xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-4 border-transparent hover:border-emerald-500">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="text-5xl">🛡️</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4 group-hover:text-emerald-600 transition-colors">
                  Reunião Semanal de Segurança
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  Apresentação dos números de segurança por estado, ações e acompanhamento de indicadores.
                </p>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-500 text-xl">✓</span>
                    <span className="text-gray-700">Números por SESMT (7 estados)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-500 text-xl">✓</span>
                    <span className="text-gray-700">Controle de tempo de apresentação</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-500 text-xl">✓</span>
                    <span className="text-gray-700">Ações com responsáveis por área</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-500 text-xl">✓</span>
                    <span className="text-gray-700">Importação de ações anteriores (CSV)</span>
                  </div>
                </div>
                <div className="mt-8">
                  <div className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl group-hover:from-emerald-600 group-hover:to-emerald-700 transition-all shadow-lg text-center">
                    Iniciar Reunião de Segurança →
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Card Atas Gerais */}
          <Link href="/ata-reunioes">
            <div className="group bg-white rounded-3xl shadow-2xl p-8 hover:shadow-3xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-4 border-transparent hover:border-blue-500">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="text-5xl">🎤</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4 group-hover:text-blue-600 transition-colors">
                  Atas de Reuniões Gerais
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  Reuniões corporativas gerais com participantes, pauta, objetivo e transcrição inteligente.
                </p>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">✓</span>
                    <span className="text-gray-700">Cadastro de participantes</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">✓</span>
                    <span className="text-gray-700">Objetivo e pauta da reunião</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">✓</span>
                    <span className="text-gray-700">Transcrição com comandos de voz</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">✓</span>
                    <span className="text-gray-700">Ações com responsáveis personalizados</span>
                  </div>
                </div>
                <div className="mt-8">
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl group-hover:from-blue-600 group-hover:to-blue-700 transition-all shadow-lg text-center">
                    Iniciar Ata Geral →
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Cards de Acesso Rápido aos Registros */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/registros">
            <div className="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer border-2 border-white/20 hover:border-white/40">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📊</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Registros de Segurança
                  </h3>
                  <p className="text-white/80 text-sm">
                    Histórico de reuniões semanais
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/registros-gerais">
            <div className="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer border-2 border-white/20 hover:border-white/40">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📋</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Registros Gerais
                  </h3>
                  <p className="text-white/80 text-sm">
                    Histórico de atas gerais
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Rodapé */}
        <div className="text-center mt-12">
          <p className="text-white/70 text-sm">
            Sistema de Gestão de Reuniões com IA • Versão 2.0
          </p>
        </div>
      </div>
    </div>
  );
}
