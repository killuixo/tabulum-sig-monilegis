import React, { useState, useEffect, useMemo } from 'react';

const MONDRIAN_COLORS = [
  'bg-[#c41e3a]', // Carmesim
  'bg-[#008080]', // Azul Esverdeado
  'bg-[#ffdb58]', // Mostarda
];

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de Busca e Visão
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('card'); 
  const [activeTab, setActiveTab] = useState('processo'); 
  
  // Estados dos Filtros Avançados e Rápidos
  const [showFilters, setShowFilters] = useState(false);
  const [toggleAprovadas, setToggleAprovadas] = useState(false);
  const [toggleUtilidade, setToggleUtilidade] = useState(false);
  const [filters, setFilters] = useState({
    tipo: [],
    situacao: [],
    relator: [],
    vista: []
  });

  // Estados de Interação
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(''); 
  const [selectedItem, setSelectedItem] = useState(null);

  const formatarData = (dataString) => {
    if (!dataString || dataString === '-') return '-';
    const apenasData = dataString.split(/[T ]/)[0];
    if (apenasData.includes('-')) {
      return apenasData.split('-').reverse().join('/');
    }
    return apenasData;
  };

  const formatarUltimoMovimento = (texto) => {
    if (!texto) return '-';
    return texto.replace(/^\d{2}\/\d{2}\/\d{4}\s*-\s*/, '');
  };

  const getNumero = (item) => item['Número da Proposição'] || item['Numero da Proposicao'] || item['numero'] || '';
  const getEmenta = (item) => item['Ementa'] || item['ementa'] || item['EMENTA'] || item['Resumo'] || '';
  const getUltimoMovimento = (item) => item['Último Movimento'] || item['Ultimo Movimento'] || item['Ultimo movimento'] || item['ultimo movimento'] || '';
  const getRelator = (item) => item['Relator(a) na Comissão'] || item['Relator'] || item['relator'] || '';
  const getSituacao = (item) => item['Situação'] || item['Situacao'] || item['situacao'] || '';
  const getSetor = (item) => item['Setor Atual'] || item['Setor atual'] || item['setor'] || '';
  const getObservacoes = (item) => item['Observações'] || item['Observacoes'] || item['observacoes'] || '';
  const getLink = (item) => item['Link'] || item['link'] || '';
  const getTipoProposicao = (item) => item['Tipo de Proposição'] || item['Tipo de Proposicao'] || (activeTab === 'processo' ? 'Processo' : 'Atividade');
  const getPedidoVista = (item) => {
      let v = item['Pedido de Vista'] || item['pedido de vista'] || item['Pedido de vista'] || '';
      return (v === '-') ? '' : v;
  };
  const getInformacaoRelatoria = (item) => {
      let r = item['Informação da Relatoria'] || item['Informacao da relatoria'] || item['Informacao da Relatoria'] || item['informacao_relatoria'] || '';
      return (r === '-') ? '' : r;
  };
  const getLinksAdicionais = (item) => {
      return item['Links Adicionais'] || item['links_adicionais'] || item['Links adicionais'] || '';
  };

  const getMacroSituacao = (item) => {
    const s = getSituacao(item).toLowerCase();
    const linksAdicProp = getLinksAdicionais(item);
    let isAprovadaPorLink = false;
    try {
      if (linksAdicProp && linksAdicProp !== '-') {
         const parsedLinks = JSON.parse(linksAdicProp);
         isAprovadaPorLink = parsedLinks.some(l => l.label.toLowerCase().includes('transformado em lei') || l.label.toLowerCase().includes('promulgad'));
      }
    } catch(e) {}

    if (isAprovadaPorLink || s.includes('transformado em lei') || s.includes('norma jurídica')) return 'Aprovados';
    if (s.includes('veto') || s.includes('vetad')) return 'Vetados';
    if (s.includes('arquivad') || s.includes('rejeitad') || s.includes('retirad') || s.includes('concluíd')) return 'Arquivados';
    return 'Em Tramitação';
  };

  const API_URL = (() => {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
      }
    } catch (e) {}
    try {
      if (typeof process !== 'undefined' && process.env) {
        return process.env.VITE_API_URL || process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL;
      }
    } catch (e) {}
    return "COLE_SUA_URL_DO_SCRIPT_AQUI";
  })();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL || API_URL === "COLE_SUA_URL_DO_SCRIPT_AQUI") {
        throw new Error("A URL do Google Script não foi configurada. Atualize a variável de ambiente VITE_API_URL no Vercel.");
      }
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Falha ao aceder aos dados da API.');
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(''), 5000);
  };

  const handleSaveObservacao = async (numero) => {
    setIsSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ numero: numero, observacao: editValue })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setData(prevData => 
          prevData.map(item => 
            getNumero(item) === numero ? { ...item, 'Observações': editValue } : item
          )
        );
        if (selectedItem && getNumero(selectedItem) === numero) {
           setSelectedItem({ ...selectedItem, 'Observações': editValue });
        }
        setEditingId(null);
        showToast("Observação guardada com sucesso!");
      } else {
        showToast("Erro ao guardar: " + result.message);
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de comunicação ao guardar a observação.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { filteredData, dashboardStats, filterOptions } = useMemo(() => {
    let filtered = data.filter(item => {
      const num = getNumero(item).toUpperCase();
      if (!num) return false;

      const prefix = num.split('/')[0].replace('.', ''); 
      const processoPrefixes = ['PL', 'PEC', 'PLC', 'PDL', 'PRC', 'MPV', 'VET', 'MSG'];
      const isProcesso = processoPrefixes.includes(prefix);
      if (activeTab === 'processo' && !isProcesso) return false;
      if (activeTab === 'atividade' && isProcesso) return false;

      const sitLower = getSituacao(item).toLowerCase();
      const emenLower = getEmenta(item).toLowerCase();
      
      const linksAdicProp = getLinksAdicionais(item);
      let leiLink = null;
      try {
        if (linksAdicProp && linksAdicProp !== '-') {
           const parsedLinks = JSON.parse(linksAdicProp);
           leiLink = parsedLinks.find(l => l.label.toLowerCase().includes('transformado em lei') || l.label.toLowerCase().includes('promulgad'));
        }
      } catch(e) {}
      
      const isAprovadoLei = leiLink || sitLower.includes('transformado em lei') || sitLower.includes('norma jurídica');

      if (toggleAprovadas && !isAprovadoLei) return false;
      if (toggleUtilidade && !emenLower.includes('utilidade pública')) return false;

      if (filters.tipo.length > 0 && !filters.tipo.includes(getTipoProposicao(item))) return false;
      if (filters.situacao.length > 0 && !filters.situacao.includes(getSituacao(item))) return false;
      if (filters.relator.length > 0 && !filters.relator.includes(getRelator(item))) return false;
      if (filters.vista.length > 0 && !filters.vista.includes(getPedidoVista(item))) return false;

      const term = searchTerm.toLowerCase();
      if (term) {
        return num.toLowerCase().includes(term) || 
               getRelator(item).toLowerCase().includes(term) || 
               sitLower.includes(term) || 
               emenLower.includes(term) ||
               getPedidoVista(item).toLowerCase().includes(term);
      }
      
      return true;
    });

    const baseDataForFilters = data.filter(item => {
      const prefix = (getNumero(item).toUpperCase() || '').split('/')[0].replace('.', ''); 
      const isProcesso = ['PL', 'PEC', 'PLC', 'PDL', 'PRC', 'MPV', 'VET', 'MSG'].includes(prefix);
      return activeTab === 'processo' ? isProcesso : !isProcesso;
    });

    const optTipo = new Set(), optSituacao = new Set(), optRelator = new Set(), optVista = new Set();
    baseDataForFilters.forEach(item => {
      const t = getTipoProposicao(item); if (t && t !== '-') optTipo.add(t);
      const s = getSituacao(item); if (s && s !== '-') optSituacao.add(s);
      const r = getRelator(item); if (r && r !== '-') optRelator.add(r);
      const v = getPedidoVista(item); if (v && v !== '-') optVista.add(v);
    });

    const stats = {
      total: filtered.length,
      macro: { Aprovados: 0, Vetados: 0, 'Em Tramitação': 0, Arquivados: 0 },
      tipos: {}
    };

    filtered.forEach(item => {
      stats.macro[getMacroSituacao(item)]++;
      const tipo = getTipoProposicao(item);
      stats.tipos[tipo] = (stats.tipos[tipo] || 0) + 1;
    });

    return {
      filteredData: filtered,
      dashboardStats: stats,
      filterOptions: {
        tipo: Array.from(optTipo).sort(),
        situacao: Array.from(optSituacao).sort(),
        relator: Array.from(optRelator).sort(),
        vista: Array.from(optVista).sort()
      }
    };
  }, [data, activeTab, searchTerm, toggleAprovadas, toggleUtilidade, filters]);

  const handleCheckboxChange = (category, value) => {
    setFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value) 
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const limparFiltrosAvançados = () => {
    setFilters({ tipo: [], situacao: [], relator: [], vista: [] });
  };

  const handleCardClick = (e, item) => {
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('textarea')) {
      return; 
    }
    setSelectedItem(item);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans p-4 md:p-8 selection:bg-[#ffdb58] selection:text-black">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="border-[6px] border-black bg-white grid grid-cols-1 md:grid-cols-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="md:col-span-3 p-6 md:p-10 border-b-[6px] md:border-b-0 md:border-r-[6px] border-black flex flex-row items-center gap-4 md:gap-6">
            <img 
              src="https://raw.githubusercontent.com/killuixo/tabulum-sig-monilegis/refs/heads/main/icon-192.png" 
              alt="Ícone Tabulum" 
              className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-md flex-shrink-0"
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-1 md:mb-2">
                TABULUM
              </h1>
              <p className="text-lg md:text-xl font-bold text-gray-700 leading-tight">
                Monitor Legislativo
              </p>
            </div>
          </div>
          <div className={`p-4 flex items-center justify-center ${MONDRIAN_COLORS[0]}`}>
            <button onClick={fetchData} className="group outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-12 h-12 text-white group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row mb-6 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <button 
             onClick={() => {setActiveTab('processo'); limparFiltrosAvançados(); setSearchTerm('');}}
             className={`flex-1 p-4 font-black uppercase text-lg md:border-r-[4px] border-black transition-colors flex items-center justify-center gap-3 ${activeTab === 'processo' ? MONDRIAN_COLORS[0] + ' text-white' : 'hover:bg-gray-100 text-gray-400'}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
             Processo Legislativo
          </button>
          <button 
             onClick={() => {setActiveTab('atividade'); limparFiltrosAvançados(); setSearchTerm('');}}
             className={`flex-1 p-4 font-black uppercase text-lg transition-colors flex items-center justify-center gap-3 ${activeTab === 'atividade' ? MONDRIAN_COLORS[1] + ' text-white' : 'hover:bg-gray-100 text-gray-400'}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
             Atividade Parlamentar
          </button>
        </div>

        {/* ÁREA DE CONTROLES: BOTÕES + DASHBOARD */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <div className="flex flex-col gap-3 lg:w-1/3">
            <button 
              onClick={() => setToggleAprovadas(!toggleAprovadas)} 
              className={`px-4 py-4 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 font-black uppercase text-sm transition-all flex items-center justify-between ${toggleAprovadas ? 'bg-[#008080] text-white' : 'bg-white text-black'}`}
            >
              <span>{toggleAprovadas ? '✓ Leis Aprovadas' : 'Leis Aprovadas'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            </button>
            <button 
              onClick={() => setToggleUtilidade(!toggleUtilidade)} 
              className={`px-4 py-4 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 font-black uppercase text-sm transition-all flex items-center justify-between ${toggleUtilidade ? 'bg-[#ffdb58] text-black' : 'bg-white text-black'}`}
            >
              <span>{toggleUtilidade ? '✓ Utilidade Pública' : 'Utilidade Pública'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`px-4 py-4 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 font-black uppercase text-sm transition-all flex items-center justify-between ${showFilters ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}
            >
              <span>Filtros Avançados</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </button>
          </div>

          <div className="flex-1 border-[4px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-black text-lg uppercase tracking-wider">Visão Geral (Atuais)</h3>
              <span className="bg-black text-white px-3 py-1 text-xl font-black">{dashboardStats.total}</span>
            </div>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
              {Object.entries(dashboardStats.tipos).map(([tipo, count]) => (
                <div key={tipo} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-black"></span>
                  <span className="text-xs font-bold uppercase text-gray-700">{tipo}: <strong className="text-black">{count}</strong></span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                <span title={`Aprovados: ${dashboardStats.macro.Aprovados}`}>APRO {dashboardStats.macro.Aprovados}</span>
                <span title={`Em Tramitação: ${dashboardStats.macro['Em Tramitação']}`}>TRAM {dashboardStats.macro['Em Tramitação']}</span>
                <span title={`Arquivados: ${dashboardStats.macro.Arquivados}`}>ARQU {dashboardStats.macro.Arquivados}</span>
                <span title={`Vetados: ${dashboardStats.macro.Vetados}`}>VETA {dashboardStats.macro.Vetados}</span>
              </div>
              <div className="w-full h-4 flex bg-gray-200 border-[2px] border-black overflow-hidden">
                <div className="h-full bg-[#008080]" style={{width: `${(dashboardStats.macro.Aprovados / dashboardStats.total) * 100 || 0}%`}}></div>
                <div className="h-full bg-[#ffdb58]" style={{width: `${(dashboardStats.macro['Em Tramitação'] / dashboardStats.total) * 100 || 0}%`}}></div>
                <div className="h-full bg-gray-500" style={{width: `${(dashboardStats.macro.Arquivados / dashboardStats.total) * 100 || 0}%`}}></div>
                <div className="h-full bg-[#c41e3a]" style={{width: `${(dashboardStats.macro.Vetados / dashboardStats.total) * 100 || 0}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* PAINEL DE FILTROS AVANÇADOS (MULTI-SELECT) */}
        {showFilters && (
          <div className="mb-6 p-6 border-[4px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-4 border-b-[3px] border-black pb-2">
              <h3 className="font-black text-lg uppercase flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filtros Múltiplos
              </h3>
              <button onClick={limparFiltrosAvançados} className="text-xs font-black uppercase underline hover:text-[#c41e3a]">Limpar Caixas</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* TIPO */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase text-gray-500 tracking-wider">Tipo</p>
                <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1.5">
                  {filterOptions.tipo.map(opt => (
                    <label key={opt} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox" className="mt-0.5 w-4 h-4 accent-black border-2 border-black" checked={filters.tipo.includes(opt)} onChange={() => handleCheckboxChange('tipo', opt)} />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-black">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* SITUAÇÃO */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase text-gray-500 tracking-wider">Situação</p>
                <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1.5">
                  {filterOptions.situacao.map(opt => (
                    <label key={opt} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox" className="mt-0.5 w-4 h-4 accent-black border-2 border-black" checked={filters.situacao.includes(opt)} onChange={() => handleCheckboxChange('situacao', opt)} />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-black leading-tight">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* RELATOR */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase text-gray-500 tracking-wider">Relator(a)</p>
                <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1.5">
                  {filterOptions.relator.map(opt => (
                    <label key={opt} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox" className="mt-0.5 w-4 h-4 accent-black border-2 border-black" checked={filters.relator.includes(opt)} onChange={() => handleCheckboxChange('relator', opt)} />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-black uppercase">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* PEDIDO DE VISTA */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase text-gray-500 tracking-wider">Pedido de Vista</p>
                <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1.5">
                  {filterOptions.vista.map(opt => (
                    <label key={opt} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox" className="mt-0.5 w-4 h-4 accent-black border-2 border-black" checked={filters.vista.includes(opt)} onChange={() => handleCheckboxChange('vista', opt)} />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-black uppercase">{opt}</span>
                    </label>
                  ))}
                  {filterOptions.vista.length === 0 && <span className="text-xs italic text-gray-400">Nenhum em aberto.</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-0.5 transition-all">
            <div className={`w-4 border-r-[4px] border-black ${activeTab === 'processo' ? MONDRIAN_COLORS[0] : MONDRIAN_COLORS[1]}`}></div>
            <div className="p-4 flex items-center justify-center border-r-[4px] border-black">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input type="text" placeholder="Busca Universal (Número, ementa, relator...)" className="w-full p-4 text-xl font-bold outline-none placeholder-gray-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white self-stretch">
            <button onClick={() => setViewMode('card')} className={`flex-1 md:flex-none px-6 py-4 font-black uppercase flex items-center justify-center gap-2 transition-colors ${viewMode === 'card' ? 'bg-[#ffdb58]' : 'hover:bg-gray-100'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              Cards
            </button>
            <div className="w-[4px] bg-black"></div>
            <button onClick={() => setViewMode('list')} className={`flex-1 md:flex-none px-6 py-4 font-black uppercase flex items-center justify-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
              Lista
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center p-20 border-[6px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-3xl font-black uppercase animate-pulse">A Carregar Dados...</h2>
          </div>
        )}

        {error && (
          <div className="p-8 border-[6px] border-black bg-[#c41e3a] text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 flex-shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            <div>
              <h2 className="text-2xl font-black uppercase mb-2">Erro de Ligação</h2>
              <p className="font-bold text-lg">{error}</p>
            </div>
          </div>
        )}

        {/* CARDS */}
        {!loading && !error && viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredData.map((item, index) => {
              const numeroProp = getNumero(item) || 'S/N';
              const ementaProp = getEmenta(item);
              const obsProp = getObservacoes(item);
              const linkProp = getLink(item);
              const vistaProp = getPedidoVista(item);
              const infoRelatoriaProp = getInformacaoRelatoria(item);
              
              const linksAdicProp = getLinksAdicionais(item);
              let parsedLinks = [];
              try {
                if (linksAdicProp && linksAdicProp !== '-') parsedLinks = JSON.parse(linksAdicProp);
              } catch(e) {}

              const sitLower = (getSituacao(item) || '').toLowerCase();
              let leiLink = parsedLinks.find(l => l.label.toLowerCase().includes('transformado em lei') || l.label.toLowerCase().includes('promulgad'));
              
              const isAprovadoLei = leiLink || sitLower.includes('transformado em lei') || sitLower.includes('norma jurídica');
              const isArquivado = sitLower.includes('arquivad') || sitLower.includes('veto') || sitLower.includes('retirado') || sitLower.includes('rejeitado') || isAprovadoLei;

              let boxColorClass = 'bg-[#ffdb58]/30 text-black border-black';
              let titleColorClass = 'text-black';
              let boxTitle = 'Último Movimento';
              let iconeCaixa = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>;
              
              let textoCaixa = formatarUltimoMovimento(getUltimoMovimento(item));

              if (vistaProp) {
                boxColorClass = 'bg-[#c41e3a] text-white border-black';
                titleColorClass = 'text-white';
                boxTitle = 'Pedido de Vista Ativo';
                iconeCaixa = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
                textoCaixa = `Vista de ${vistaProp}`;
              } else {
                const textoLower = textoCaixa.toLowerCase();
                if (isArquivado || sitLower.includes('concluíd') || sitLower.includes('aprovad') || textoLower.includes('aprovado por unanimidade')) {
                   boxColorClass = 'bg-[#008080] text-white border-black';
                   titleColorClass = 'text-white';
                   if (textoLower.includes('diligência') && !sitLower.includes('concluíd') && !isArquivado) {
                       boxColorClass = 'bg-[#ffdb58] text-black border-black';
                       titleColorClass = 'text-black';
                   }
                } 
                else if (sitLower.includes('aguardando') || sitLower.includes('comissão') || textoLower.includes('aguardando') || textoLower.includes('diligência')) {
                   boxColorClass = 'bg-[#ffdb58] text-black border-black';
                   titleColorClass = 'text-black';
                }
              }

              return (
                <div key={index} onClick={(e) => handleCardClick(e, item)} className="relative hover:-translate-y-1 transition-transform duration-200 cursor-pointer group flex flex-col h-full">
                  <div className={`absolute inset-0 top-[6px] left-[6px] right-[-6px] bottom-[-6px] transition-all duration-200 group-hover:top-[10px] group-hover:left-[10px] group-hover:right-[-10px] group-hover:bottom-[-10px] ${isAprovadoLei ? 'bg-gradient-to-br from-[#c41e3a] via-[#ffdb58] to-[#008080]' : 'bg-black'}`}></div>
                  
                  <div className="relative z-10 bg-white border-[5px] border-black flex flex-col flex-grow">
                    <div className="border-b-[5px] border-black p-4 flex justify-between items-start bg-gray-100">
                      <div>
                        <span className="bg-black text-white px-2 py-1 text-xs font-black tracking-widest uppercase">
                          {getTipoProposicao(item)}
                        </span>
                        <h3 className="text-3xl font-black mt-2 text-black">
                          {numeroProp}
                        </h3>
                      </div>
                      {linkProp && linkProp !== '-' && (
                        <a href={linkProp} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="bg-white p-2 border-2 border-black hover:bg-gray-200 transition-colors" title="Ver na ALESC">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-black"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                        </a>
                      )}
                    </div>

                    <div className="p-5 flex-grow flex flex-col gap-4">
                      
                      <div className={`border-[3px] p-3 ${boxColorClass}`}>
                        <p className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mb-1 ${titleColorClass}`}>
                          {iconeCaixa}
                          {boxTitle}
                        </p>
                        <p className={`text-sm font-bold leading-snug ${titleColorClass}`}>
                          {textoCaixa}
                        </p>
                      </div>

                      <div className="bg-gray-50 border-[2px] border-black p-3">
                        <p className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-1">Ementa / Resumo</p>
                        <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-4">
                          {ementaProp || <span className="text-gray-400 italic font-normal">Ementa não informada.</span>}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Situação Geral</p>
                        <p className="text-lg font-black leading-tight border-l-[4px] border-black pl-3 mt-1 truncate">
                          {getSituacao(item) || '-'}
                        </p>
                      </div>
                      
                      <div className="flex justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Setor Atual</p>
                          <p className="text-sm font-bold leading-snug truncate">{getSetor(item) || '-'}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Verificado</p>
                          <p className="text-sm font-bold text-gray-600">{formatarData(item['Data da Verificação'])}</p>
                        </div>
                      </div>

                      {activeTab === 'processo' && !isArquivado && (
                        <div className="pt-4 border-t-[3px] border-black border-dashed flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-bold text-gray-500 uppercase">Relator(a)</p>
                              <p className="font-black text-[15px] uppercase truncate" title={getRelator(item)}>{getRelator(item) || '-'}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="text-[10px] font-bold text-gray-500 uppercase">Distribuição</p>
                              <p className="text-sm font-bold text-gray-600">{formatarData(item['Data de Distribuição'])}</p>
                            </div>
                          </div>
                          {infoRelatoriaProp && (
                            <p className="text-[11px] font-bold text-[#008080] leading-tight italic">
                              {infoRelatoriaProp}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-auto pt-4 border-t-[3px] border-black bg-gray-50 -mx-5 px-5 pb-5 -mb-5 flex-grow-0">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Notas Internas
                          </p>
                          {editingId !== numeroProp && (
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(numeroProp); setEditValue(obsProp || ''); }} className="text-[10px] font-bold uppercase underline hover:text-[#008080] transition-colors">
                              Editar
                            </button>
                          )}
                        </div>
                        
                        {editingId === numeroProp ? (
                          <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                            <textarea className="w-full border-2 border-black p-2 text-sm font-bold resize-none outline-none focus:border-[#008080]" rows="3" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."/>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-200 transition-colors" disabled={isSaving}>Cancelar</button>
                              <button onClick={() => handleSaveObservacao(numeroProp)} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 flex items-center gap-2 transition-opacity`} disabled={isSaving}>{isSaving ? 'A guardar...' : 'Guardar'}</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-gray-700 min-h-[2rem] whitespace-pre-wrap line-clamp-2">
                            {obsProp || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida.</span>}
                          </p>
                        )}
                        
                        {parsedLinks.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t-[3px] border-black border-dashed">
                            {(() => {
                              let diarioL = parsedLinks.find(l => l.label.toLowerCase().includes('diário'));
                              let vetoL = parsedLinks.find(l => l.label.toLowerCase().includes('veto'));
                              let redacaoL = parsedLinks.find(l => l.label.toLowerCase().includes('redação'));
                              return (
                                <>
                                  {leiLink && <a href={leiLink.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-black uppercase tracking-wider bg-[#00bcd4] text-black border-2 border-black px-2 py-1 flex items-center gap-1 hover:bg-[#0097a7] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg> LEI APROVADA</a>}
                                  {diarioL && <a href={diarioL.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-black uppercase tracking-wider bg-black text-white border-2 border-black px-2 py-1 flex items-center gap-1 hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">DIÁRIO OFICIAL</a>}
                                  {vetoL && <a href={vetoL.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-black uppercase tracking-wider bg-[#c41e3a] text-white border-2 border-black px-2 py-1 flex items-center gap-1 hover:bg-red-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">VETADO</a>}
                                  {redacaoL && !leiLink && <a href={redacaoL.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border-[1px] border-gray-400 px-2 py-1 hover:bg-gray-200 transition-colors">REDAÇÃO FINAL</a>}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LISTA */}
        {!loading && !error && viewMode === 'list' && (
          <div className="flex flex-col gap-4">
            {filteredData.map((item, index) => {
              const numeroProp = getNumero(item) || 'S/N';
              const ementaProp = getEmenta(item);
              const obsProp = getObservacoes(item);
              const linkProp = getLink(item);
              const vistaProp = getPedidoVista(item);
              const infoRelatoriaProp = getInformacaoRelatoria(item);
              
              const linksAdicProp = getLinksAdicionais(item);
              let parsedLinks = [];
              try {
                if (linksAdicProp && linksAdicProp !== '-') parsedLinks = JSON.parse(linksAdicProp);
              } catch(e) {}

              const sitLower = (getSituacao(item) || '').toLowerCase();
              let leiLink = parsedLinks.find(l => l.label.toLowerCase().includes('transformado em lei') || l.label.toLowerCase().includes('promulgad'));

              const isAprovadoLei = leiLink || sitLower.includes('transformado em lei') || sitLower.includes('norma jurídica');
              const isArquivado = sitLower.includes('arquivad') || sitLower.includes('veto') || sitLower.includes('retirado') || sitLower.includes('rejeitado') || isAprovadoLei;

              let boxColorClass = 'bg-white text-black';
              let titleColorClass = 'text-black';
              let boxTitle = 'Último Movimento';
              let textoCaixa = formatarUltimoMovimento(getUltimoMovimento(item));

              if (vistaProp) {
                boxColorClass = 'bg-[#c41e3a] text-white';
                titleColorClass = 'text-white';
                boxTitle = 'Pedido de Vista';
                textoCaixa = `Vista de ${vistaProp}`;
              } else {
                const textoLower = textoCaixa.toLowerCase();
                if (isArquivado || sitLower.includes('concluíd') || sitLower.includes('aprovad') || textoLower.includes('aprovado por unanimidade')) {
                   boxColorClass = 'bg-[#008080] text-white';
                   titleColorClass = 'text-white';
                   if (textoLower.includes('diligência') && !sitLower.includes('concluíd') && !isArquivado) {
                       boxColorClass = 'bg-[#ffdb58] text-black';
                       titleColorClass = 'text-black';
                   }
                } else if (sitLower.includes('aguardando') || sitLower.includes('comissão') || textoLower.includes('aguardando') || textoLower.includes('diligência')) {
                   boxColorClass = 'bg-[#ffdb58] text-black';
                   titleColorClass = 'text-black';
                } else if (textoCaixa !== '-') {
                   boxColorClass = 'bg-[#ffdb58]/30 text-black';
                }
              }

              return (
                <div key={index} onClick={(e) => handleCardClick(e, item)} className="relative hover:-translate-y-1 transition-transform duration-200 cursor-pointer group flex flex-col md:flex-row h-full">
                  <div className={`absolute inset-0 top-[4px] left-[4px] right-[-4px] bottom-[-4px] transition-all duration-200 group-hover:top-[6px] group-hover:left-[6px] group-hover:right-[-6px] group-hover:bottom-[-6px] ${isAprovadoLei ? 'bg-gradient-to-br from-[#c41e3a] via-[#ffdb58] to-[#008080]' : 'bg-black'}`}></div>

                  <div className="relative z-10 bg-white border-[4px] border-black flex flex-col md:flex-row flex-grow overflow-hidden">
                    <div className="w-full md:w-4 min-h-[1rem] md:min-h-full border-b-[4px] md:border-b-0 md:border-r-[4px] border-black flex-shrink-0 bg-gray-200"></div>
                    
                    <div className="p-4 flex-grow flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex flex-row md:flex-col gap-2 items-center md:items-start md:w-32 flex-shrink-0">
                        <span className="bg-black text-white px-2 py-1 text-xs font-black tracking-widest uppercase">
                          {getTipoProposicao(item)}
                        </span>
                        <span className="text-sm font-black tracking-widest uppercase">
                          {numeroProp}
                        </span>
                        {linkProp && linkProp !== '-' && (
                          <a href={linkProp} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-black uppercase underline hover:text-[#008080]">Ver na ALESC</a>
                        )}
                      </div>

                      <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
                        <div className="md:col-span-4">
                          <div className={`p-2 border-[2px] border-black ${boxColorClass} h-full flex flex-col justify-center`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${titleColorClass}`}>{boxTitle}</p>
                            <p className={`text-sm font-bold line-clamp-3 ${titleColorClass}`} title={textoCaixa}>{textoCaixa}</p>
                          </div>
                        </div>
                        <div className="md:col-span-5 flex flex-col justify-center">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Ementa</p>
                          <p className="text-sm font-bold text-gray-800 line-clamp-3" title={ementaProp}>{ementaProp || '-'}</p>
                        </div>
                        <div className="md:col-span-3 flex flex-col justify-center">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Situação / Setor</p>
                          <p className="text-sm font-bold">{getSituacao(item) || '-'}</p>
                          <p className="text-[10px] text-gray-600 font-bold line-clamp-2">{getSetor(item) || '-'}</p>
                        </div>
                      </div>

                      <div className="w-full md:w-64 flex-shrink-0 border-t-[3px] md:border-t-0 md:border-l-[3px] border-black border-dashed pt-3 md:pt-0 md:pl-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-1">Notas</p>
                          {editingId !== numeroProp && (
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(numeroProp); setEditValue(obsProp || ''); }} className="text-[10px] font-bold uppercase underline hover:text-[#008080] transition-colors">Editar</button>
                          )}
                        </div>
                        
                        {editingId === numeroProp ? (
                          <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                            <textarea className="w-full border-2 border-black p-1 text-xs font-bold resize-none outline-none focus:border-[#008080]" rows="2" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Anotação..."/>
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-white border-2 border-black text-[10px] font-bold uppercase hover:bg-gray-200 transition-colors" disabled={isSaving}>X</button>
                              <button onClick={() => handleSaveObservacao(numeroProp)} className={`px-2 py-1 border-2 border-black text-[10px] font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 transition-opacity`} disabled={isSaving}>{isSaving ? '...' : 'OK'}</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-gray-700 line-clamp-3" title={obsProp}>
                            {obsProp || <span className="text-gray-400 italic font-normal">Nenhuma.</span>}
                          </p>
                        )}
                        
                        {parsedLinks.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t-[2px] border-black border-dashed">
                            {(() => {
                              let diarioL = parsedLinks.find(l => l.label.toLowerCase().includes('diário'));
                              let vetoL = parsedLinks.find(l => l.label.toLowerCase().includes('veto'));
                              let redacaoL = parsedLinks.find(l => l.label.toLowerCase().includes('redação'));
                              return (
                                <>
                                  {leiLink && <a href={leiLink.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[8px] font-black uppercase tracking-wider bg-[#00bcd4] text-black border-[1px] border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-[#0097a7]">LEI APROVADA</a>}
                                  {diarioL && <a href={diarioL.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[8px] font-black uppercase tracking-wider bg-black text-white border-[1px] border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800">DIÁRIO OFICIAL</a>}
                                  {vetoL && <a href={vetoL.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[8px] font-black uppercase tracking-wider bg-[#c41e3a] text-white border-[1px] border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-red-800">VETADO</a>}
                                  {redacaoL && !leiLink && <a href={redacaoL.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[8px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 border-[1px] border-gray-400 px-1.5 py-0.5 hover:bg-gray-300">REDAÇÃO FINAL</a>}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center p-12 border-[5px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black uppercase">Nenhum resultado nesta aba.</h3>
            <p className="font-bold text-gray-600 mt-2">Experimente limpar os filtros, mudar de aba ou alterar sua busca.</p>
          </div>
        )}

        {/* MODAL / FICHA COMPLETA */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
            <div className="bg-white border-[6px] border-black shadow-[12px_12px_0px_0px_rgba(255,219,88,1)] w-full max-w-4xl max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
              
              <div className="border-b-[6px] border-black p-6 bg-gray-100 flex justify-between items-start">
                <div>
                  <span className="bg-black text-white px-3 py-1 text-sm font-black tracking-widest uppercase">
                    {getTipoProposicao(selectedItem)}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black mt-3 text-black">
                    {getNumero(selectedItem) || 'S/N'}
                  </h2>
                </div>
                <div className="flex gap-3">
                  {getLink(selectedItem) && getLink(selectedItem) !== '-' && (
                    <a href={getLink(selectedItem)} target="_blank" rel="noreferrer" className="bg-white p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all" title="Ver na ALESC">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </a>
                  )}
                  <button onClick={() => setSelectedItem(null)} className="bg-white p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#c41e3a] hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
                
                <div className="border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[#ffdb58]">
                  <p className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    Último Movimento
                  </p>
                  <p className="text-lg font-black text-black leading-snug">
                    {formatarUltimoMovimento(getUltimoMovimento(selectedItem)) || '-'}
                  </p>
                </div>

                <div className="border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Ementa / Resumo</p>
                  <p className="text-base font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {getEmenta(selectedItem) || '-'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-6">
                    <div className="border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Situação Geral</p>
                      <p className="text-xl font-black text-[#008080] leading-tight">{getSituacao(selectedItem) || '-'}</p>
                    </div>
                    <div className="border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Setor Atual</p>
                      <p className="text-base font-black leading-tight">{getSetor(selectedItem) || '-'}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">Verificado: {formatarData(selectedItem['Data da Verificação'])}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 border-[3px] border-black border-dashed p-4">
                    {(() => {
                      const sitLowerModal = (getSituacao(selectedItem) || '').toLowerCase();
                      const linksAdicProp = getLinksAdicionais(selectedItem);
                      let parsedLinks = [];
                      try { if (linksAdicProp && linksAdicProp !== '-') parsedLinks = JSON.parse(linksAdicProp); } catch(e) {}
                      let leiLinkModal = parsedLinks.find(l => l.label.toLowerCase().includes('transformado em lei') || l.label.toLowerCase().includes('promulgad'));

                      const isArquivadoModal = sitLowerModal.includes('arquivad') || sitLowerModal.includes('veto') || sitLowerModal.includes('transformado em lei') || sitLowerModal.includes('norma jurídica') || sitLowerModal.includes('retirado') || sitLowerModal.includes('rejeitado') || leiLinkModal;
                      
                      return !isArquivadoModal ? (
                        <>
                          <div className="flex justify-between items-start border-b-[2px] border-gray-200 pb-3">
                            <div>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Relator(a) Atual</p>
                              <p className="text-base font-black uppercase">{getRelator(selectedItem) || '-'}</p>
                              {getInformacaoRelatoria(selectedItem) && (
                                <p className="text-sm font-bold text-[#008080] leading-tight italic mt-1">
                                  {getInformacaoRelatoria(selectedItem)}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Distribuição</p>
                              <p className="text-sm font-bold">{formatarData(selectedItem['Data de Distribuição'])}</p>
                            </div>
                          </div>
                          <div className="border-b-[2px] border-gray-200 pb-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Pedido de Vista em Aberto</p>
                            <p className="text-base font-black uppercase">{getPedidoVista(selectedItem) || 'Nenhum'}</p>
                          </div>
                        </>
                      ) : null;
                    })()}

                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Processos Anexos</p>
                      <p className="text-base font-black text-[#008080]">{selectedItem['Processos anexos'] || 'Nenhum'}</p>
                    </div>
                  </div>
                </div>

                <div className="border-[3px] border-black p-5 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Anotações Internas do Painel
                    </p>
                    {editingId !== getNumero(selectedItem) && (
                      <button onClick={() => { setEditingId(getNumero(selectedItem)); setEditValue(getObservacoes(selectedItem) || ''); }} className="text-[10px] font-black uppercase underline hover:text-[#008080]">EDITAR</button>
                    )}
                  </div>
                  
                  {editingId === getNumero(selectedItem) ? (
                    <div className="flex flex-col gap-3 mt-2">
                      <textarea className="w-full border-[3px] border-black p-3 text-sm font-bold resize-none outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,128,128,1)] transition-shadow" rows="4" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."/>
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-white border-[3px] border-black text-xs font-black uppercase hover:bg-gray-200" disabled={isSaving}>Cancelar</button>
                        <button onClick={() => handleSaveObservacao(getNumero(selectedItem))} className={`px-4 py-2 border-[3px] border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90`} disabled={isSaving}>{isSaving ? 'A guardar...' : 'Guardar'}</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-base font-bold text-gray-700 min-h-[3rem] whitespace-pre-wrap">
                      {getObservacoes(selectedItem) || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida na planilha.</span>}
                    </p>
                  )}
                </div>

                {(() => {
                  let parsedLinks = [];
                  try {
                    const rawLinks = getLinksAdicionais(selectedItem);
                    if (rawLinks && rawLinks !== '-') parsedLinks = JSON.parse(rawLinks);
                  } catch(e) {}
                  
                  if (parsedLinks.length > 0) {
                    let leiLink = parsedLinks.find(l => l.label.toLowerCase().includes('transformado em lei') || l.label.toLowerCase().includes('promulgad'));
                    let diarioL = parsedLinks.find(l => l.label.toLowerCase().includes('diário'));
                    let vetoL = parsedLinks.find(l => l.label.toLowerCase().includes('veto'));
                    let redacaoL = parsedLinks.find(l => l.label.toLowerCase().includes('redação'));

                    return (
                      <div className="pt-4 border-t-[3px] border-black border-dashed flex flex-wrap gap-3">
                        {leiLink && <a href={leiLink.url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-wider bg-[#00bcd4] text-black border-[3px] border-black px-4 py-2 flex items-center gap-2 hover:bg-[#0097a7] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg> LEI APROVADA</a>}
                        {diarioL && <a href={diarioL.url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-wider bg-black text-white border-[3px] border-black px-4 py-2 flex items-center gap-2 hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1">DIÁRIO OFICIAL</a>}
                        {vetoL && <a href={vetoL.url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-wider bg-[#c41e3a] text-white border-[3px] border-black px-4 py-2 flex items-center gap-2 hover:bg-red-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1">VETADO</a>}
                        {redacaoL && !leiLink && <a href={redacaoL.url} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border-[2px] border-gray-400 px-3 py-1.5 hover:bg-gray-200 transition-colors">REDAÇÃO FINAL</a>}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 p-4 border-[4px] border-black bg-[#ffdb58] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50 flex items-center gap-3 animate-bounce">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           <span className="font-black uppercase text-sm">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
