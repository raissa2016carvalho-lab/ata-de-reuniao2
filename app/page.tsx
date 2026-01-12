"use client";

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-5 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white rounded-2xl shadow-2xl p-8 mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4">🛡️ Sistema de Segurança</h1>
          <p className="text-xl opacity-90">
            Escolha o tipo de registro que deseja realizar
          </p>
        </div>

        {/* Cards de Escolha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Card 1 - Reunião Completa */}
          <a
            href="/reuniao-completa"
            className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border-2 border-transparent hover:border-[#1e3c72]"
          >
            <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] p-6 text-center">
              <div className="text-6xl mb-3">📊</div>
              <h2 className="text-2xl font-bold text-white">
                Reunião de Segurança Completa
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4 text-center leading-relaxed">
                Interface completa com KPIs, apresentação de números de segurança,
                ações de reunião anterior e transcrição de ata.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Ações de Reunião Anterior
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Números de Segurança (KPIs)
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Transcrição e Análise com IA
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Relatório Completo em CSV
                </li>
              </ul>
              <div className="text-center">
                <span className="inline-block px-6 py-3 bg-[#1e3c72] text-white font-semibold rounded-xl group-hover:bg-[#2a5298] transition-all">
                  Acessar Reunião Completa →
                </span>
              </div>
            </div>
          </a>

          {/* Card 2 - Transcrição Simples */}
          <a
            href="/transcricao-simples"
            className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border-2 border-transparent hover:border-purple-600"
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-center">
              <div className="text-6xl mb-3">✍️</div>
              <h2 className="text-2xl font-bold text-white">
                Transcrição Simples
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4 text-center leading-relaxed">
                Interface simplificada focada apenas na transcrição de reuniões
                e identificação de ações com IA.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-gray-700">
                  <span className="text-purple-500 mr-2">✓</span>
                  Transcrição de Reunião
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-purple-500 mr-2">✓</span>
                  Análise Automática com IA
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-purple-500 mr-2">✓</span>
                  Identificação de Ações
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-purple-500 mr-2">✓</span>
                  Exportação em CSV
                </li>
              </ul>
              <div className="text-center">
                <span className="inline-block px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl group-hover:bg-purple-800 transition-all">
                  Acessar Transcrição Simples →
                </span>
              </div>
            </div>
          </a>

        </div>

        {/* Link para Registros */}
        <div className="text-center mt-12">
          <a
            href="/registros"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
          >
            📋 Ver Histórico de Registros
          </a>
        </div>

        {/* Rodapé */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Sistema de Gestão de Reuniões de Segurança</p>
          <p className="mt-1">Há 38 anos, unindo energias para ir mais longe!</p>
        </div>
      </div>
    </div>
  );
}
