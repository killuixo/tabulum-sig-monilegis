import React, { useState, useMemo, useEffect } from 'react';

// --- CONFIGURAÇÃO DE CORES MONDRIAN ---
const COLORS = {
  crimson: '#c91429', // Vermelho Carmesim
  mustard: '#eab308', // Mostarda
  teal: '#0f766e',    // Azul Esverdeado
  black: '#000000',
  white: '#ffffff',
  gray: '#f3f4f6'
};

const CHART_COLORS = [COLORS.crimson, COLORS.mustard, COLORS.teal, '#333333'];

// ==========================================
// CONFIGURAÇÕES DE LIGAÇÃO (SIMPLIFICADO)
// ==========================================
// Ele vai tentar ler do Vercel primeiro. Se não encontrar, usa o texto entre aspas.
const GAS_URL = (import.meta && import.meta.env && import.meta.env.VITE_GAS_URL) || 'COLE_SEU_LINK_DO_GOOGLE_AQUI_SE_QUISER';
const APP_PASSWORD = (import.meta && import.meta.env && import.meta.env.VITE_TABULUM_PASSWORD) || 'marquito2026';

// ==========================================
// ÍCONES NATIVOS (Sem dependências externas)
// ==========================================
const SearchIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const UsersIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const MapIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
);
const ChartIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
);
const DatabaseIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
);
const GridIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);
const ListIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
);
const LockIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);
const AlertIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('main'); // 'main' ou 'dashboard'
  
  // Login Handler DIRETO (Igual ao MoniLegis)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    
    // 1. Checa a senha localmente
    if (password !== APP_PASSWORD) {
      setAuthError('Senha incorreta. Acesso negado.');
      setLoading(false);
      return;
    }

    // 2. Faz o Fetch direto no Google Apps Script
    try {
      if (!GAS_URL || GAS_URL === 'COLE_SEU_LINK_DO_GOOGLE_AQUI_SE_QUISER') {
        throw new Error("URL do Google Script não configurada.");
      }

      const response = await fetch(GAS_URL);
      if (!response.ok) {
        throw new Error("Erro na resposta do servidor");
      }
      
      const data = await response.json();
      
      // Se a planilha retornar um erro em JSON
      if (data.error) {
        setAuthError(data.error);
      } else {
        setLeads(data.reverse()); // Inverte para mostrar as linhas mais novas primeiro
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error(error);
      setAuthError('Falha ao conectar. Verifique o link do GAS_URL e sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans selection:bg-yellow-500 selection:text-black">
        <div className="max-w-md w-full bg-white border-4 border-black p-8 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* Mondrian Accents */}
          <div className="absolute top-0 left-0 w-4 h-full bg-teal-700 border-r-4 border-black" />
          <div className="absolute top-0 right-0 w-1/3 h-4 bg-red-700 border-b-4 border-black" />
          
          <div className="pl-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 border-4 border-black mb-6">
              <LockIcon className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-3xl font-black text-black mb-2 tracking-tight">TABULUM</h1>
            <h2 className="text-xl font-bold text-gray-600 mb-6 uppercase tracking-widest">Leads</h2>
            
            <p className="text-sm text-gray-600 mb-8 font-medium">
              Acesso restrito. Insira a chave de segurança para descriptografar os dados da planilha.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha de Acesso"
                  className="w-full p-3 border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold text-center"
                  required
                />
              </div>
              
              {authError && (
                <div className="flex items-center justify-center gap-2 text-red-700 font-bold text-sm bg-red-100 p-2 border-2 border-red-700">
                  <AlertIcon className="w-4 h-4" />
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-bold py-4 px-6 border-4 border-black hover:bg-yellow-400 hover:text-black transition-colors flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? 'Conectando...' : 'Desbloquear Sistema'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-yellow-400">
      <header className="border-b-4 border-black bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center w-full sm:w-auto">
            <div className="bg-red-700 w-16 h-16 border-r-4 border-black flex items-center justify-center shrink-0">
              <DatabaseIcon className="w-8 h-8 text-white" />
            </div>
            <div className="px-4 py-2">
              <h1 className="text-2xl font-black tracking-tighter leading-none">TABULUM</h1>
              <span className="text-sm font-bold text-teal-700 tracking-widest uppercase">Leads</span>
            </div>
          </div>
          
          <div className="flex w-full sm:w-auto border-t-4 sm:border-t-0 border-black h-14 sm:h-16">
            <button
              onClick={() => setActiveTab('main')}
              className={`flex-1 sm:px-8 flex items-center justify-center gap-2 font-bold border-r-4 border-black transition-colors ${
                activeTab === 'main' ? 'bg-yellow-400' : 'hover:bg-gray-100'
              }`}
            >
              <UsersIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Base de Leads</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 sm:px-8 flex items-center justify-center gap-2 font-bold sm:border-l-0 border-black transition-colors ${
                activeTab === 'dashboard' ? 'bg-yellow-400' : 'hover:bg-gray-100'
              }`}
            >
              <ChartIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'main' ? <LeadsView leads={leads} /> : <DashboardView leads={leads} />}
      </main>
    </div>
  );
}

// ==========================================
// ABA 1: VISUALIZAÇÃO PRINCIPAL
// ==========================================
function LeadsView({ leads }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const searchStr = searchTerm.toLowerCase();
      return (
        (lead.nome || '').toLowerCase().includes(searchStr) ||
        (lead.cidade || '').toLowerCase().includes(searchStr) ||
        (lead.bairroRevisado || '').toLowerCase().includes(searchStr) ||
        (lead.email || '').toLowerCase().includes(searchStr) ||
        (lead.whatsapp || '').toLowerCase().includes(searchStr) ||
        (lead.origem || '').toLowerCase().includes(searchStr) ||
        (lead.status || '').toLowerCase().includes(searchStr)
      );
    });
  }, [leads, searchTerm]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const currentItems = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="relative w-full md:w-1/2">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Busca universal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 font-bold"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
          <div className="text-sm font-bold bg-teal-700 text-white px-4 py-2 border-2 border-black">
            {filteredLeads.length} Registros
          </div>
          <div className="flex border-2 border-black">
            <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'}`}>
              <GridIcon className="w-5 h-5" />
            </button>
            <div className="w-0.5 bg-black"></div>
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'}`}>
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentItems.map((lead, idx) => <LeadCard key={lead.id || idx} lead={lead} />)}
        </div>
      ) : (
        <div className="bg-white border-4 border-black overflow-x-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-100 border-b-4 border-black">
                <th className="p-3 font-black border-r-2 border-black">Status</th>
                <th className="p-3 font-black border-r-2 border-black">Nome</th>
                <th className="p-3 font-black border-r-2 border-black">Localização</th>
                <th className="p-3 font-black border-r-2 border-black">Contato</th>
                <th className="p-3 font-black">Origem</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((lead, idx) => (
                <tr key={lead.id || idx} className="border-b-2 border-gray-200 hover:bg-yellow-50 transition-colors">
                  <td className="p-3 border-r-2 border-black">
                    {lead.status === 'repetido' ? (
                      <span className="bg-red-700 text-white text-xs font-bold px-2 py-1 uppercase border border-black">Repetido</span>
                    ) : (
                      <span className="text-gray-500 text-xs font-bold uppercase">{lead.status || 'OK'}</span>
                    )}
                  </td>
                  <td className="p-3 font-bold border-r-2 border-black">{lead.nome || '-'}</td>
                  <td className="p-3 border-r-2 border-black">
                    <div className="text-sm">{lead.cidade || '-'}</div>
                    <div className="text-xs text-gray-500">{lead.bairroRevisado || lead.bairroReplan || '-'}</div>
                  </td>
                  <td className="p-3 border-r-2 border-black">
                    <div className="text-sm">{lead.whatsapp || '-'}</div>
                    <div className="text-xs text-gray-500">{lead.email || '-'}</div>
                  </td>
                  <td className="p-3 text-sm">{lead.origem || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border-4 border-black bg-white font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
          >
            &laquo; Ant
          </button>
          <span className="font-black text-lg bg-white border-4 border-black px-4 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border-4 border-black bg-white font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
          >
            Próx &raquo;
          </button>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead }) {
  const isRepetido = lead.status?.toLowerCase() === 'repetido';
  return (
    <div className={`bg-white border-4 border-black p-4 relative flex flex-col h-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 ${isRepetido ? 'opacity-80' : ''}`}>
      <div className={`absolute top-0 right-0 w-8 h-8 border-b-4 border-l-4 border-black ${isRepetido ? 'bg-red-700' : 'bg-teal-700'}`}></div>
      <div className="mb-2 pr-8">
        {isRepetido && <span className="inline-block bg-red-700 text-white text-[10px] font-black px-2 py-0.5 uppercase border-2 border-black mb-1">Repetido</span>}
        <h3 className="font-black text-lg leading-tight line-clamp-2">{lead.nome || 'Sem Nome'}</h3>
      </div>
      <div className="flex-grow space-y-3 mt-2 text-sm font-medium">
        <div className="bg-gray-50 p-2 border-2 border-black">
          <div className="text-xs text-gray-500 font-bold uppercase mb-0.5">Localização</div>
          <div>{lead.cidade || '-'}</div>
          <div className="text-gray-600">{lead.bairroRevisado || lead.bairroReplan || '-'}, {lead.uf}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 truncate">
            <div className="w-2 h-2 bg-mustard rounded-full shrink-0"></div>
            <span className="truncate">{lead.whatsapp || 'Sem WhatsApp'}</span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <div className="w-2 h-2 bg-black rounded-full shrink-0"></div>
            <span className="truncate">{lead.email || 'Sem E-mail'}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t-4 border-black">
        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Origem</div>
        <div className="text-xs font-bold line-clamp-1">{lead.origem || '-'}</div>
      </div>
    </div>
  );
}

// ==========================================
// ABA 2: DASHBOARD (Nativo Tailwind)
// ==========================================
function DashboardView({ leads }) {
  const [mapView, setMapView] = useState('SC');

  const stats = useMemo(() => {
    const total = leads.length;
    const uniqueLeads = leads.filter(l => l.status?.toLowerCase() !== 'repetido');
    const repetidos = total - uniqueLeads.length;
    
    const cidadesCount = {};
    const bairrosFlnCount = {};
    const origemCount = {};

    uniqueLeads.forEach(l => {
      const cid = l.cidade || 'Não Informado';
      cidadesCount[cid] = (cidadesCount[cid] || 0) + 1;
      
      if (cid.toLowerCase().includes('florian') || cid.toLowerCase().includes('floripa')) {
        const bairro = l.bairroRevisado || l.bairroReplan || 'Não Informado';
        bairrosFlnCount[bairro] = (bairrosFlnCount[bairro] || 0) + 1;
      }

      const orig = l.origem || 'Outros';
      origemCount[orig] = (origemCount[orig] || 0) + 1;
    });

    const topCidades = Object.entries(cidadesCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    const topBairrosFln = Object.entries(bairrosFlnCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    const topOrigens = Object.entries(origemCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    return { total, unique: uniqueLeads.length, repetidos, topCidades, topBairrosFln, topOrigens };
  }, [leads]);

  const maxCidadeValue = stats.topCidades.length > 0 ? stats.topCidades[0].value : 1;
  const totalTopOrigens = stats.topOrigens.reduce((acc, curr) => acc + curr.value, 0) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total de Entradas" value={stats.total} color="bg-black" textColor="text-white" />
        <StatCard title="Leads Únicos" value={stats.unique} color="bg-teal-700" textColor="text-white" />
        <StatCard title="Entradas Repetidas" value={stats.repetidos} color="bg-red-700" textColor="text-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Nativo: Top Cidades */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Top Cidades</h3>
          <div className="space-y-4">
            {stats.topCidades.map((cidade, index) => (
              <div key={cidade.name} className="flex items-center gap-3">
                <div className="w-24 md:w-32 font-bold truncate text-sm" title={cidade.name}>{cidade.name}</div>
                <div className="flex-1 bg-gray-100 h-8 relative border-2 border-black flex items-center">
                  <div 
                    className={`h-full border-r-2 border-black ${index === 0 ? 'bg-red-700' : 'bg-yellow-400'}`} 
                    style={{ width: `${(cidade.value / maxCidadeValue) * 100}%` }}
                  ></div>
                </div>
                <div className="w-12 text-right font-black">{cidade.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico Nativo: Origens */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Origem dos Leads</h3>
          <div className="space-y-4">
            {/* Barra de Progresso Empilhada Mondrian */}
            <div className="w-full h-12 flex border-4 border-black mb-6">
              {stats.topOrigens.map((origem, index) => {
                const percentage = (origem.value / totalTopOrigens) * 100;
                return (
                  <div 
                    key={origem.name} 
                    style={{ width: `${percentage}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    className="h-full border-r-2 border-black last:border-r-0"
                    title={`${origem.name}: ${origem.value}`}
                  ></div>
                );
              })}
            </div>
            
            {/* Legendas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.topOrigens.map((origem, index) => (
                <div key={origem.name} className="flex items-center gap-2 border-2 border-black p-2 bg-gray-50">
                  <div className="w-4 h-4 border-2 border-black shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                  <div className="flex-1 truncate text-xs font-bold" title={origem.name}>{origem.name}</div>
                  <div className="font-black text-sm">{origem.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mapa de Calor Mondrian Native */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="flex flex-col sm:flex-row border-b-4 border-black">
          <div className="p-4 sm:p-6 bg-yellow-400 border-b-4 sm:border-b-0 sm:border-r-4 border-black flex items-center justify-center gap-3 w-full sm:w-1/3 shrink-0">
            <MapIcon className="w-8 h-8" />
            <h3 className="text-xl font-black uppercase">Mapa de Calor</h3>
          </div>
          <div className="flex w-full">
            <button 
              onClick={() => setMapView('SC')}
              className={`flex-1 py-4 font-black uppercase border-r-4 border-black transition-colors ${mapView === 'SC' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
            >
              Santa Catarina
            </button>
            <button 
              onClick={() => setMapView('FLN')}
              className={`flex-1 py-4 font-black uppercase transition-colors ${mapView === 'FLN' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
            >
              Florianópolis
            </button>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider text-center">
            {mapView === 'SC' ? 'Concentração por Município' : 'Concentração por Bairros (Ilha/Continente)'}
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            {(mapView === 'SC' ? stats.topCidades : stats.topBairrosFln).map((item, index) => {
              // Estilização Mondrian baseada na posição do ranking
              let bg = 'bg-white';
              let text = 'text-black';
              if(index === 0) { bg = 'bg-red-700'; text = 'text-white'; }
              else if(index === 1) { bg = 'bg-yellow-400'; text = 'text-black'; }
              else if(index === 2) { bg = 'bg-teal-700'; text = 'text-white'; }
              else if(index === 3) { bg = 'bg-black'; text = 'text-white'; }

              // Tamanho dinâmico do bloco
              const sizeClass = index === 0 ? 'w-full md:w-2/3 h-40 md:h-48 text-2xl' : 
                                index < 3 ? 'w-[45%] md:w-[30%] h-32 md:h-40 text-xl' : 
                                'w-[30%] md:w-[20%] h-24 md:h-28 text-lg';

              return (
                <div key={item.name} className={`${bg} ${text} ${sizeClass} border-4 border-black p-4 flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform`}>
                  <span className="font-black uppercase leading-tight line-clamp-2">{item.name}</span>
                  <span className={`mt-2 font-bold px-2 py-1 text-sm border-2 border-current ${bg === 'bg-white' ? 'bg-gray-100' : 'bg-black/20'}`}>
                    {item.value} leads
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, textColor }) {
  return (
    <div className={`${color} ${textColor} border-4 border-black p-6 relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform`}>
      <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">{title}</h4>
      <div className="text-5xl font-black tracking-tighter">{value}</div>
      <div className="absolute top-0 right-0 w-4 h-4 border-b-4 border-l-4 border-black bg-white"></div>
    </div>
  );
}
