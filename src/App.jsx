import React, { useState, useEffect, useMemo } from 'react';

const MONDRIAN_COLORS = [
  'bg-[#c41e3a]', // Vermelho Carmesim
  'bg-[#008080]', // Azul Esverdeado
  'bg-[#ffdb58]', // Amarelo Mostarda
  'bg-[#00bcd4]', // Azul Ciano (Para Aprovados)
];

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    situacao: '', setor: '', relator: '', tipo: '', vista: ''
  });
  const [quickFilter, setQuickFilter] = useState(null); // 'aprovados' ou 'utilidade'

  // Estados de Interface e Edição
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(''); 
  const [viewMode, setViewMode] = useState('card'); 
  const [activeTab, setActiveTab] = useState('processo'); 
  
  // Estado para Ficha Completa
  const [selectedItem, setSelectedItem] = useState(null);

  const formatarData = (dataString) => {
    if (!dataString || dataString === '-') return '-';
    const apenasData = dataString.split(/[T ]/)[0];
    if (apenasData.includes('-')) {
      return apenasData.split('-').reverse().join('/');
    }
    return apenasData;
  };

  const getProp = (item, keys) => {
    for (let key of keys) {
      if (item[key] !== undefined) return item[key];
    }
    return '';
  };

  const getNumero = (item) => getProp(item, ['Número da Proposição', 'Numero da Proposicao', 'numero']);
  const getEmenta = (item) => getProp(item, ['Ementa', 'ementa', 'EMENTA', 'Resumo']);
  const getUltimoMovimento = (item) => getProp(item, ['Último Movimento', 'Ultimo Movimento', 'Ultimo movimento']);
  const getRelator = (item) => getProp(item, ['Relator(a) na Comissão', 'Relator', 'relator']);
  const getSituacao = (item) => getProp(item, ['Situação', 'Situacao', 'situacao']);
  const getSetor = (item) => getProp(item, ['Setor Atual', 'Setor atual', 'setor']);
  const getObservacoes = (item) => getProp(item, ['Observações', 'Observacoes', 'observacoes']);
  const getLink = (item) => getProp(item, ['Link', 'link']);
  const getTipoProposicao = (item) => getProp(item, ['Tipo de Proposição', 'Tipo de Proposicao']) || (activeTab === 'processo' ? 'Processo' : 'Atividade');
  const getAutoria = (item) => getProp(item, ['Autoria', 'autoria']);
  const getDataEntrada = (item) => formatarData(getProp(item, ['Data de entrada', 'Data de Entrada', 'Data de entrada ']));
  const getDataDistribuicao = (item) => formatarData(getProp(item, ['Data de Distribuição', 'Data de Distribuicao']));
  const getVerificacao = (item) => formatarData(getProp(item, ['Data da Verificação', 'Data de Verificacao']));
  const getProcessosAnexos = (item) => getProp(item, ['Processos anexos', 'Processos Anexos']);
  
  const getPedidoVista = (item) => {
      let v = getProp(item, ['Pedido de Vista', 'pedido de vista', 'Pedido de vista']);
      return (v === '-') ? '' : v;
  };
  const getInformacaoRelatoria = (item) => {
      let r = getProp(item, ['Informação da Relatoria', 'Informacao da relatoria', 'Informacao da Relatoria']);
      return (r === '-') ? '' : r;
  };
  const getLinksAdicionais = (item) => {
      return getProp(item, ['Links Adicionais', 'links_adicionais', 'Links adicionais']);
  };

  const API_URL = (() => {
    try { if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL; } catch (e) {}
    try { if (typeof process !== 'undefined' && process.env) return process.env.VITE_API_URL || process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL; } catch (e) {}
    return "COLE_SUA_URL_DO_SCRIPT_AQUI";
  })();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL || API_URL === "COLE_SUA_URL_DO_SCRIPT_AQUI") {
        throw new Error("A URL do Google Script não foi configurada.");
      }
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Falha ao aceder aos dados da API.');
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
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
        setData(prevData => prevData.map(item => getNumero(item) === numero ? { ...item, 'Observações': editValue, 'Observacoes': editValue } : item));
        setEditingId(null);
        if(selectedItem) setSelectedItem(prev => ({...prev, 'Observações': editValue}));
        showToast("Observação guardada com sucesso!");
      } else {
        showToast("Erro ao guardar: " + result.message);
      }
    } catch (error) {
      showToast("Erro de comunicação ao guardar a observação.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Extrair opções únicas para os filtros dropdown
  const filterOptions = useMemo(() => {
    const options = { situacao: new Set(), setor: new Set(), relator: new Set(), tipo: new Set(), vista: new Set() };
    data.forEach(item => {
      if (getSituacao(item)) options.situacao.add(getSituacao(item));
      if (getSetor(item)) options.setor.add(getSetor(item));
      if (getRelator(item)) options.relator.add(getRelator(item));
      if (getTipoProposicao(item)) options.tipo.add(getTipoProposicao(item));
      if (getPedidoVista(item)) options.vista.add(getPedidoVista(item));
    });
    return {
      situacao: Array.from(options.situacao).sort(),
      setor: Array.from(options.setor).sort(),
      relator: Array.from(options.relator).sort(),
      tipo: Array.from(options.tipo).sort(),
      vista: Array.from(options.vista).sort(),
    };
  }, [data]);

  const filteredData = data.filter(item => {
    const num = getNumero(item).toUpperCase();
    if (!num) return false;

    // Filtro por Aba
    const prefix = num.split('/')[0].replace('.', ''); 
    const processoPrefixes = ['PL', 'PEC', 'PLC', 'PDL', 'PRC', 'MPV', 'VET', 'MSG'];
    const isProcesso = processoPrefixes.includes(prefix);
    if (activeTab === 'processo' && !isProcesso) return false;
    if (activeTab === 'atividade' && isProcesso) return false;

    const sitLower = getSituacao(item).toLowerCase();
    const ementaLower = getEmenta(item).toLowerCase();

    // Filtros Rápidos (Botões)
    if (quickFilter === 'aprovados') {
      if (!sitLower.includes('lei') && !sitLower.includes('norma jurídica')) return false;
    }
    if (quickFilter === 'utilidade') {
      if (!ementaLower.includes('utilidade pública')) return false;
    }

    // Filtros Avançados Dropdown
    if (filters.situacao && getSituacao(item) !== filters.situacao) return false;
    if (filters.setor && getSetor(item) !== filters.setor) return false;
    if (filters.relator && getRelator(item) !== filters.relator) return false;
    if (filters.tipo && getTipoProposicao(item) !== filters.tipo) return false;
    if (filters.vista && getPedidoVista(item) !== filters.vista) return false;

    // Filtro de Texto Livre
    const term = searchTerm.toLowerCase();
    if (term) {
      return num.toLowerCase().includes(term) || 
             getRelator(item).toLowerCase().includes(term) || 
             sitLower.includes(term) || 
             ementaLower.includes(term) ||
             getPedidoVista(item).toLowerCase().includes(term);
    }
    return true;
  });

  const clearFilters = () => {
    setFilters({ situacao: '', setor: '', relator: '', tipo: '', vista: '' });
    setSearchTerm('');
    setQuickFilter(null);
  };

  const renderFichaCompleta = () => {
    if (!selectedItem) return null;
    const item = selectedItem;
    const num = getNumero(item);
    
    let parsedLinks = [];
    try { const la = getLinksAdicionais(item); if (la && la !== '-') parsedLinks = JSON.parse(la); } catch(e) {}
    
    let leiLink = parsedLinks.find(l => l.label.toLowerCase().includes('lei'));
    let diarioLink = parsedLinks.find(l => l.label.toLowerCase().includes('diário oficial'));
    let redacaoLink = parsedLinks.find(l => l.label.toLowerCase().includes('redação final'));
    let vetoLink = parsedLinks.find(l => l.label.toLowerCase().includes('veto'));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
        <div className="bg-white border-[6px] border-black shadow-[12px_12px_0px_0px_rgba(255,219,88,1)] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
          
          <div className="bg-black text-white p-4 md:p-6 flex justify-between items-center flex-shrink-0">
            <div>
              <span className="bg-[#ffdb58] text-black px-3 py-1 text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                Ficha Completa • {getTipoProposicao(item)}
              </span>
              <h2 className="text-3xl md:text-5xl font-black mt-3">{num}</h2>
            </div>
            <button onClick={() => setSelectedItem(null)} className="text-white hover:text-[#ffdb58] transition-colors p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b-[4px] border-black pb-6">
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Data de Entrada</p>
                <p className="text-xl font-bold">{getDataEntrada(item)}</p>
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Autoria</p>
                <p className="text-xl font-bold">{getAutoria(item) || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Verificação Script</p>
                <p className="text-xl font-bold">{getVerificacao(item)}</p>
              </div>
            </div>

            <div className="bg-gray-50 border-[3px] border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Ementa / Resumo</p>
              <p className="text-lg md:text-xl font-bold text-gray-900 leading-snug">{getEmenta(item) || '-'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <div className="border-[3px] border-black p-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Situação Geral</p>
                  <p className="text-2xl font-black text-[#008080]">{getSituacao(item) || '-'}</p>
                </div>
                <div className="border-[3px] border-black p-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Setor Atual</p>
                  <p className="text-lg font-bold">{getSetor(item) || '-'}</p>
                </div>
                <div className="border-[3px] border-black p-4 bg-[#ffdb58]/20">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Último Movimento (Timeline)</p>
                  <p className="text-md font-bold">{getUltimoMovimento(item) || '-'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="border-[3px] border-black p-4 border-dashed">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Relator(a) Atual</p>
                      <p className="text-lg font-bold">{getRelator(item) || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Distribuição</p>
                      <p className="text-lg font-bold">{getDataDistribuicao(item)}</p>
                    </div>
                  </div>
                  {getInformacaoRelatoria(item) && (
                    <p className="text-sm italic text-gray-600 mt-2 pt-2 border-t border-gray-300">↳ {getInformacaoRelatoria(item)}</p>
                  )}
                </div>

                <div className={`border-[3px] border-black p-4 ${getPedidoVista(item) ? 'bg-[#c41e3a] text-white' : ''}`}>
                  <p className={`text-xs font-black uppercase tracking-widest ${getPedidoVista(item) ? 'text-white/80' : 'text-gray-500'}`}>Pedido de Vista em Aberto</p>
                  <p className="text-lg font-bold">{getPedidoVista(item) || 'Nenhum'}</p>
                </div>

                <div className="border-[3px] border-black p-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Processos Anexos</p>
                  <p className="text-md font-bold text-[#008080]">{getProcessosAnexos(item) || 'Nenhum'}</p>
                </div>
              </div>
            </div>

            <div className="border-[3px] border-black p-4 md:p-6 bg-gray-100">
              <div className="flex justify-between items-center border-b-[3px] border-black pb-2 mb-3">
                <p className="text-md font-black text-black uppercase">Anotações Internas do Painel</p>
                {editingId !== num && (
                  <button onClick={() => { setEditingId(num); setEditValue(getObservacoes(item) || ''); }} className="text-xs font-black uppercase underline hover:text-[#008080]">Editar</button>
                )}
              </div>
              
              {editingId === num ? (
                <div className="flex flex-col gap-2">
                  <textarea className="w-full border-[3px] border-black p-3 text-sm font-bold resize-none outline-none focus:border-[#008080]" rows="3" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."/>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-white border-[3px] border-black text-xs font-black uppercase hover:bg-gray-200 transition-colors" disabled={isSaving}>Cancelar</button>
                    <button onClick={() => handleSaveObservacao(num)} className={`px-4 py-2 border-[3px] border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90`} disabled={isSaving}>{isSaving ? 'A guardar...' : 'Guardar Alteração'}</button>
                  </div>
                </div>
              ) : (
                <p className="text-md font-bold text-gray-800 whitespace-pre-wrap">
                  {getObservacoes(item) || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida na planilha.</span>}
                </p>
              )}
            </div>

            {/* Links e Botões de Lei na Ficha */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t-[4px] border-black">
              {getLink(item) && getLink(item) !== '-' && (
                <a href={getLink(item)} target="_blank" rel="noreferrer" className="px-4 py-2 border-[3px] border-black font-black uppercase text-sm bg-white hover:bg-gray-200 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  Acessar ALESC
                </a>
              )}
              
              {leiLink && (
                <a href={leiLink.url} target="_blank" rel="noreferrer" className="px-4 py-2 border-[3px] border-black font-black uppercase text-sm bg-[#00bcd4] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
                  LEI APROVADA
                </a>
              )}
              {diarioLink && (
                <a href={diarioLink.url} target="_blank" rel="noreferrer" className="px-4 py-2 border-[3px] border-black font-black uppercase text-sm bg-black text-white hover:bg-gray-800 flex items-center gap-2">
                  DIÁRIO OFICIAL
                </a>
              )}
              {vetoLink && (
                <a href={vetoLink.url} target="_blank" rel="noreferrer" className="px-4 py-2 border-[3px] border-black font-black uppercase text-sm bg-[#c41e3a] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
                  VETADO
                </a>
              )}
              {redacaoLink && !leiLink && (
                <a href={redacaoLink.url} target="_blank" rel="noreferrer" className="px-4 py-2 border-[2px] border-gray-400 font-bold uppercase text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-2">
                  REDAÇÃO FINAL
                </a>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans p-4 md:p-8 selection:bg-[#ffdb58] selection:text-black">
      {renderFichaCompleta()}
      
      <div className="max-w-7xl mx-auto mb-6">
        <div className="border-[6px] border-black bg-white grid grid-cols-1 md:grid-cols-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="md:col-span-3 p-6 md:p-8 border-b-[6px] md:border-b-0 md:border-r-[6px] border-black flex flex-row items-center gap-4 md:gap-6">
            <img src="https://raw.githubusercontent.com/killuixo/tabulum-sig-monilegis/refs/heads/main/icon-192.png" alt="Logo" className="w-16 h-16 md:w-24 md:h-24 object-contain flex-shrink-0" />
            <div className="flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-1">TABULUM</h1>
              <p className="text-md md:text-lg font-bold text-gray-700 leading-tight">Monitor Legislativo</p>
            </div>
          </div>
          <div className={`p-4 flex items-center justify-center ${MONDRIAN_COLORS[0]}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-10 h-10 text-white cursor-pointer hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} onClick={fetchData}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row mb-6 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <button onClick={() => setActiveTab('processo')} className={`flex-1 p-4 font-black uppercase text-md md:border-r-[4px] border-black transition-colors flex items-center justify-center gap-3 ${activeTab === 'processo' ? MONDRIAN_COLORS[0] + ' text-white' : 'hover:bg-gray-100 text-gray-400'}`}>Processo Legislativo</button>
          <button onClick={() => setActiveTab('atividade')} className={`flex-1 p-4 font-black uppercase text-md transition-colors flex items-center justify-center gap-3 ${activeTab === 'atividade' ? MONDRIAN_COLORS[1] + ' text-white' : 'hover:bg-gray-100 text-gray-400'}`}>Atividade Parlamentar</button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className={`w-4 border-r-[4px] border-black ${activeTab === 'processo' ? MONDRIAN_COLORS[0] : MONDRIAN_COLORS[1]}`}></div>
            <input type="text" placeholder="Buscar termo livre..." className="w-full p-4 text-lg font-bold outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-6 py-4 font-black uppercase transition-colors flex items-center gap-2 ${showAdvancedFilters ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}>
            Filtros
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </button>
          
          <div className="flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <button onClick={() => setViewMode('card')} className={`px-4 py-4 border-r-[4px] border-black transition-colors ${viewMode === 'card' ? 'bg-[#ffdb58]' : 'hover:bg-gray-100'}`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg></button>
            <button onClick={() => setViewMode('list')} className={`px-4 py-4 transition-colors ${viewMode === 'list' ? 'bg-[#ffdb58]' : 'hover:bg-gray-100'}`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></button>
          </div>
        </div>

        {/* Painel de Filtros Avançados e Botões Rápidos */}
        {showAdvancedFilters && (
          <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 md:p-6 mb-8 flex flex-col gap-4 animate-in slide-in-from-top-2">
            <div className="flex flex-wrap items-center gap-3 mb-2 border-b-[3px] border-black pb-4">
              <span className="text-xs font-black uppercase mr-2 text-gray-500">Busca Rápida:</span>
              <button onClick={() => setQuickFilter(quickFilter === 'aprovados' ? null : 'aprovados')} className={`px-4 py-2 border-[3px] border-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all ${quickFilter === 'aprovados' ? 'bg-[#00bcd4] text-black' : 'bg-white text-black'}`}>
                🔥 Leis Aprovadas
              </button>
              <button onClick={() => setQuickFilter(quickFilter === 'utilidade' ? null : 'utilidade')} className={`px-4 py-2 border-[3px] border-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all ${quickFilter === 'utilidade' ? 'bg-[#ffdb58] text-black' : 'bg-white text-black'}`}>
                🏛️ Utilidade Pública
              </button>
              <button onClick={clearFilters} className="ml-auto px-4 py-2 text-xs font-black uppercase text-red-600 hover:bg-red-50 transition-colors">
                Limpar Todos os Filtros
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">Tipo de Proposição</label>
                <select className="w-full border-[2px] border-black p-2 text-sm font-bold bg-white outline-none" value={filters.tipo} onChange={e => setFilters({...filters, tipo: e.target.value})}>
                  <option value="">Todos</option>
                  {filterOptions.tipo.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">Situação</label>
                <select className="w-full border-[2px] border-black p-2 text-sm font-bold bg-white outline-none" value={filters.situacao} onChange={e => setFilters({...filters, situacao: e.target.value})}>
                  <option value="">Todas</option>
                  {filterOptions.situacao.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">Setor Atual</label>
                <select className="w-full border-[2px] border-black p-2 text-sm font-bold bg-white outline-none" value={filters.setor} onChange={e => setFilters({...filters, setor: e.target.value})}>
                  <option value="">Todos</option>
                  {filterOptions.setor.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">Relator(a)</label>
                <select className="w-full border-[2px] border-black p-2 text-sm font-bold bg-white outline-none" value={filters.relator} onChange={e => setFilters({...filters, relator: e.target.value})}>
                  <option value="">Todos</option>
                  {filterOptions.relator.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">Pedido de Vista</label>
                <select className="w-full border-[2px] border-black p-2 text-sm font-bold bg-white outline-none" value={filters.vista} onChange={e => setFilters({...filters, vista: e.target.value})}>
                  <option value="">Todos</option>
                  {filterOptions.vista.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Status de Loading e Erro */}
        {loading && <div className="text-center p-16 border-[6px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"><h2 className="text-3xl font-black uppercase animate-pulse">A Carregar Dados...</h2></div>}
        {error && <div className="p-8 border-[6px] border-black bg-[#c41e3a] text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4"><h2 className="text-2xl font-black uppercase">{error}</h2></div>}

        {/* CARDS */}
        {!loading && !error && viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredData.map((item, index) => {
              const numeroProp = getNumero(item) || 'S/N';
              let parsedLinks = [];
              try { const la = getLinksAdicionais(item); if (la && la !== '-') parsedLinks = JSON.parse(la); } catch(e) {}
              
              let leiLink = parsedLinks.find(l => l.label.toLowerCase().includes('lei'));
              let diarioLink = parsedLinks.find(l => l.label.toLowerCase().includes('diário oficial'));
              let redacaoLink = parsedLinks.find(l => l.label.toLowerCase().includes('redação final'));
              let vetoLink = parsedLinks.find(l => l.label.toLowerCase().includes('veto'));

              const sitLower = (getSituacao(item) || '').toLowerCase();
              let isAprovado = leiLink || sitLower.includes('lei') || sitLower.includes('norma jurídica');

              let boxColorClass = 'bg-[#ffdb58]/30 text-black border-black';
              let titleColorClass = 'text-black';
              let boxTitle = 'Último Movimento';
              let iconeCaixa = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>;
              
              let textoCaixa = getInformacaoRelatoria(item) ? getInformacaoRelatoria(item) : (getUltimoMovimento(item) || '-');

              if (getPedidoVista(item)) {
                boxColorClass = 'bg-[#c41e3a] text-white border-black';
                titleColorClass = 'text-white';
                boxTitle = 'Pedido de Vista Ativo';
                textoCaixa = `Vista de ${getPedidoVista(item)}`;
              } else if (isAprovado) {
                boxColorClass = 'bg-[#00bcd4] text-black border-black'; // Ciano para Leis
                titleColorClass = 'text-black';
                boxTitle = 'Situação Legal';
                textoCaixa = 'Aprovado / Transformado em Lei';
              } else if (vetoLink || sitLower.includes('veto')) {
                boxColorClass = 'bg-[#c41e3a] text-white border-black';
                titleColorClass = 'text-white';
                boxTitle = 'Situação Legal';
                textoCaixa = 'Vetado';
              } else {
                const textoLower = textoCaixa.toLowerCase();
                if (sitLower.includes('arquivad') || sitLower.includes('concluíd')) {
                   boxColorClass = 'bg-[#008080] text-white border-black';
                   titleColorClass = 'text-white';
                } else if (sitLower.includes('aguardando') || textoLower.includes('aguardando') || textoLower.includes('diligência')) {
                   boxColorClass = 'bg-[#ffdb58] text-black border-black';
                   titleColorClass = 'text-black';
                }
              }

              return (
                <div key={index} onClick={() => setSelectedItem(item)} className="bg-white border-[5px] border-black flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all duration-200">
                  <div className="border-b-[5px] border-black p-4 bg-gray-50 flex justify-between items-start">
                    <div>
                      <span className="bg-black text-white px-2 py-1 text-[10px] font-black tracking-widest uppercase">{getTipoProposicao(item)}</span>
                      <h3 className="text-3xl font-black mt-2">{numeroProp}</h3>
                    </div>
                  </div>

                  <div className="p-5 flex-grow flex flex-col gap-4">
                    <div className={`border-[3px] p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${boxColorClass}`}>
                      <p className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mb-1 ${titleColorClass}`}>{iconeCaixa} {boxTitle}</p>
                      <p className={`text-sm font-bold leading-snug ${titleColorClass}`}>{textoCaixa}</p>
                    </div>

                    <div className="border-[2px] border-gray-300 p-3">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Ementa</p>
                      <p className="text-sm font-bold text-gray-800 line-clamp-4">{getEmenta(item) || '-'}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Situação</p>
                      <p className="text-md font-black leading-tight border-l-[4px] border-[#008080] pl-2 mt-1 truncate">{getSituacao(item) || '-'}</p>
                    </div>

                    {/* Botões Visuais Mapeados do Script */}
                    {(leiLink || diarioLink || redacaoLink || vetoLink) && (
                      <div className="mt-auto pt-3 border-t-[2px] border-gray-200 flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                         {leiLink && <a href={leiLink.url} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase bg-[#00bcd4] border-[2px] border-black text-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#0097a7]">LEI APROVADA</a>}
                         {diarioLink && <a href={diarioLink.url} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase bg-black border-[2px] border-black text-white px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800">DIÁRIO OFICIAL</a>}
                         {vetoLink && <a href={vetoLink.url} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase bg-[#c41e3a] border-[2px] border-black text-white px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-800">VETADO</a>}
                         {redacaoLink && !leiLink && <a href={redacaoLink.url} target="_blank" rel="noreferrer" className="text-[9px] font-bold uppercase bg-gray-100 border-[2px] border-gray-400 text-gray-600 px-2 py-1 hover:bg-gray-200">REDAÇÃO FINAL</a>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LISTA */}
        {!loading && !error && viewMode === 'list' && (
          <div className="flex flex-col gap-3">
            {filteredData.map((item, index) => {
              const numeroProp = getNumero(item) || 'S/N';
              let parsedLinks = [];
              try { const la = getLinksAdicionais(item); if (la && la !== '-') parsedLinks = JSON.parse(la); } catch(e) {}
              
              let leiLink = parsedLinks.find(l => l.label.toLowerCase().includes('lei'));
              let diarioLink = parsedLinks.find(l => l.label.toLowerCase().includes('diário oficial'));
              let redacaoLink = parsedLinks.find(l => l.label.toLowerCase().includes('redação final'));
              let vetoLink = parsedLinks.find(l => l.label.toLowerCase().includes('veto'));

              const sitLower = (getSituacao(item) || '').toLowerCase();
              let isAprovado = leiLink || sitLower.includes('lei') || sitLower.includes('norma jurídica');

              let boxColorClass = 'bg-white text-black';
              let textoCaixa = getInformacaoRelatoria(item) ? getInformacaoRelatoria(item) : (getUltimoMovimento(item) || '-');

              if (getPedidoVista(item)) {
                boxColorClass = 'bg-[#c41e3a] text-white';
                textoCaixa = `Vista: ${getPedidoVista(item)}`;
              } else if (isAprovado) {
                 boxColorClass = 'bg-[#00bcd4] text-black font-black border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'; 
                 textoCaixa = 'Aprovado / Transformado em Lei';
              } else if (vetoLink || sitLower.includes('veto')) {
                 boxColorClass = 'bg-[#c41e3a] text-white font-black border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';
                 textoCaixa = 'Vetado';
              }

              return (
                <div key={index} onClick={() => setSelectedItem(item)} className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden">
                  <div className={`w-full md:w-4 min-h-[1rem] md:min-h-full border-b-[4px] md:border-b-0 md:border-r-[4px] border-black flex-shrink-0 ${isAprovado ? 'bg-[#00bcd4]' : (vetoLink ? 'bg-[#c41e3a]' : 'bg-gray-200')}`}></div>
                  
                  <div className="p-3 flex-grow flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex flex-col md:w-32 flex-shrink-0">
                      <span className="text-sm font-black tracking-widest uppercase">{numeroProp}</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{getTipoProposicao(item)}</span>
                    </div>

                    <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                      <div className="md:col-span-5 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-0.5">Ementa</p>
                        <p className="text-xs font-bold text-gray-800 line-clamp-2" title={getEmenta(item)}>{getEmenta(item) || '-'}</p>
                      </div>
                      <div className="md:col-span-4 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-0.5">Destaque</p>
                        <div className={`p-1.5 text-xs line-clamp-2 ${boxColorClass}`}>{textoCaixa}</div>
                      </div>
                      <div className="md:col-span-3 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-0.5">Situação</p>
                        <p className="text-xs font-bold truncate">{getSituacao(item) || '-'}</p>
                      </div>
                    </div>

                    {(leiLink || diarioLink || redacaoLink || vetoLink) && (
                      <div className="flex flex-row md:flex-col gap-1 md:w-24 flex-shrink-0 border-t-[2px] md:border-t-0 md:border-l-[2px] border-dashed border-gray-300 pt-2 md:pt-0 md:pl-3" onClick={e => e.stopPropagation()}>
                         {leiLink && <a href={leiLink.url} target="_blank" rel="noreferrer" className="text-[8px] text-center font-black uppercase bg-[#00bcd4] border-[2px] border-black text-black px-1 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#0097a7]">LEI</a>}
                         {diarioLink && <a href={diarioLink.url} target="_blank" rel="noreferrer" className="text-[8px] text-center font-black uppercase bg-black border-[2px] border-black text-white px-1 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800">D.O.</a>}
                         {vetoLink && <a href={vetoLink.url} target="_blank" rel="noreferrer" className="text-[8px] text-center font-black uppercase bg-[#c41e3a] border-[2px] border-black text-white px-1 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-800">VETADO</a>}
                         {redacaoLink && !leiLink && <a href={redacaoLink.url} target="_blank" rel="noreferrer" className="text-[8px] text-center font-bold uppercase bg-gray-100 border-[1px] border-gray-400 text-gray-600 px-1 py-1 hover:bg-gray-200">REDAÇÃO</a>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center p-12 border-[5px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black uppercase">Nenhum resultado encontrado.</h3>
            <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-black text-white font-black uppercase hover:bg-gray-800 transition-colors">Limpar Filtros</button>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 p-4 border-[4px] border-black bg-[#ffdb58] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-[100] flex items-center gap-3 animate-bounce">
           <span className="font-black uppercase text-sm">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
