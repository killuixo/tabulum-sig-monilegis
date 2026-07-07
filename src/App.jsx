import React, { useState, useEffect } from 'react';

// Cores da paleta Mondrian solicitada
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
  
  // Novo estado para controlar a visualização (card ou lista)
  const [viewMode, setViewMode] = useState('card'); 

  // Estados para a edição de observações
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para substituir o "alert" por uma mensagem visual na tela
  const [toast, setToast] = useState(null);

  // Função para exibir mensagem sem usar alert()
  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Formata a data removendo a hora e invertendo para DD/MM/AAAA
  const formatarData = (dataString) => {
    if (!dataString || dataString === '-') return '-';
    const apenasData = dataString.split(/[T ]/)[0];
    if (apenasData.includes('-')) {
      return apenasData.split('-').reverse().join('/');
    }
    return apenasData;
  };

  // Funções flexíveis para ler os dados das colunas ignorando problemas de digitação/acentos
  const getNumero = (item) => item['Número da Proposição'] || item['Numero da Proposicao'] || item['numero'] || '';
  const getEmenta = (item) => item['Ementa'] || item['ementa'] || item['EMENTA'] || item['Resumo'] || '';
  const getUltimoMovimento = (item) => item['Último Movimento'] || item['Ultimo Movimento'] || item['Ultimo movimento'] || item['ultimo movimento'] || '';
  const getRelator = (item) => item['Relator(a) na Comissão'] || item['Relator'] || item['relator'] || '';
  const getSituacao = (item) => item['Situação'] || item['Situacao'] || item['situacao'] || '';
  const getSetor = (item) => item['Setor Atual'] || item['Setor atual'] || item['setor'] || '';
  const getObservacoes = (item) => item['Observações'] || item['Observacoes'] || item['observacoes'] || '';
  const getLink = (item) => item['Link'] || item['link'] || '';

  // Nota: Para evitar o erro de compilação no ambiente de pré-visualização, defina a URL diretamente.
  // Ao exportar e compilar no Vercel/Vite, você pode voltar a usar: import.meta.env.VITE_GOOGLE_SCRIPT_URL
  const API_URL = "";

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL) {
        throw new Error("A URL da API não foi definida. Por favor, cole a URL do Google Script na constante API_URL.");
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
        showToast("Observação guardada com sucesso!", "success");
      } else {
        showToast("Erro ao guardar: " + result.message, "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de comunicação ao guardar a observação.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    const numero = getNumero(item).toLowerCase();
    const relator = getRelator(item).toLowerCase();
    const situacao = getSituacao(item).toLowerCase();
    const ementa = getEmenta(item).toLowerCase();
    
    return numero.includes(term) || relator.includes(term) || situacao.includes(term) || ementa.includes(term);
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans p-4 md:p-8 selection:bg-[#ffdb58] selection:text-black">
      
      {/* Toast de Notificação (Substituto do Alert) */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 border-[4px] border-black font-bold flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce ${toast.type === 'error' ? 'bg-[#c41e3a] text-white' : 'bg-[#ffdb58] text-black'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {toast.type === 'error' ? (
               <><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></>
            ) : (
               <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></>
            )}
          </svg>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-4 underline text-sm uppercase">Fechar</button>
        </div>
      )}

      {/* HEADER ESTILO MONDRIAN */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="border-[6px] border-black bg-white grid grid-cols-1 md:grid-cols-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="md:col-span-3 p-6 md:p-10 border-b-[6px] md:border-b-0 md:border-r-[6px] border-black flex flex-col justify-center">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2">
              Monitor Legislativo
            </h1>
            <p className="text-lg md:text-xl font-bold text-gray-700">
              Acompanhamento de Proposições da ALESC
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-1 grid-rows-2">
            <div className={`border-r-[6px] md:border-r-0 md:border-b-[6px] border-black p-4 flex items-center justify-center ${MONDRIAN_COLORS[0]}`}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`w-10 h-10 text-white cursor-pointer hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`}
                onClick={fetchData} 
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </div>
            <div className={`p-4 flex items-center justify-center ${MONDRIAN_COLORS[2]}`}>
               <span className="font-black text-xl text-center">ALESC</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* BARRA DE PESQUISA */}
        <div className="mb-6 relative flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-0.5 transition-all">
          <div className={`w-4 border-r-[4px] border-black ${MONDRIAN_COLORS[1]}`}></div>
          <div className="p-4 flex items-center justify-center border-r-[4px] border-black">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por número, ementa, relator ou situação..."
            className="w-full p-4 text-xl font-bold outline-none placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* CONTROLO DE VISUALIZAÇÃO (CARD vs LISTA) */}
        {!loading && !error && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-white border-[4px] border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="font-black text-lg uppercase bg-black text-white px-3 py-1 tracking-wider">
               {filteredData.length} {filteredData.length === 1 ? 'Proposição' : 'Proposições'}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('card')}
                className={`flex-1 sm:flex-none p-2 border-[3px] border-black font-black uppercase flex items-center justify-center gap-2 transition-all ${viewMode === 'card' ? `bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,219,88,1)]` : 'bg-white hover:bg-gray-100'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 sm:flex-none p-2 border-[3px] border-black font-black uppercase flex items-center justify-center gap-2 transition-all ${viewMode === 'list' ? `bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,128,128,1)]` : 'bg-white hover:bg-gray-100'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center p-20 border-[6px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-3xl font-black uppercase animate-pulse">A Carregar Dados...</h2>
          </div>
        )}

        {error && (
          <div className="p-8 border-[6px] border-black bg-[#c41e3a] text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 flex-shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4"/>
              <path d="M12 16h.01"/>
            </svg>
            <div>
              <h2 className="text-2xl font-black uppercase mb-2">Erro de Ligação</h2>
              <p className="font-bold text-lg">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ===================== MODO CARD ===================== */}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredData.map((item, index) => {
                  const colorClass = MONDRIAN_COLORS[index % MONDRIAN_COLORS.length];
                  const numeroProp = getNumero(item) || 'S/N';
                  const ementaProp = getEmenta(item);
                  const ultimoMovimentoProp = getUltimoMovimento(item);
                  const obsProp = getObservacoes(item);
                  const linkProp = getLink(item);
                  
                  return (
                    <div 
                      key={index} 
                      className="bg-white border-[5px] border-black flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
                    >
                      <div className={`border-b-[5px] border-black p-4 flex justify-between items-start ${colorClass}`}>
                        <div>
                          <span className="bg-black text-white px-2 py-1 text-xs font-black tracking-widest uppercase">Proposição</span>
                          <h3 className="text-3xl font-black mt-2 text-white drop-shadow-md">{numeroProp}</h3>
                        </div>
                        {linkProp && linkProp !== '-' && (
                          <a href={linkProp} target="_blank" rel="noreferrer" className="bg-white p-2 border-2 border-black hover:bg-gray-200 transition-colors" title="Ver na ALESC">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-black">
                              <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            </svg>
                          </a>
                        )}
                      </div>

                      <div className="p-5 flex-grow flex flex-col gap-4">
                        <div className="bg-gray-50 border-[2px] border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <p className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-1">Ementa / Resumo</p>
                          <p className="text-sm font-bold text-gray-800 leading-snug">
                            {ementaProp || <span className="text-gray-400 italic font-normal">Ementa não informada.</span>}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">Situação Geral</p>
                          <p className="text-lg font-black leading-tight border-l-[4px] border-black pl-3 mt-1">{getSituacao(item) || '-'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Setor Atual</p>
                            <p className="font-bold leading-snug">{getSetor(item) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Data Verificação</p>
                            <p className="font-bold">{formatarData(item['Data da Verificação'])}</p>
                          </div>
                        </div>

                        <div className="pt-4 border-t-[3px] border-black border-dashed flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Relator(a)</p>
                            <p className="font-black text-[15px] uppercase">{getRelator(item) || '-'}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold text-gray-500 uppercase">Distribuição</p>
                             <p className="font-bold">{formatarData(item['Data de Distribuição'])}</p>
                          </div>
                        </div>

                        <div className={`mt-2 border-[3px] border-black p-3 ${ultimoMovimentoProp ? 'bg-[#ffdb58]/30' : 'bg-white'}`}>
                          <p className="text-[10px] font-black text-black uppercase tracking-wider flex items-center gap-1 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> Último Movimento / Vistas
                          </p>
                          <p className="text-sm font-bold text-black leading-snug">{ultimoMovimentoProp || '-'}</p>
                        </div>

                        {/* Edição de Observações - CARD */}
                        <div className="mt-auto pt-4 border-t-[3px] border-black bg-gray-50 -mx-5 px-5 pb-5 -mb-5 flex-grow-0">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Notas Internas
                            </p>
                            {editingId !== numeroProp && (
                              <button onClick={() => { setEditingId(numeroProp); setEditValue(obsProp || ''); }} className="text-xs font-bold uppercase underline hover:text-[#008080] transition-colors">Editar</button>
                            )}
                          </div>
                          
                          {editingId === numeroProp ? (
                            <div className="flex flex-col gap-2">
                              <textarea 
                                className="w-full border-2 border-black p-2 text-sm font-bold resize-none outline-none focus:border-[#008080]"
                                rows="3" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-200" disabled={isSaving}>Cancelar</button>
                                <button onClick={() => handleSaveObservacao(numeroProp)} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 flex items-center gap-2`} disabled={isSaving}>{isSaving ? 'A guardar...' : 'Guardar'}</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-gray-700 min-h-[2rem]">
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

            {/* ===================== MODO LISTA ===================== */}
            {viewMode === 'list' && (
              <div className="flex flex-col gap-6">
                {filteredData.map((item, index) => {
                  const colorClass = MONDRIAN_COLORS[index % MONDRIAN_COLORS.length];
                  const numeroProp = getNumero(item) || 'S/N';
                  const ementaProp = getEmenta(item);
                  const ultimoMovimentoProp = getUltimoMovimento(item);
                  const obsProp = getObservacoes(item);
                  const linkProp = getLink(item);
                  
                  return (
                    <div 
                      key={index} 
                      className="bg-white border-[5px] border-black flex flex-col xl:flex-row shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
                    >
                      {/* Coluna 1: Número e Cor */}
                      <div className={`p-4 border-b-[5px] xl:border-b-0 xl:border-r-[5px] border-black flex xl:flex-col justify-between items-center xl:items-start xl:w-56 shrink-0 ${colorClass}`}>
                        <div>
                          <span className="bg-black text-white px-2 py-1 text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Proposição</span>
                          <h3 className="text-2xl lg:text-3xl font-black text-white drop-shadow-md leading-none">{numeroProp}</h3>
                        </div>
                        {linkProp && linkProp !== '-' && (
                          <a href={linkProp} target="_blank" rel="noreferrer" className="bg-white p-2 border-2 border-black hover:bg-gray-200 mt-0 xl:mt-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Ver na ALESC">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-black">
                              <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            </svg>
                          </a>
                        )}
                      </div>

                      {/* Coluna 2: Informações Principais */}
                      <div className="p-4 flex-grow flex flex-col gap-3 min-w-0">
                        {/* Ementa */}
                        <div className="bg-gray-50 border-[2px] border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <p className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-1">Ementa / Resumo</p>
                          <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2 hover:line-clamp-none transition-all cursor-pointer" title="Clique para expandir/reduzir">
                            {ementaProp || <span className="text-gray-400 italic font-normal">Ementa não informada.</span>}
                          </p>
                        </div>

                        {/* Grid de Situação */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Situação</p>
                            <p className="text-sm font-black leading-tight border-l-[3px] border-black pl-2 mt-0.5 truncate" title={getSituacao(item)}>{getSituacao(item) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Relator(a)</p>
                            <p className="text-sm font-black leading-tight border-l-[3px] border-black pl-2 mt-0.5 truncate" title={getRelator(item)}>{getRelator(item) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Setor Atual</p>
                            <p className="text-sm font-bold leading-tight mt-0.5 truncate">{getSetor(item) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Datas</p>
                            <p className="text-xs font-bold leading-tight mt-0.5">Dist: {formatarData(item['Data de Distribuição'])}</p>
                            <p className="text-xs font-bold leading-tight">Verif: {formatarData(item['Data da Verificação'])}</p>
                          </div>
                        </div>

                        {/* Último Movimento */}
                        {ultimoMovimentoProp && (
                          <div className="border-[2px] border-black p-2 bg-[#ffdb58]/30 mt-1 flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                            <div>
                              <p className="text-[10px] font-black text-black uppercase tracking-wider mb-0.5">Último Movimento / Vistas</p>
                              <p className="text-xs font-bold text-black leading-snug">{ultimoMovimentoProp}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Coluna 3: Edição de Observações - LISTA */}
                      <div className="p-4 border-t-[5px] xl:border-t-0 xl:border-l-[5px] border-black bg-gray-50 xl:w-80 shrink-0 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-black text-gray-800 uppercase flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Notas Internas
                          </p>
                          {editingId !== numeroProp && (
                            <button onClick={() => { setEditingId(numeroProp); setEditValue(obsProp || ''); }} className="text-[10px] font-bold uppercase underline hover:text-[#008080] transition-colors">Editar</button>
                          )}
                        </div>
                        
                        {editingId === numeroProp ? (
                          <div className="flex flex-col gap-2 flex-grow">
                            <textarea 
                              className="w-full flex-grow min-h-[4rem] border-2 border-black p-2 text-xs font-bold resize-none outline-none focus:border-[#008080]"
                              value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação..."
                            />
                            <div className="flex gap-2 justify-end mt-auto">
                              <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-white border-2 border-black text-[10px] font-bold uppercase hover:bg-gray-200" disabled={isSaving}>Cancelar</button>
                              <button onClick={() => handleSaveObservacao(numeroProp)} className={`px-2 py-1 border-2 border-black text-[10px] font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 flex items-center gap-1`} disabled={isSaving}>{isSaving ? '...' : 'Guardar'}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-gray-700 overflow-y-auto max-h-32 pr-2 custom-scrollbar">
                            {obsProp || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida.</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        
        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center p-12 border-[5px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black uppercase">Nenhuma proposição encontrada.</h3>
            <p className="font-bold text-gray-600 mt-2">Tente alterar os termos da sua pesquisa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
