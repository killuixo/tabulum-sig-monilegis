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

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(''); 
  const [viewMode, setViewMode] = useState('card'); 
  const [activeTab, setActiveTab] = useState('processo'); 

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
  
  const getPedidoVista = (item) => {
      let v = item['Pedido de Vista'] || item['pedido de vista'] || item['Pedido de vista'] || '';
      return (v === '-') ? '' : v;
  };
  const getInformacaoRelatoria = (item) => {
      let r = item['Informação da Relatoria'] || item['Informacao da relatoria'] || item['Informacao da Relatoria'] || item['informacao_relatoria'] || '';
      return (r === '-') ? '' : r;
  };

  const API_URL = (import.meta && import.meta.env && import.meta.env.VITE_GOOGLE_SCRIPT_URL) || "";

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL) {
        throw new Error("A variável VITE_GOOGLE_SCRIPT_URL não foi encontrada.");
      }

      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Falha ao aceder aos dados da API.');
      
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os dados. Verifique a URL do Web App (API_URL). ' + err.message);
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
            getNumero(item) === numero 
              ? { ...item, 'Observações': editValue } 
              : item
          )
        );
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
    document.title = "MoniLegis - TABULUM";
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

    const term = searchTerm.toLowerCase();
    if (term) {
      const relator = getRelator(item).toLowerCase();
      const situacao = getSituacao(item).toLowerCase();
      const ementa = getEmenta(item).toLowerCase();
      const vista = getPedidoVista(item).toLowerCase();
      
      return num.toLowerCase().includes(term) || 
             relator.includes(term) || 
             situacao.includes(term) || 
             ementa.includes(term) ||
             vista.includes(term);
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans p-4 md:p-8 selection:bg-[#ffdb58] selection:text-black">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="border-[6px] border-black bg-white grid grid-cols-1 md:grid-cols-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="md:col-span-3 p-6 md:p-10 border-b-[6px] md:border-b-0 md:border-r-[6px] border-black flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-2">
              <img 
                src="https://raw.githubusercontent.com/killuixo/tabulum-sig-monilegis/refs/heads/main/icon-192.png" 
                alt="Ícone Tabulum" 
                className="w-12 h-12 md:w-16 md:h-16 object-contain drop-shadow-md"
              />
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                TABULUM
              </h1>
            </div>
            <p className="text-lg md:text-xl font-bold text-gray-700">
              Monitor Legislativo do Mandato
            </p>
          </div>
          <div className={`p-4 flex items-center justify-center ${MONDRIAN_COLORS[0]}`}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className={`w-12 h-12 text-white cursor-pointer hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`}
              onClick={fetchData} 
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row mb-6 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <button 
             onClick={() => setActiveTab('processo')}
             className={`flex-1 p-4 font-black uppercase text-lg md:border-r-[4px] border-black transition-colors flex items-center justify-center gap-3 ${activeTab === 'processo' ? MONDRIAN_COLORS[0] + ' text-white' : 'hover:bg-gray-100 text-gray-400'}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
             Processo Legislativo
          </button>
          <button 
             onClick={() => setActiveTab('atividade')}
             className={`flex-1 p-4 font-black uppercase text-lg transition-colors flex items-center justify-center gap-3 ${activeTab === 'atividade' ? MONDRIAN_COLORS[1] + ' text-white' : 'hover:bg-gray-100 text-gray-400'}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
             Atividade Parlamentar
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-0.5 transition-all">
            <div className={`w-4 border-r-[4px] border-black ${activeTab === 'processo' ? MONDRIAN_COLORS[0] : MONDRIAN_COLORS[1]}`}></div>
            <div className="p-4 flex items-center justify-center border-r-[4px] border-black">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input type="text" placeholder="Buscar por número, ementa, relator, situação ou vista..." className="w-full p-4 text-xl font-bold outline-none placeholder-gray-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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

        {!loading && !error && viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredData.map((item, index) => {
              const colorClass = MONDRIAN_COLORS[index % MONDRIAN_COLORS.length];
              const numeroProp = getNumero(item) || 'S/N';
              const ementaProp = getEmenta(item);
              const ultimoMovimentoProp = getUltimoMovimento(item);
              const obsProp = getObservacoes(item);
              const linkProp = getLink(item);
              const vistaProp = getPedidoVista(item);
              const infoRelatoriaProp = getInformacaoRelatoria(item);
              
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
                if (sitLower.includes('arquivad') || sitLower.includes('concluíd') || sitLower.includes('promulgad') || sitLower.includes('aprovad') || textoLower.includes('aprovado por unanimidade')) {
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
                <div key={index} className="bg-white border-[5px] border-black flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
                  <div className={`border-b-[5px] border-black p-4 flex justify-between items-start ${colorClass}`}>
                    <div>
                      <span className="bg-black text-white px-2 py-1 text-xs font-black tracking-widest uppercase">
                        {activeTab === 'processo' ? 'Processo' : 'Atividade'}
                      </span>
                      <h3 className="text-3xl font-black mt-2 text-white drop-shadow-md">
                        {numeroProp}
                      </h3>
                    </div>
                    {linkProp && linkProp !== '-' && (
                      <a href={linkProp} target="_blank" rel="noreferrer" className="bg-white p-2 border-2 border-black hover:bg-gray-200 transition-colors" title="Ver na ALESC">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-black"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                      </a>
                    )}
                  </div>

                  <div className="p-5 flex-grow flex flex-col gap-4">
                    
                    <div className={`border-[3px] p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${boxColorClass}`}>
                      <p className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mb-1 ${titleColorClass}`}>
                        {iconeCaixa}
                        {boxTitle}
                      </p>
                      <p className={`text-sm font-bold leading-snug ${titleColorClass}`}>
                         {textoCaixa}
                      </p>
                    </div>

                    <div className="bg-gray-50 border-[2px] border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-1">Ementa / Resumo</p>
                      <p className="text-sm font-bold text-gray-800 leading-snug">
                        {ementaProp || <span className="text-gray-400 italic font-normal">Ementa não informada.</span>}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase">Situação Geral</p>
                      <p className="text-lg font-black leading-tight border-l-[4px] border-black pl-3 mt-1">
                        {getSituacao(item) || '-'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Setor Atual</p>
                        <p className="font-bold leading-snug truncate">{getSetor(item) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Data Verificação</p>
                        <p className="font-bold">{formatarData(item['Data da Verificação'])}</p>
                      </div>
                    </div>

                    {activeTab === 'processo' && (
                      <div className="pt-4 border-t-[3px] border-black border-dashed flex justify-between items-center">
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-gray-500 uppercase">Relator(a)</p>
                          <p className="font-black text-[15px] uppercase truncate" title={getRelator(item)}>{getRelator(item) || '-'}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                           <p className="text-xs font-bold text-gray-500 uppercase">Distribuição</p>
                           <p className="font-bold">{formatarData(item['Data de Distribuição'])}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t-[3px] border-black bg-gray-50 -mx-5 px-5 pb-5 -mb-5 flex-grow-0">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Notas Internas
                        </p>
                        {editingId !== numeroProp && (
                          <button onClick={() => { setEditingId(numeroProp); setEditValue(obsProp || ''); }} className="text-xs font-bold uppercase underline hover:text-[#008080] transition-colors">
                            Editar
                          </button>
                        )}
                      </div>
                      
                      {editingId === numeroProp ? (
                        <div className="flex flex-col gap-2">
                          <textarea className="w-full border-2 border-black p-2 text-sm font-bold resize-none outline-none focus:border-[#008080]" rows="3" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."/>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-200 transition-colors" disabled={isSaving}>Cancelar</button>
                            <button onClick={() => handleSaveObservacao(numeroProp)} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 flex items-center gap-2 transition-opacity`} disabled={isSaving}>{isSaving ? 'A guardar...' : 'Guardar'}</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-gray-700 min-h-[2rem] whitespace-pre-wrap">
                          {obsProp || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida.</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && viewMode === 'list' && (
          <div className="flex flex-col gap-4">
            {filteredData.map((item, index) => {
              const colorClass = MONDRIAN_COLORS[index % MONDRIAN_COLORS.length];
              const numeroProp = getNumero(item) || 'S/N';
              const ementaProp = getEmenta(item);
              const ultimoMovimentoProp = getUltimoMovimento(item);
              const obsProp = getObservacoes(item);
              const linkProp = getLink(item);
              const vistaProp = getPedidoVista(item);
              const infoRelatoriaProp = getInformacaoRelatoria(item);

              const sitLower = (getSituacao(item) || '').toLowerCase();

              let boxColorClass = 'bg-white text-black';
              let titleColorClass = 'text-black';
              let boxTitle = 'Último Movimento';
              let textoCaixa = infoRelatoriaProp ? infoRelatoriaProp : (ultimoMovimentoProp || '-');

              if (vistaProp) {
                boxColorClass = 'bg-[#c41e3a] text-white';
                titleColorClass = 'text-white';
                boxTitle = 'Pedido de Vista Ativo';
                textoCaixa = `Vista de ${vistaProp}`;
              } else {
                const textoLower = textoCaixa.toLowerCase();
                if (sitLower.includes('arquivad') || sitLower.includes('concluíd') || sitLower.includes('promulgad') || sitLower.includes('aprovad') || textoLower.includes('aprovado por unanimidade')) {
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
                <div key={index} className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 overflow-hidden">
                  <div className={`w-full md:w-4 min-h-[1rem] md:min-h-full border-b-[4px] md:border-b-0 md:border-r-[4px] border-black flex-shrink-0 ${colorClass}`}></div>
                  
                  <div className="p-4 flex-grow flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex flex-row md:flex-col gap-2 items-center md:items-start md:w-32 flex-shrink-0">
                      <span className="bg-black text-white px-2 py-1 text-sm font-black tracking-widest uppercase">
                        {numeroProp}
                      </span>
                      {linkProp && linkProp !== '-' && (
                        <a href={linkProp} target="_blank" rel="noreferrer" className="text-xs font-black uppercase underline hover:text-[#008080]">Ver na ALESC</a>
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
                        <p className="text-xs text-gray-600 font-bold truncate">{getSetor(item) || '-'}</p>
                      </div>
                    </div>

                    <div className="w-full md:w-64 flex-shrink-0 border-t-[3px] md:border-t-0 md:border-l-[3px] border-black border-dashed pt-3 md:pt-0 md:pl-4">
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
            <p className="font-bold text-gray-600 mt-2">Experimente mudar de aba ou alterar os termos da sua pesquisa.</p>
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
