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

  // Novos estados para a edição de observações
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // NOVA FUNÇÃO: Formata a data removendo a hora e invertendo para DD/MM/AAAA
  const formatarData = (dataString) => {
    if (!dataString || dataString === '-') return '-';
    const apenasData = dataString.split(/[T ]/)[0];
    if (apenasData.includes('-')) {
      return apenasData.split('-').reverse().join('/');
    }
    return apenasData;
  };

  // A MÁGICA ACONTECE AQUI:
  // O Vite no Vercel injeta a URL do Google Apps Script usando import.meta.env
  const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL) {
        throw new Error("A variável VITE_GOOGLE_SCRIPT_URL não foi encontrada no Vercel.");
      }

      // Busca diretamente o JSON da API do Google Apps Script
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
        // O text/plain evita bloqueios de CORS pelo servidor do Google Scripts
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ numero: numero, observacao: editValue })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        // Atualiza a interface local instantaneamente sem precisar recarregar
        setData(prevData => 
          prevData.map(item => 
            item['Número da Proposição'] === numero 
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
    const numero = (item['Número da Proposição'] || '').toLowerCase();
    const relator = (item['Relator(a) na Comissão'] || '').toLowerCase();
    const situacao = (item['Situação'] || '').toLowerCase();
    
    return numero.includes(term) || relator.includes(term) || situacao.includes(term);
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans p-4 md:p-8 selection:bg-[#ffdb58] selection:text-black">
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
        <div className="mb-8 relative flex border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-0.5 transition-all">
          <div className={`w-4 border-r-[4px] border-black ${MONDRIAN_COLORS[1]}`}></div>
          <div className="p-4 flex items-center justify-center border-r-[4px] border-black">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por número, relator ou situação..."
            className="w-full p-4 text-xl font-bold outline-none placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* MENSAGENS DE ESTADO */}
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

        {/* GRID DE CARDS */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredData.map((item, index) => {
              // Alterna as cores para manter a estética
              const colorClass = MONDRIAN_COLORS[index % MONDRIAN_COLORS.length];
              
              return (
                <div 
                  key={index} 
                  className="bg-white border-[5px] border-black flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
                >
                  {/* Cabeçalho do Card */}
                  <div className={`border-b-[5px] border-black p-4 flex justify-between items-start ${colorClass}`}>
                    <div>
                      <span className="bg-black text-white px-2 py-1 text-xs font-black tracking-widest uppercase">
                        Proposição
                      </span>
                      <h3 className="text-3xl font-black mt-2 text-white drop-shadow-md">
                        {item['Número da Proposição'] || 'S/N'}
                      </h3>
                    </div>
                    {item['Link'] && item['Link'] !== '-' && (
                      <a 
                        href={item['Link']} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-white p-2 border-2 border-black hover:bg-gray-200 transition-colors"
                        title="Ver na ALESC"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-black">
                          <path d="M15 3h6v6"/>
                          <path d="M10 14 21 3"/>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        </svg>
                      </a>
                    )}
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-5 flex-grow flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase">Situação</p>
                      <p className="text-lg font-black leading-tight border-l-[4px] border-black pl-3 mt-1">
                        {item['Situação'] || '-'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Setor Atual</p>
                        <p className="font-bold leading-snug">{item['Setor Atual'] || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Data Verificação</p>
                        <p className="font-bold">{formatarData(item['Data da Verificação'])}</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t-[3px] border-black border-dashed flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Relator(a)</p>
                        <p className="font-black text-[15px] uppercase">{item['Relator(a) na Comissão'] || '-'}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-bold text-gray-500 uppercase">Distribuição</p>
                         <p className="font-bold">{formatarData(item['Data de Distribuição'])}</p>
                      </div>
                    </div>

                    {/* NOVA SESSÃO: EDIÇÃO DE OBSERVAÇÕES */}
                    <div className="mt-4 pt-4 border-t-[3px] border-black bg-gray-50 -mx-5 px-5 pb-5 -mb-5 flex-grow-0">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg> Observações
                        </p>
                        {editingId !== item['Número da Proposição'] && (
                          <button 
                            onClick={() => {
                              setEditingId(item['Número da Proposição']);
                              setEditValue(item['Observações'] || '');
                            }}
                            className="text-xs font-bold uppercase underline hover:text-[#008080] transition-colors"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      
                      {editingId === item['Número da Proposição'] ? (
                        <div className="flex flex-col gap-2">
                          <textarea 
                            className="w-full border-2 border-black p-2 text-sm font-bold resize-none outline-none focus:border-[#008080]"
                            rows="3"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Escreva uma anotação aqui..."
                          />
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-200 transition-colors"
                              disabled={isSaving}
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handleSaveObservacao(item['Número da Proposição'])}
                              className={`px-3 py-1 border-2 border-black text-xs font-black uppercase text-white ${MONDRIAN_COLORS[1]} hover:opacity-90 flex items-center gap-2 transition-opacity`}
                              disabled={isSaving}
                            >
                              {isSaving ? 'A guardar...' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-gray-700 min-h-[2rem]">
                          {item['Observações'] || <span className="text-gray-400 italic font-normal">Nenhuma observação inserida.</span>}
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
            <h3 className="text-2xl font-black uppercase">Nenhuma proposição encontrada.</h3>
            <p className="font-bold text-gray-600 mt-2">Tente alterar os termos da sua pesquisa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
