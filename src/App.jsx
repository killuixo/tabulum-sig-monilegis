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
  
  // Novo estado para controlar o modo de visualização ('cards' ou 'list')
  const [viewMode, setViewMode] = useState('cards'); 

  // Estados para a edição de observações
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Formata a data removendo a hora e invertendo para DD/MM/AAAA
  const formatarData = (dataString) => {
    if (!dataString || dataString === '-') return '-';
    const apenasData = dataString.split(/[T ]/)[0];
    if (apenasData.includes('-')) {
      return apenasData.split('-').reverse().join('/');
    }
    return apenasData;
  };

  // Funções flexíveis para ler os dados das colunas
  const getNumero = (item) => item['Número da Proposição'] || item['Numero da Proposicao'] || item['numero'] || '';
  const getEmenta = (item) => item['Ementa'] || item['ementa'] || item['EMENTA'] || item['Resumo'] || '';
  const getUltimoMovimento = (item) => item['Último Movimento'] || item['Ultimo Movimento'] || item['Ultimo movimento'] || item['ultimo movimento'] || '';
  const getRelator = (item) => item['Relator(a) na Comissão'] || item['Relator'] || item['relator'] || '';
  const getSituacao = (item) => item['Situação'] || item['Situacao'] || item['situacao'] || '';
  const getSetor = (item) => item['Setor Atual'] || item['Setor atual'] || item['setor'] || '';
  const getObservacoes = (item) => item['Observações'] || item['Observacoes'] || item['observacoes'] || '';
  const getLink = (item) => item['Link'] || item['link'] || '';

  const API_URL = ""; // Coloque a URL do seu Google Script aqui.

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL) {
        throw new Error("A variável VITE_GOOGLE_SCRIPT_URL não foi encontrada ou a API_URL está vazia.");
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
      } else {
        alert("Erro ao guardar: " + result.message);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de comunicação ao guardar a observação.");
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
      {/* HEADER ESTILO MONDRIAN */}
      <div className="max-w-7xl mx-auto mb-8">
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
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
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
        {/* BARRA DE PESQUISA E CONTROLO DE VISTA */}
        <div className="mb-8 flex flex-col lg:flex-row gap-4">
          <div className="relative flex flex-grow border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-0.5 transition-all">
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
              className="w-full p-4 text-lg md:text-xl font-bold outline-none placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* TOGGLE VIEW (CARDS / LISTA) */}
          <div className="flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white self-start lg:self-stretch">
            <button 
              onClick={() => setViewMode('cards')}
              className={`flex-1 lg:flex-none p-4 flex items-center justify-center transition-colors ${viewMode === 'cards' ? 'bg-[#ffdb58]' : 'hover:bg-gray-100'}`}
              title="Visualização em Cartões"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
              </svg>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex-1 lg:flex-none p-4 border-l-[4px] border-black flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[#ffdb58]' : 'hover:bg-gray-100'}`}
              title="Visualização em Lista"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* FEEDBACK MENSAGENS */}
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

        {/* --- CONTEÚDO PRINCIPAL --- */}
        {!loading && !error && (
          <>
            {/* ====== MODO CARDS ====== */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredData.map((item, index) => {
                  const colorClass = MONDRIAN_COLORS[index % MONDRIAN_COLORS.length];
                  const numeroProp = getNumero(item) || 'S/N';
                  const ementaProp = getEmenta(item);
                  const ultimoMovimentoProp = getUltimoMovimento(item);
                  const obsProp = getObservacoes(item);
                  const linkProp = getLink(item);
                  
                  return (
                    <div key={index} className="bg-white border-[5px] border-black flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
                      {/* Cabeçalho do Card */}
                      <div className={`border-b-[5px] border-black p-4 flex justify-between items-start ${colorClass}`}>
                        <div>
                          <span className="bg-black text-white px-2 py-1 text-xs font-black tracking-widest uppercase">Proposição</span>
                          <h3 className="text-3xl font-black mt-2 text-white drop-shadow-md">{numeroProp}</h3>
                        </div>
                        {linkProp && linkProp !== '-' && (
                          <a href={linkProp} target="_blank" rel="noreferrer" className="bg-white p-2 border-2 border-black hover:bg-gray-200 transition-colors" title="Ver na ALESC">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-black"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                          </a>
                        )}
                      </div>

                      {/* Corpo do Card */}
                      <div className="p-5 flex-grow flex flex-col gap-4">
                        <div className="bg-gray-50 border-[2px] border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <p className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-1">Ementa / Resumo</p>
                          <p className="text-sm font-bold text-gray-800 leading-snug">{ementaProp || <span className="text-gray-400 italic font-normal">Ementa não informada.</span>}</p>
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
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                            Último Movimento / Vistas
                          </p>
                          <p className="text-sm font-bold text-black leading-snug">{ultimoMovimentoProp || '-'}</p>
                        </div>

                        {/* EDIÇÃO DE OBSERVAÇÕES */}
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
                              <textarea 
                                className="w-full border-2 border-black p-2 text-sm font-bold resize-none outline-none focus:border-[#008080]" rows="3"
                                value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-200 transition-colors" disabled={isSaving}>Cancelar</button>
                                <button onClick={() => handleSaveObservacao(numeroProp)} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 flex items-center gap-2 transition-opacity`} disabled={isSaving}>
                                  {isSaving ? 'A guardar...' : 'Guardar'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-gray-700 min-h-[2rem] whitespace-pre-wrap">{obsProp || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida.</span>}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ====== MODO LISTA ====== */}
            {viewMode === 'list' && (
              <div className="flex flex-col gap-5">
                {filteredData.map((item, index) => {
                  const colorClass = MONDRIAN_COLORS[index % MONDRIAN_COLORS.length];
                  const numeroProp = getNumero(item) || 'S/N';
                  const ementaProp = getEmenta(item);
                  const ultimoMovimentoProp = getUltimoMovimento(item);
                  const obsProp = getObservacoes(item);
                  const linkProp = getLink(item);

                  return (
                    <div key={index} className="bg-white border-[4px] border-black flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                      
                      {/* Linha Principal da Lista */}
                      <div className="flex flex-col md:flex-row gap-4 p-4 items-start md:items-center">
                        {/* Faixa de cor (Visível apenas em Desktop) */}
                        <div className={`hidden md:block w-3 self-stretch border-2 border-black ${colorClass}`}></div>
                        
                        {/* Número e Tag */}
                        <div className="flex-shrink-0 w-full md:w-32">
                          <span className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase tracking-widest">Proposição</span>
                          <h3 className="text-2xl font-black mt-1">{numeroProp}</h3>
                        </div>

                        {/* Dados Centrais */}
                        <div className="flex-grow w-full md:w-auto border-l-0 md:border-l-[3px] md:border-black md:pl-4">
                          <p className="text-sm font-bold text-gray-800 line-clamp-2 md:line-clamp-1 mb-2" title={ementaProp}>
                            {ementaProp || <span className="text-gray-400 italic font-normal">Ementa não informada.</span>}
                          </p>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold text-gray-700 uppercase">
                            <span><strong className="text-black">Setor:</strong> {getSetor(item) || '-'}</span>
                            <span><strong className="text-black">Relator:</strong> {getRelator(item) || '-'}</span>
                            <span className="flex items-center gap-1">
                              <strong className="text-black">Movimento:</strong> 
                              <span className="truncate max-w-[200px] inline-block align-bottom">{ultimoMovimentoProp || '-'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex-shrink-0 flex gap-2 w-full md:w-auto justify-end mt-3 md:mt-0 pt-3 md:pt-0 border-t-[3px] border-dashed border-black md:border-none">
                          <button 
                            onClick={() => {
                              if (editingId === numeroProp) {
                                setEditingId(null);
                              } else {
                                setEditingId(numeroProp);
                                setEditValue(obsProp || '');
                              }
                            }}
                            className={`p-2 border-2 border-black transition-colors font-black text-xs uppercase flex items-center gap-2
                              ${(obsProp || editingId === numeroProp) ? 'bg-[#008080] text-white hover:bg-black' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            {obsProp ? 'Ver Notas' : 'Add Nota'}
                          </button>
                          
                          {linkProp && linkProp !== '-' && (
                            <a href={linkProp} target="_blank" rel="noreferrer" className="bg-white p-2 border-2 border-black hover:bg-[#ffdb58] transition-colors" title="Ver na ALESC">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-black"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Área Expansível para Observações (Lista) */}
                      {(editingId === numeroProp || (obsProp && editingId === numeroProp)) && (
                         <div className="border-t-[4px] border-black bg-gray-50 p-4 animate-in slide-in-from-top-2">
                           <div className="flex justify-between items-center mb-2">
                             <p className="text-xs font-black text-gray-800 uppercase">Anotações Internas</p>
                           </div>
                           
                           {editingId === numeroProp ? (
                              <div className="flex flex-col gap-2">
                                <textarea 
                                  className="w-full border-2 border-black p-2 text-sm font-bold resize-none outline-none focus:border-[#008080]" rows="2"
                                  value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Escreva uma anotação aqui..."
                                />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-200 transition-colors" disabled={isSaving}>Fechar / Cancelar</button>
                                  <button onClick={() => handleSaveObservacao(numeroProp)} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 flex items-center gap-2`} disabled={isSaving}>
                                    {isSaving ? 'A guardar...' : 'Guardar Alterações'}
                                  </button>
                                </div>
                              </div>
                           ) : (
                             <div className="flex flex-col gap-2">
                               <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap p-2 border-2 border-transparent bg-white shadow-sm">{obsProp}</p>
                               <div className="flex gap-2 justify-end">
                                 <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-200">Fechar</button>
                               </div>
                             </div>
                           )}
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        
        {/* FALLBACK QUANDO NÃO HÁ RESULTADOS */}
        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center p-12 border-[5px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-4">
            <h3 className="text-2xl font-black uppercase">Nenhuma proposição encontrada.</h3>
            <p className="font-bold text-gray-600 mt-2">Tente alterar os termos da sua pesquisa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
