import React, { useState, useEffect } from 'react';

const MONDRIAN_COLORS = [
  'bg-[#c41e3a]', // Carmesim
  'bg-[#008080]', // Azul Esverdeado
  'bg-[#ffdb58]', // Mostarda
];

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState(null); // 'aprovados' ou 'utilidade'

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(''); 
  const [viewMode, setViewMode] = useState('card'); 
  const [activeTab, setActiveTab] = useState('processo'); 
  
  const [selectedItem, setSelectedItem] = useState(null); // Para a Ficha Completa

  const formatarData = (dataString) => {
    if (!dataString || dataString === '-') return '-';
    const apenasData = dataString.split(/[T ]/)[0];
    if (apenasData.includes('-')) {
      return apenasData.split('-').reverse().join('/');
    }
    return apenasData;
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
  const getAutoria = (item) => item['Autoria'] || item['autoria'] || '';
  const getProcessosAnexos = (item) => item['Processos anexos'] || item['Processos Anexos'] || '';
  
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
        throw new Error("A URL do Google Script não foi configurada. Se você usa o Vercel, lembre-se de ir na aba 'Deployments' e fazer um REDEPLOY após adicionar a variável.");
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
        setData(prevData => prevData.map(item => getNumero(item) === numero ? { ...item, 'Observações': editValue } : item));
        setEditingId(null);
        if(selectedItem && getNumero(selectedItem) === numero) {
          setSelectedItem(prev => ({...prev, 'Observações': editValue}));
        }
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

  const filteredData = data.filter(item => {
    const num = getNumero(item).toUpperCase();
    if (!num) return false;

    const prefix = num.split('/')[0].replace('.', ''); 
    const processoPrefixes = ['PL', 'PEC', 'PLC', 'PDL', 'PRC', 'MPV', 'VET', 'MSG'];
    
    const isProcesso = processoPrefixes.includes(prefix);
    if (activeTab === 'processo' && !isProcesso) return false;
    if (activeTab === 'atividade' && isProcesso) return false;

    // Lógica dos Botões Rápidos
    const linksAdic = getLinksAdicionais(item);
    let pLinks = [];
    try { if (linksAdic && linksAdic !== '-') pLinks = JSON.parse(linksAdic); } catch(e) {}
    
    if (quickFilter === 'aprovados') {
       const sit = getSituacao(item).toLowerCase();
       const isApproved = pLinks.some(l => /\blei\b/i.test(l.label) || l.label.toLowerCase().includes('promulgad')) || 
                          sit.includes('lei') || sit.includes('norma jurídica');
       if (!isApproved) return false;
    }
    if (quickFilter === 'utilidade') {
       const ementa = getEmenta(item).toLowerCase();
       if (!ementa.includes('utilidade pública')) return false;
    }

    // Filtro Universal (Busca de Texto)
    const term = searchTerm.toLowerCase();
    if (term) {
      const match = (
        num.toLowerCase().includes(term) ||
        (item['Data de entrada'] || '').toLowerCase().includes(term) ||
        getSetor(item).toLowerCase().includes(term) ||
        getSituacao(item).toLowerCase().includes(term) ||
        getRelator(item).toLowerCase().includes(term) ||
        (item['Data de Distribuição'] || '').toLowerCase().includes(term) ||
        getTipoProposicao(item).toLowerCase().includes(term) ||
        getPedidoVista(item).toLowerCase().includes(term) ||
        getEmenta(item).toLowerCase().includes(term)
      );
      if (!match) return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans p-4 md:p-8 selection:bg-[#ffdb58] selection:text-black">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="border-[6px] border-black bg-white grid grid-cols-1 md:grid-cols-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="md:col-span-3 p-6 md:p-10 border-b-[6px] md:border-b-0 md:border-r-[6px] border-black flex flex-row items-center gap-4 md:gap-6">
            <img src="https://raw.githubusercontent.com/killuixo/tabulum-sig-monilegis/refs/heads/main/icon-192.png" alt="Ícone Tabulum" className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-md flex-shrink-0" />
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-1 md:mb-2">TABULUM</h1>
              <p className="text-lg md:text-xl font-bold text-gray-700 leading-tight">Monitor Legislativo</p>
            </div>
          </div>
          <div className={`p-4 flex items-center justify-center ${MONDRIAN_COLORS[0]}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-12 h-12 text-white cursor-pointer hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} onClick={fetchData}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Abas */}
        <div className="flex flex-col md:flex-row mb-6 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <button onClick={() => setActiveTab('processo')} className={`flex-1 p-4 font-black uppercase text-lg md:border-r-[4px] border-black transition-colors flex items-center justify-center gap-3 ${activeTab === 'processo' ? MONDRIAN_COLORS[0] + ' text-white' : 'hover:bg-gray-100 text-gray-400'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Processo Legislativo
          </button>
          <button onClick={() => setActiveTab('atividade')} className={`flex-1 p-4 font-black uppercase text-lg transition-colors flex items-center justify-center gap-3 ${activeTab === 'atividade' ? MONDRIAN_COLORS[1] + ' text-white' : 'hover:bg-gray-100 text-gray-400'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> Atividade Parlamentar
          </button>
        </div>

        {/* Botões de Filtro Rápido */}
        <div className="flex flex-wrap gap-4 mb-4">
           <button onClick={() => setQuickFilter(quickFilter === 'aprovados' ? null : 'aprovados')} className={`px-4 py-2 border-[3px] border-black font-black uppercase text-sm transition-all ${quickFilter === 'aprovados' ? 'bg-[#00bcd4] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <span className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Leis Aprovadas</span>
           </button>
           <button onClick={() => setQuickFilter(quickFilter === 'utilidade' ? null : 'utilidade')} className={`px-4 py-2 border-[3px] border-black font-black uppercase text-sm transition-all ${quickFilter === 'utilidade' ? 'bg-[#ffdb58] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <span className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Utilidade Pública</span>
           </button>
        </div>

        {/* Barra de Busca e Visualização */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-0.5 transition-all">
            <div className={`w-4 border-r-[4px] border-black ${activeTab === 'processo' ? MONDRIAN_COLORS[0] : MONDRIAN_COLORS[1]}`}></div>
            <div className="p-4 flex items-center justify-center border-r-[4px] border-black">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input type="text" placeholder="Filtro universal (Número, ementa, relator, situação...)" className="w-full p-4 text-xl font-bold outline-none placeholder-gray-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white self-stretch">
            <button onClick={() => setViewMode('card')} className={`flex-1 md:flex-none px-6 py-4 font-black uppercase flex items-center justify-center gap-2 transition-colors ${viewMode === 'card' ? 'bg-[#ffdb58]' : 'hover:bg-gray-100'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> Cards
            </button>
            <div className="w-[4px] bg-black"></div>
            <button onClick={() => setViewMode('list')} className={`flex-1 md:flex-none px-6 py-4 font-black uppercase flex items-center justify-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg> Lista
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

        {}
        {!loading && !error && viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredData.map((item, index) => {
              const numeroProp = getNumero(item) || 'S/N';
              const ementaProp = getEmenta(item);
              const ultimoMovimentoProp = getUltimoMovimento(item);
              const obsProp = getObservacoes(item);
              const linkProp = getLink(item);
              const vistaProp = getPedidoVista(item);
              const infoRelatoriaProp = getInformacaoRelatoria(item);
              
              const linksAdicProp = getLinksAdicionais(item);
              let parsedLinks = [];
              try { if (linksAdicProp && linksAdicProp !== '-') parsedLinks = JSON.parse(linksAdicProp); } catch(e) {}

              // Lógica de Identificação de Links Especiais
              let leiLink = parsedLinks.find(l => /\blei\b/i.test(l.label) || l.label.toLowerCase().includes('promulgad'));
              let diarioLink = parsedLinks.find(l => l.label.toLowerCase().includes('diário'));
              let vetoLink = parsedLinks.find(l => l.label.toLowerCase().includes('veto'));
              let redacaoLink = parsedLinks.find(l => l.label.toLowerCase().includes('redação'));

              const sitLower = (getSituacao(item) || '').toLowerCase();

              let boxColorClass = 'bg-[#ffdb58]/30 text-black border-black';
              let titleColorClass = 'text-black';
              let boxTitle = 'Último Movimento';
              let iconeCaixa = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>;
              
              let textoCaixa = infoRelatoriaProp ? infoRelatoriaProp : (ultimoMovimentoProp || '-');

              if (vistaProp) {
                boxColorClass = 'bg-[#c41e3a] text-white border-black';
                titleColorClass = 'text-white';
                boxTitle = 'Pedido de Vista Ativo';
                iconeCaixa = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
                textoCaixa = `Vista de ${vistaProp}`;
              } else {
                const textoLower = textoCaixa.toLowerCase();
                if (leiLink || sitLower.includes('arquivad') || sitLower.includes('concluíd') || sitLower.includes('promulgad') || sitLower.includes('aprovad') || textoLower.includes('aprovado por unanimidade')) {
                   boxColorClass = 'bg-[#008080] text-white border-black';
                   titleColorClass = 'text-white';
                   if (textoLower.includes('diligência') && !sitLower.includes('concluíd') && !sitLower.includes('arquivad')) {
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
                <div key={index} onClick={() => setSelectedItem(item)} className="bg-white border-[5px] border-black flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-pointer">
                  <div className="border-b-[5px] border-black p-4 flex justify-between items-start bg-gray-100">
                    <div>
                      <span className="bg-black text-white px-2 py-1 text-xs font-black tracking-widest uppercase">
                        {getTipoProposicao(item)}
                      </span>
                      <h3 className="text-3xl font-black mt-2 text-black hover:text-[#008080] transition-colors">
                        {numeroProp}
                      </h3>
                    </div>
                    {linkProp && linkProp !== '-' && (
                      <a href={linkProp} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="bg-white p-2 border-2 border-black hover:bg-gray-200 transition-colors" title="Ver na ALESC">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-black"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                      </a>
                    )}
                  </div>

                  <div className="p-5 flex-grow flex flex-col gap-4 pointer-events-none">
                    <div className={`border-[3px] p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${boxColorClass}`}>
                      <p className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mb-1 ${titleColorClass}`}>
                        {iconeCaixa} {boxTitle}
                      </p>
                      <p className={`text-sm font-bold leading-snug ${titleColorClass}`}>
                         {textoCaixa}
                      </p>
                    </div>

                    <div className="bg-gray-50 border-[2px] border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
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

                    {activeTab === 'processo' && (
                      <div className="pt-4 border-t-[3px] border-black border-dashed flex justify-between items-center">
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Relator(a)</p>
                          <p className="font-black text-[13px] uppercase truncate" title={getRelator(item)}>{getRelator(item) || '-'}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase">Distribuição</p>
                           <p className="text-sm font-bold text-gray-600">{formatarData(item['Data de Distribuição'])}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t-[3px] border-black bg-gray-50 -mx-5 px-5 pb-5 -mb-5 flex-grow-0 pointer-events-auto" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Notas Internas
                        </p>
                        {editingId !== numeroProp && (
                          <button onClick={() => { setEditingId(numeroProp); setEditValue(obsProp || ''); }} className="text-[10px] font-bold uppercase underline hover:text-[#008080] transition-colors">
                            Editar
                          </button>
                        )}
                      </div>
                      
                      {editingId === numeroProp ? (
                        <div className="flex flex-col gap-2">
                          <textarea className="w-full border-2 border-black p-2 text-sm font-bold resize-none outline-none focus:border-[#008080]" rows="3" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."/>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-200 transition-colors" disabled={isSaving}>Cancelar</button>
                            <button onClick={() => handleSaveObservacao(numeroProp)} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 transition-opacity`} disabled={isSaving}>{isSaving ? '...' : 'Guardar'}</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-gray-700 min-h-[2rem] whitespace-pre-wrap line-clamp-3">
                          {obsProp || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida.</span>}
                        </p>
                      )}
                      
                      {/* Botões de Leis e Vetos Refinados */}
                      {(leiLink || diarioLink || vetoLink || redacaoLink) && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t-[3px] border-black border-dashed">
                          {leiLink && <a href={leiLink.url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-wider bg-[#00bcd4] text-black border-2 border-black px-2 py-1 flex items-center gap-1 hover:bg-[#0097a7] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg> LEI APROVADA</a>}
                          {diarioLink && <a href={diarioLink.url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-wider bg-black text-white border-2 border-black px-2 py-1 flex items-center gap-1 hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">DIÁRIO OFICIAL</a>}
                          {vetoLink && <a href={vetoLink.url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-wider bg-[#c41e3a] text-white border-2 border-black px-2 py-1 flex items-center gap-1 hover:bg-red-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">VETADO</a>}
                          {redacaoLink && !leiLink && <a href={redacaoLink.url} target="_blank" rel="noreferrer" className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border-[1px] border-gray-400 px-2 py-1 hover:bg-gray-200 transition-colors">REDAÇÃO FINAL</a>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {}
        {!loading && !error && viewMode === 'list' && (
          <div className="flex flex-col gap-4">
            {filteredData.map((item, index) => {
              const numeroProp = getNumero(item) || 'S/N';
              const ementaProp = getEmenta(item);
              const ultimoMovimentoProp = getUltimoMovimento(item);
              const obsProp = getObservacoes(item);
              const linkProp = getLink(item);
              const vistaProp = getPedidoVista(item);
              const infoRelatoriaProp = getInformacaoRelatoria(item);
              
              const linksAdicProp = getLinksAdicionais(item);
              let parsedLinks = [];
              try { if (linksAdicProp && linksAdicProp !== '-') parsedLinks = JSON.parse(linksAdicProp); } catch(e) {}

              let leiLink = parsedLinks.find(l => /\blei\b/i.test(l.label) || l.label.toLowerCase().includes('promulgad'));
              let diarioLink = parsedLinks.find(l => l.label.toLowerCase().includes('diário'));
              let vetoLink = parsedLinks.find(l => l.label.toLowerCase().includes('veto'));
              let redacaoLink = parsedLinks.find(l => l.label.toLowerCase().includes('redação'));

              const sitLower = (getSituacao(item) || '').toLowerCase();

              let boxColorClass = 'bg-white text-black';
              let titleColorClass = 'text-black';
              let boxTitle = 'Último Movimento';
              let textoCaixa = infoRelatoriaProp ? infoRelatoriaProp : (ultimoMovimentoProp || '-');

              if (vistaProp) {
                boxColorClass = 'bg-[#c41e3a] text-white';
                titleColorClass = 'text-white';
                boxTitle = 'Pedido de Vista';
                textoCaixa = `Vista de ${vistaProp}`;
              } else {
                const textoLower = textoCaixa.toLowerCase();
                if (leiLink || sitLower.includes('arquivad') || sitLower.includes('concluíd') || sitLower.includes('promulgad') || sitLower.includes('aprovad') || textoLower.includes('aprovado por unanimidade')) {
                   boxColorClass = 'bg-[#008080] text-white';
                   titleColorClass = 'text-white';
                   if (textoLower.includes('diligência') && !sitLower.includes('concluíd') && !sitLower.includes('arquivad')) {
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
                <div key={index} onClick={() => setSelectedItem(item)} className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 overflow-hidden cursor-pointer">
                  <div className="w-full md:w-4 min-h-[1rem] md:min-h-full border-b-[4px] md:border-b-0 md:border-r-[4px] border-black flex-shrink-0 bg-gray-200"></div>
                  
                  <div className="p-4 flex-grow flex flex-col md:flex-row gap-6 items-start md:items-center pointer-events-none">
                    <div className="flex flex-row md:flex-col gap-2 items-center md:items-start md:w-32 flex-shrink-0">
                      <span className="bg-black text-white px-2 py-1 text-xs font-black tracking-widest uppercase">
                        {getTipoProposicao(item)}
                      </span>
                      <span className="text-sm font-black tracking-widest uppercase">
                        {numeroProp}
                      </span>
                      {linkProp && linkProp !== '-' && (
                        <a href={linkProp} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-black uppercase underline hover:text-[#008080] pointer-events-auto">Ver na ALESC</a>
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

                    <div className="w-full md:w-64 flex-shrink-0 border-t-[3px] md:border-t-0 md:border-l-[3px] border-black border-dashed pt-3 md:pt-0 md:pl-4 pointer-events-auto" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-1">Notas</p>
                        {editingId !== numeroProp && (
                          <button onClick={() => { setEditingId(numeroProp); setEditValue(obsProp || ''); }} className="text-[10px] font-bold uppercase underline hover:text-[#008080] transition-colors">Editar</button>
                        )}
                      </div>
                      
                      {editingId === numeroProp ? (
                        <div className="flex flex-col gap-2">
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
                      
                      {(leiLink || diarioLink || vetoLink || redacaoLink) && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t-[2px] border-black border-dashed">
                           {leiLink && <a href={leiLink.url} target="_blank" rel="noreferrer" className="text-[8px] font-black uppercase tracking-wider bg-[#00bcd4] text-black border-[1px] border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-[#0097a7]">LEI APROVADA</a>}
                           {diarioLink && <a href={diarioLink.url} target="_blank" rel="noreferrer" className="text-[8px] font-black uppercase tracking-wider bg-black text-white border-[1px] border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800">DIÁRIO OFICIAL</a>}
                           {vetoLink && <a href={vetoLink.url} target="_blank" rel="noreferrer" className="text-[8px] font-black uppercase tracking-wider bg-[#c41e3a] text-white border-[1px] border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-red-800">VETADO</a>}
                           {redacaoLink && !leiLink && <a href={redacaoLink.url} target="_blank" rel="noreferrer" className="text-[8px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 border-[1px] border-gray-400 px-1.5 py-0.5 hover:bg-gray-300">REDAÇÃO FINAL</a>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center p-12 border-[5px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black uppercase">Nenhum resultado encontrado.</h3>
            <p className="font-bold text-gray-600 mt-2">Experimente limpar os filtros de pesquisa.</p>
            <button onClick={() => {setSearchTerm(''); setQuickFilter(null);}} className="mt-4 px-6 py-2 bg-black text-white font-black uppercase hover:bg-gray-800 transition-colors">Limpar Filtros</button>
          </div>
        )}
      </div>

      {}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-white border-[6px] border-black shadow-[12px_12px_0px_0px_rgba(255,219,88,1)] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            
            <div className="bg-black text-white p-4 md:p-6 flex justify-between items-center flex-shrink-0">
              <div>
                <span className="bg-[#ffdb58] text-black px-3 py-1 text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  Ficha Completa • {getTipoProposicao(selectedItem)}
                </span>
                <h2 className="text-3xl md:text-5xl font-black mt-3">{getNumero(selectedItem)}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-white hover:text-[#ffdb58] transition-colors p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b-[4px] border-black pb-6">
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Data de Entrada</p>
                  <p className="text-xl font-bold">{selectedItem['Data de entrada'] || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Autoria</p>
                  <p className="text-xl font-bold">{getAutoria(selectedItem) || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Verificação Script</p>
                  <p className="text-xl font-bold">{formatarData(selectedItem['Data da Verificação'])}</p>
                </div>
              </div>

              <div className="bg-gray-50 border-[3px] border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Ementa / Resumo</p>
                <p className="text-lg md:text-xl font-bold text-gray-900 leading-snug">{getEmenta(selectedItem) || '-'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div className="border-[3px] border-black p-4">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Situação Geral</p>
                    <p className="text-2xl font-black text-[#008080]">{getSituacao(selectedItem) || '-'}</p>
                  </div>
                  <div className="border-[3px] border-black p-4">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Setor Atual</p>
                    <p className="text-lg font-bold">{getSetor(selectedItem) || '-'}</p>
                  </div>
                  <div className="border-[3px] border-black p-4 bg-[#ffdb58]/20">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Último Movimento (Timeline)</p>
                    <p className="text-md font-bold">{getUltimoMovimento(selectedItem) || '-'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="border-[3px] border-black p-4 border-dashed">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Relator(a) Atual</p>
                        <p className="text-lg font-bold">{getRelator(selectedItem) || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Distribuição</p>
                        <p className="text-lg font-bold">{formatarData(selectedItem['Data de Distribuição'])}</p>
                      </div>
                    </div>
                    {getInformacaoRelatoria(selectedItem) && (
                      <p className="text-sm italic text-gray-600 mt-2 pt-2 border-t border-gray-300">↳ {getInformacaoRelatoria(selectedItem)}</p>
                    )}
                  </div>

                  <div className={`border-[3px] border-black p-4 ${getPedidoVista(selectedItem) ? 'bg-[#c41e3a] text-white' : ''}`}>
                    <p className={`text-xs font-black uppercase tracking-widest ${getPedidoVista(selectedItem) ? 'text-white/80' : 'text-gray-500'}`}>Pedido de Vista em Aberto</p>
                    <p className="text-lg font-bold">{getPedidoVista(selectedItem) || 'Nenhum'}</p>
                  </div>

                  <div className="border-[3px] border-black p-4">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Processos Anexos</p>
                    <p className="text-md font-bold text-[#008080]">{getProcessosAnexos(selectedItem) || 'Nenhum'}</p>
                  </div>
                </div>
              </div>

              <div className="border-[3px] border-black p-4 md:p-6 bg-gray-100">
                <div className="flex justify-between items-center border-b-[3px] border-black pb-2 mb-3">
                  <p className="text-md font-black text-black uppercase">Anotações Internas do Painel</p>
                  {editingId !== getNumero(selectedItem) && (
                    <button onClick={() => { setEditingId(getNumero(selectedItem)); setEditValue(getObservacoes(selectedItem) || ''); }} className="text-xs font-black uppercase underline hover:text-[#008080]">Editar</button>
                  )}
                </div>
                
                {editingId === getNumero(selectedItem) ? (
                  <div className="flex flex-col gap-2">
                    <textarea className="w-full border-[3px] border-black p-3 text-sm font-bold resize-none outline-none focus:border-[#008080]" rows="3" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."/>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-white border-[3px] border-black text-xs font-black uppercase hover:bg-gray-200 transition-colors" disabled={isSaving}>Cancelar</button>
                      <button onClick={() => handleSaveObservacao(getNumero(selectedItem))} className={`px-4 py-2 border-[3px] border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90`} disabled={isSaving}>{isSaving ? 'A guardar...' : 'Guardar Alteração'}</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-md font-bold text-gray-800 whitespace-pre-wrap">
                    {getObservacoes(selectedItem) || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida na planilha.</span>}
                  </p>
                )}
              </div>

              {/* Botões de Leis na Ficha Completa */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t-[4px] border-black">
                {getLink(selectedItem) && getLink(selectedItem) !== '-' && (
                  <a href={getLink(selectedItem)} target="_blank" rel="noreferrer" className="px-4 py-2 border-[3px] border-black font-black uppercase text-sm bg-white hover:bg-gray-200 flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    Acessar ALESC
                  </a>
                )}
                
                {(() => {
                    const linksAdic = getLinksAdicionais(selectedItem);
                    let pLinks = [];
                    try { if (linksAdic && linksAdic !== '-') pLinks = JSON.parse(linksAdic); } catch(e) {}
                    
                    let leiLink = pLinks.find(l => /\blei\b/i.test(l.label) || l.label.toLowerCase().includes('promulgad'));
                    let diarioLink = pLinks.find(l => l.label.toLowerCase().includes('diário'));
                    let vetoLink = pLinks.find(l => l.label.toLowerCase().includes('veto'));
                    
                    return (
                        <>
                           {leiLink && (
                             <a href={leiLink.url} target="_blank" rel="noreferrer" className="px-4 py-2 border-[3px] border-black font-black uppercase text-sm bg-[#00bcd4] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
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
                        </>
                    );
                })()}
              </div>

            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 right-6 p-4 border-[4px] border-black bg-[#ffdb58] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50 flex items-center gap-3 animate-bounce">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           <span className="font-black uppercase text-sm">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
