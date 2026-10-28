import React, { useState, useEffect, useMemo } from 'react';

// Paleta Mondrian Suavizada (Carmesim, Azul Esverdeado e Amarelo Mostarda)
const COLORS = {
  crimson: '#c41e3a',
  teal: '#008080',
  mustard: '#ffdb58',
  ink: '#0f172a',
  bg: '#f5f4ef',
};

const PIE_COLORS = [
  '#008080', '#c41e3a', '#ffdb58', '#1e293b', '#0d9488',
  '#e11d48', '#eab308', '#475569', '#2563eb', '#7c3aed', '#ea580c'
];

const PROCESSO_PREFIXES = ['PL', 'PEC', 'PLC', 'PDL', 'PRC', 'MPV', 'VET', 'MSG', 'PSA'];

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [activeTab, setActiveTab] = useState('processo');

  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [onlyOpenVista, setOnlyOpenVista] = useState(false);
  const [onlyDiligencia, setOnlyDiligencia] = useState(false);
  const [onlyOpenDiligencia, setOnlyOpenDiligencia] = useState(false);
  const [toggleUtilidade, setToggleUtilidade] = useState(false);

  // Estado de Multiseleção Universal
  const [filters, setFilters] = useState({
    status: [],          // 'Em Tramitação', 'Aprovado', 'Virou Lei', 'Com Pedido de Vista', 'Com Diligência', etc.
    vistaDeputado: [],   // Parlamentar que pediu vista
    diligenciaOrigem: [],// Relator(a) ou Setor do Requerimento de Diligência
    tipo: [],            // PL, PLC, PEC, REQ, RQD, MOC, IND...
    situacao: [],        // Situação oficial da ALESC
    setor: [],           // Comissão ou Setor Atual
    relator: [],         // Relator(a) atual
    autoria: [],         // Autor ou subscritor
    ano: [],             // Ano da proposição
  });

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'movimento', direction: 'desc' });

  // Resolução automática da variável de ambiente (Vercel / Vite / CRA / Next)
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
    return 'COLE_SUA_URL_DO_SCRIPT_AQUI';
  })();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL || API_URL === 'COLE_SUA_URL_DO_SCRIPT_AQUI') {
        throw new Error('A URL do Google Script não foi configurada nas variáveis de ambiente.');
      }
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Falha ao acessar os dados da planilha via API.');
      const jsonData = await response.json();
      setData(Array.isArray(jsonData) ? jsonData : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(''), 4500);
  };

  // Helpers de formatação
  const formatarData = (dataString) => {
    if (!dataString || dataString === '-') return '-';
    const apenasData = String(dataString).split(/[T ]/)[0];
    if (apenasData.includes('-')) {
      return apenasData.split('-').reverse().join('/');
    }
    return apenasData;
  };

  const formatarUltimoMovimento = (texto) => {
    if (!texto || texto === '-') return '-';
    return String(texto).replace(/^\d{2}\/\d{2}\/\d{4}\s*-\s*/, '');
  };

  const extrairDataUltimoMovimento = (texto) => {
    if (!texto || texto === '-') return '';
    const match = String(texto).match(/^(\d{2}\/\d{2}\/\d{4})/);
    return match ? match[1] : '';
  };

  const parseDateToTimestamp = (dateStr) => {
    if (!dateStr || dateStr === '-') return 0;
    const match = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return new Date(`${match[3]}-${match[2]}-${match[1]}`).getTime();
    return 0;
  };

  // =====================================================================
  // 1. ENRIQUECIMENTO CENTRALIZADO DOS DADOS (SINGLE-PASS)
  // =====================================================================
  const enrichedData = useMemo(() => {
    return data
      .map((raw) => {
        const numero = String(raw['Número da Proposição'] || raw['Numero da Proposicao'] || raw['numero'] || '').trim();
        if (!numero) return null;

        const prefix = numero.toUpperCase().split('/')[0].replace('.', '').trim();
        const isProcesso = PROCESSO_PREFIXES.includes(prefix);

        const anoMatch = numero.match(/\/(\d{4})/);
        const ano = anoMatch ? anoMatch[1] : 'S/A';

        const tipoRaw = String(raw['Tipo de Proposição'] || raw['Tipo de Proposicao'] || '').trim();
        const tipo = tipoRaw && tipoRaw !== '-' ? tipoRaw : (prefix || (isProcesso ? 'PL' : 'ATIV'));

        const ementa = String(raw['Ementa'] || raw['ementa'] || raw['EMENTA'] || raw['Resumo'] || '').trim();
        const ultimoMovimento = String(raw['Último Movimento'] || raw['Ultimo Movimento'] || raw['Ultimo movimento'] || raw['ultimo movimento'] || '').trim();
        const relator = String(raw['Relator(a) na Comissão'] || raw['Relator'] || raw['relator'] || '').trim();
        const situacao = String(raw['Situação'] || raw['Situacao'] || raw['situacao'] || raw['Situação Atual'] || raw['Situação atual'] || '').trim();
        const setor = String(raw['Setor Atual'] || raw['Setor atual'] || raw['setor'] || '').trim();
        const observacoes = String(raw['Observações'] || raw['Observacoes'] || raw['observacoes'] || '').trim();
        const link = String(raw['Link'] || raw['link'] || '').trim();
        const autoriaRaw = String(raw['Autoria'] || raw['autoria'] || '').trim();
        const dataEntrada = String(raw['Data de entrada'] || raw['Data de Entrada'] || '').trim();
        const dataVerificacao = String(raw['Data da Verificação'] || '').trim();
        const dataDistribuicao = String(raw['Data de Distribuição'] || '').trim();
        const processosAnexos = String(raw['Processos anexos'] || raw['Processos Anexos'] || '').trim();

        let pedidoVista = String(raw['Pedido de Vista'] || raw['pedido de vista'] || raw['Pedido de vista'] || '').trim();
        if (pedidoVista === '-') pedidoVista = '';

        let infoRelatoria = String(raw['Informação da Relatoria'] || raw['Informacao da relatoria'] || raw['Informacao da Relatoria'] || raw['informacao_relatoria'] || '').trim();
        if (infoRelatoria === '-') infoRelatoria = '';

        let colDiligencia = String(raw['Requerimento de Diligência'] || raw['Requerimento de Diligencia'] || raw['Diligência'] || raw['Diligencia'] || '').trim();
        if (colDiligencia === '-') colDiligencia = '';

        const dataRedacaoFinal = String(raw['Data da Publicação da Redação Final'] || raw['Data Publicação Pré-Lei'] || '').trim();

        // Extrai lista de autores/subscritores
        const autoresList = autoriaRaw
          ? autoriaRaw.split(/;|,/).map((a) => a.trim()).filter(Boolean)
          : [];

        // Extrai parlamentares do Pedido de Vista e identifica se está em aberto
        const vistaDeputados = [];
        let temVistaEmAberto = false;
        if (pedidoVista) {
          const partesVista = pedidoVista.split(';').map((s) => s.trim()).filter(Boolean);
          partesVista.forEach((parte) => {
            const lowerParte = parte.toLowerCase();
            if (!lowerParte.includes('devolvido')) {
              temVistaEmAberto = true;
            }
            const nomeLimpo = parte
              .replace(/\(.*?\)/g, '')
              .replace(/^vista\s+de\s+/i, '')
              .replace(/^\d{2}\/\d{2}\/\d{4}\s*:\s*/i, '')
              .trim();
            if (nomeLimpo && !vistaDeputados.includes(nomeLimpo)) {
              vistaDeputados.push(nomeLimpo);
            }
          });
        }

        // Links adicionais (Lei / Veto / Deliberação)
        let parsedLinks = [];
        try {
          const rawLinks = raw['Links Adicionais'] || raw['links_adicionais'] || raw['Links adicionais'] || '';
          if (rawLinks && rawLinks !== '-') parsedLinks = JSON.parse(rawLinks);
        } catch (e) {}

        const sitLower = situacao.toLowerCase();
        const ultMovLower = ultimoMovimento.toLowerCase();
        const obsLower = observacoes.toLowerCase();
        const infoRelLower = infoRelatoria.toLowerCase();
        const ementaLower = ementa.toLowerCase();
        const tipoLower = tipo.toLowerCase();

        // Extração de Número da Lei
        let numeroLei = '';
        const leiObjComNum = parsedLinks.find((l) => l.numeroLei);
        if (leiObjComNum && leiObjComNum.numeroLei) {
          numeroLei = String(leiObjComNum.numeroLei).trim();
        } else {
          const leiLinkCandidate = parsedLinks.find((l) => /\blei\b/i.test(l.label || '') || (l.label || '').toLowerCase().includes('promulgad'));
          if (leiLinkCandidate && leiLinkCandidate.url) {
            const matchUrl = leiLinkCandidate.url.match(/\/(\d+)_/);
            if (matchUrl) numeroLei = matchUrl[1];
          }
        }
        if (!numeroLei) {
          const regexLei = /(?:Lei|Norma Jurídica)(?:\s*(?:Complementar|Ordinária))?(?:\s*(?:n[º°o.]|número)?\s*)(\d+[\.\d]*)/i;
          const mSit = situacao.match(regexLei) || ultimoMovimento.match(regexLei) || observacoes.match(regexLei);
          if (mSit && mSit[1]) numeroLei = mSit[1];
        }

        const vetoLink = parsedLinks.find((l) => (l.label || '').toLowerCase().includes('veto')) || null;
        const leiLink = parsedLinks.find((l) => /\blei\b/i.test(l.label || '') || (l.label || '').toLowerCase().includes('promulgad')) || null;

        let isVeto = false;
        let isVirouLei = false;
        let isAprovado = false;

        if (isProcesso) {
          const temPalavraVeto = sitLower.includes('veto') || ultMovLower.includes('veto') || obsLower.includes('veto');
          if (temPalavraVeto || vetoLink) isVeto = true;

          const temCertezaLei =
            Boolean(numeroLei) ||
            Boolean(leiLink && leiLink.url) ||
            sitLower.includes('transformado em lei') ||
            sitLower.includes('norma jurídica') ||
            sitLower.includes('lei sancionada') ||
            sitLower.includes('lei promulgada') ||
            ultMovLower.includes('transformado em lei') ||
            ultMovLower.includes('norma jurídica') ||
            ultMovLower.includes('sancionad') ||
            ultMovLower.includes('promulgad');

          const temAprovacaoPlenarioOuRedacao =
            temCertezaLei ||
            Boolean(leiLink) ||
            Boolean(dataRedacaoFinal && dataRedacaoFinal !== '-') ||
            sitLower.includes('redação final') ||
            sitLower.includes('autógrafo') ||
            sitLower.includes('aprovad') ||
            ultMovLower.includes('redação final') ||
            ultMovLower.includes('autógrafo') ||
            ultMovLower.includes('aprovado em') ||
            ultMovLower.includes('aprovado por');

          if (temCertezaLei && !isVeto) isVirouLei = true;
          if (temAprovacaoPlenarioOuRedacao && !isVeto && !sitLower.includes('rejeitad')) isAprovado = true;
        }

        const isEncerrado =
          !isVirouLei &&
          !isAprovado &&
          !isVeto &&
          (sitLower.includes('arquivad') ||
            sitLower.includes('rejeitad') ||
            sitLower.includes('retirad') ||
            sitLower.includes('prejudicad') ||
            sitLower.includes('encerrad'));

        // =================================================================
        // DETECÇÃO DE REQUERIMENTO DE DILIGÊNCIA E STATUS DA DILIGÊNCIA
        // =================================================================
        const regexDiligencia = /dilig[êe]ncia/i;
        const temDiligencia =
          Boolean(colDiligencia) ||
          prefix === 'RQD' ||
          regexDiligencia.test(situacao) ||
          regexDiligencia.test(ultimoMovimento) ||
          regexDiligencia.test(infoRelatoria) ||
          regexDiligencia.test(observacoes) ||
          regexDiligencia.test(tipoLower) ||
          (!isProcesso && regexDiligencia.test(ementaLower));

        let detalheDiligencia = '';
        if (temDiligencia) {
          if (colDiligencia) {
            detalheDiligencia = colDiligencia;
          } else if (regexDiligencia.test(infoRelatoria)) {
            detalheDiligencia = infoRelatoria;
          } else if (regexDiligencia.test(ultimoMovimento)) {
            detalheDiligencia = formatarUltimoMovimento(ultimoMovimento);
          } else if (regexDiligencia.test(situacao)) {
            detalheDiligencia = situacao;
          } else if (regexDiligencia.test(observacoes)) {
            detalheDiligencia = observacoes;
          } else {
            detalheDiligencia = 'Requerimento de Diligência registrado';
          }
        }

        const diligenciaConcluida =
          ultMovLower.includes('diligência cumprida') ||
          ultMovLower.includes('diligência respondida') ||
          ultMovLower.includes('diligência encerrada') ||
          ultMovLower.includes('resposta de diligência') ||
          infoRelLower.includes('diligência cumprida') ||
          infoRelLower.includes('diligência respondida');

        const temDiligenciaEmAberto =
          temDiligencia &&
          !isVirouLei &&
          !isVeto &&
          !isEncerrado &&
          (!diligenciaConcluida || sitLower.includes('diligência') || sitLower.includes('aguardando'));

        // Identifica o responsável/setor associado à diligência para os botões de filtro
        let diligenciaResponsavel = '';
        if (temDiligencia) {
          if (relator && relator !== '-') {
            diligenciaResponsavel = `Rel. ${relator}`;
          } else if (setor && setor !== '-') {
            diligenciaResponsavel = setor;
          } else {
            diligenciaResponsavel = 'Diligência Geral';
          }
        }

        // Classificação principal de fase para articuladores
        let fasePrincipal = 'Em Tramitação';
        if (isProcesso) {
          if (isVirouLei) fasePrincipal = 'Virou Lei';
          else if (isAprovado) fasePrincipal = 'Aprovado';
          else if (isVeto) fasePrincipal = 'Vetado';
          else if (isEncerrado) fasePrincipal = 'Encerrado';
          else fasePrincipal = 'Em Tramitação';
        } else {
          if (sitLower.includes('arquivad') || sitLower.includes('encerrad') || sitLower.includes('concluíd')) {
            fasePrincipal = 'Arquivado';
          } else if (sitLower.includes('encaminhado') || ultMovLower.includes('encaminhado') || sitLower.includes('expedido') || ultMovLower.includes('expedido') || sitLower.includes('aprovad')) {
            fasePrincipal = 'Encaminhado / Aprovado';
          } else if (sitLower.includes('aguardando') || ultMovLower.includes('aguardando') || sitLower.includes('diligência') || ultMovLower.includes('diligência')) {
            fasePrincipal = 'Aguardando Resposta';
          } else {
            fasePrincipal = 'Em Tramitação';
          }
        }

        const isTramitando = fasePrincipal === 'Em Tramitação' || fasePrincipal === 'Aguardando Resposta';

        // Tags de status que permitem filtro múltiplo cruzado
        const statusTags = [fasePrincipal];
        if (isAprovado && !statusTags.includes('Aprovado')) statusTags.push('Aprovado');
        if (pedidoVista) statusTags.push('Com Pedido de Vista');
        if (temDiligencia) statusTags.push('Com Diligência');

        const matchNum = numero.match(/(\d+)\/(\d+)/);
        const sortNumeroVal = matchNum ? parseInt(matchNum[2], 10) * 100000 + parseInt(matchNum[1], 10) : 0;

        return {
          raw,
          numero,
          prefix,
          ano,
          isProcesso,
          tipo,
          ementa,
          ultimoMovimento,
          dataUltMov: extrairDataUltimoMovimento(ultimoMovimento),
          textoUltMov: formatarUltimoMovimento(ultimoMovimento),
          relator: relator && relator !== '-' ? relator : '',
          situacao: situacao && situacao !== '-' ? situacao : 'Não informada',
          setor: setor && setor !== '-' ? setor : 'Não informado',
          observacoes,
          link,
          autoria: autoriaRaw,
          autoresList,
          dataEntrada,
          dataVerificacao,
          dataDistribuicao,
          processosAnexos,
          pedidoVista,
          vistaDeputados,
          temVistaEmAberto,
          temDiligencia,
          temDiligenciaEmAberto,
          detalheDiligencia,
          diligenciaResponsavel,
          infoRelatoria,
          dataRedacaoFinal,
          parsedLinks,
          numeroLei,
          vetoLink,
          leiLink,
          isVeto,
          isVirouLei,
          isAprovado,
          isEncerrado,
          isTramitando,
          fasePrincipal,
          statusTags,
          sortNumeroVal,
          sortMovimentoVal: parseDateToTimestamp(ultimoMovimento),
          sortPublicacaoVal: parseDateToTimestamp(dataRedacaoFinal),
        };
      })
      .filter(Boolean);
  }, [data]);

  // =====================================================================
  // 2. FILTRAGEM UNIVERSAL E ESTATÍSTICAS DO DASHBOARD
  // =====================================================================
  const { tabData, filteredData, stats, filterOptions, vistaBreakdown, diligenciaBreakdown, pieData } = useMemo(() => {
    const tabItems = enrichedData.filter((item) =>
      activeTab === 'processo' ? item.isProcesso : !item.isProcesso
    );

    const countMap = {
      status: {},
      tipo: {},
      situacao: {},
      setor: {},
      relator: {},
      vistaDeputado: {},
      diligenciaOrigem: {},
      autoria: {},
      ano: {},
    };

    const inc = (category, key) => {
      if (!key || key === '-') return;
      countMap[category][key] = (countMap[category][key] || 0) + 1;
    };

    tabItems.forEach((item) => {
      item.statusTags.forEach((st) => inc('status', st));
      inc('tipo', item.tipo);
      inc('situacao', item.situacao);
      inc('setor', item.setor);
      if (item.relator) inc('relator', item.relator);
      item.vistaDeputados.forEach((dep) => inc('vistaDeputado', dep));
      if (item.temDiligencia && item.diligenciaResponsavel) {
        inc('diligenciaOrigem', item.diligenciaResponsavel);
      }
      item.autoresList.forEach((aut) => inc('autoria', aut));
      inc('ano', item.ano);
    });

    // Aplicação dos filtros selecionados
    const filtered = tabItems.filter((item) => {
      if (toggleUtilidade && !item.ementa.toLowerCase().includes('utilidade pública')) return false;
      if (onlyOpenVista && (!item.pedidoVista || !item.temVistaEmAberto)) return false;
      if (onlyDiligencia && !item.temDiligencia) return false;
      if (onlyOpenDiligencia && !item.temDiligenciaEmAberto) return false;

      if (filters.status.length > 0) {
        const matchStatus = filters.status.some((st) => item.statusTags.includes(st));
        if (!matchStatus) return false;
      }

      if (filters.tipo.length > 0 && !filters.tipo.includes(item.tipo)) return false;
      if (filters.situacao.length > 0 && !filters.situacao.includes(item.situacao)) return false;
      if (filters.setor.length > 0 && !filters.setor.includes(item.setor)) return false;
      if (filters.relator.length > 0 && !filters.relator.includes(item.relator)) return false;
      if (filters.ano.length > 0 && !filters.ano.includes(item.ano)) return false;

      if (filters.vistaDeputado.length > 0) {
        const matchVista = filters.vistaDeputado.some((dep) => item.vistaDeputados.includes(dep));
        if (!matchVista) return false;
      }

      if (filters.diligenciaOrigem.length > 0) {
        if (!item.temDiligencia || !filters.diligenciaOrigem.includes(item.diligenciaResponsavel)) {
          return false;
        }
      }

      if (filters.autoria.length > 0) {
        const matchAutor = filters.autoria.some((aut) => item.autoresList.includes(aut));
        if (!matchAutor) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const searchable = [
          item.numero,
          item.ementa,
          item.situacao,
          item.setor,
          item.relator,
          item.pedidoVista,
          item.detalheDiligencia,
          item.autoria,
          item.ultimoMovimento,
          item.observacoes,
          item.numeroLei ? `lei ${item.numeroLei}` : '',
          item.fasePrincipal,
          item.tipo,
        ]
          .join(' ')
          .toLowerCase();

        if (!searchable.includes(term)) return false;
      }

      return true;
    });

    // Estatísticas calculadas sobre o conjunto filtrado
    const dashboard = {
      total: filtered.length,
      tramitando: 0,
      aprovadosTotal: 0,
      virouLei: 0,
      apenasAprovadoPlenario: 0,
      comVista: 0,
      comVistaAberta: 0,
      comDiligencia: 0,
      comDiligenciaAberta: 0,
      vetados: 0,
      encerrados: 0,
      aguardando: 0,
      encaminhados: 0,
      arquivados: 0,
      tipos: {},
    };

    const vistaCounter = {};
    const diligenciaCounter = {};

    filtered.forEach((item) => {
      if (item.fasePrincipal === 'Em Tramitação') dashboard.tramitando++;
      if (item.isAprovado) dashboard.aprovadosTotal++;
      if (item.isVirouLei) dashboard.virouLei++;
      if (item.isAprovado && !item.isVirouLei) dashboard.apenasAprovadoPlenario++;

      if (item.pedidoVista) {
        dashboard.comVista++;
        if (item.temVistaEmAberto) dashboard.comVistaAberta++;
        item.vistaDeputados.forEach((dep) => {
          vistaCounter[dep] = (vistaCounter[dep] || 0) + 1;
        });
      }

      if (item.temDiligencia) {
        dashboard.comDiligencia++;
        if (item.temDiligenciaEmAberto) dashboard.comDiligenciaAberta++;
        if (item.diligenciaResponsavel) {
          diligenciaCounter[item.diligenciaResponsavel] = (diligenciaCounter[item.diligenciaResponsavel] || 0) + 1;
        }
      }

      if (item.isVeto) dashboard.vetados++;
      if (item.isEncerrado) dashboard.encerrados++;

      if (!item.isProcesso) {
        if (item.fasePrincipal === 'Aguardando Resposta') dashboard.aguardando++;
        if (item.fasePrincipal === 'Encaminhado / Aprovado') dashboard.encaminhados++;
        if (item.fasePrincipal === 'Arquivado') dashboard.arquivados++;
      }

      dashboard.tipos[item.tipo] = (dashboard.tipos[item.tipo] || 0) + 1;
    });

    const generatedPie = Object.entries(dashboard.tipos)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }));

    const formatOpts = (obj) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, count]) => ({ label, count }));

    return {
      tabData: tabItems,
      filteredData: filtered,
      stats: dashboard,
      pieData: generatedPie,
      vistaBreakdown: Object.entries(vistaCounter).sort((a, b) => b[1] - a[1]),
      diligenciaBreakdown: Object.entries(diligenciaCounter).sort((a, b) => b[1] - a[1]),
      filterOptions: {
        status: formatOpts(countMap.status),
        vistaDeputado: formatOpts(countMap.vistaDeputado),
        diligenciaOrigem: formatOpts(countMap.diligenciaOrigem),
        tipo: formatOpts(countMap.tipo),
        situacao: formatOpts(countMap.situacao),
        setor: formatOpts(countMap.setor),
        relator: formatOpts(countMap.relator),
        autoria: formatOpts(countMap.autoria),
        ano: Object.entries(countMap.ano)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([label, count]) => ({ label, count })),
      },
    };
  }, [enrichedData, activeTab, filters, searchTerm, toggleUtilidade, onlyOpenVista, onlyDiligencia, onlyOpenDiligencia]);

  // Ordenação
  const sortedFilteredData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;

    return [...filteredData].sort((a, b) => {
      if (sortConfig.key === 'numero') {
        return (a.sortNumeroVal - b.sortNumeroVal) * dir;
      }
      if (sortConfig.key === 'movimento') {
        return (a.sortMovimentoVal - b.sortMovimentoVal) * dir;
      }
      if (sortConfig.key === 'publicacao') {
        return (a.sortPublicacaoVal - b.sortPublicacaoVal) * dir;
      }
      if (sortConfig.key === 'ementa') {
        return a.ementa.localeCompare(b.ementa) * dir;
      }
      if (sortConfig.key === 'situacao') {
        return a.situacao.localeCompare(b.situacao) * dir;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Controle de Multiseleção Universal
  const toggleFilterValue = (category, value) => {
    setFilters((prev) => {
      const list = prev[category] || [];
      const exists = list.includes(value);
      return {
        ...prev,
        [category]: exists ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  };

  const clearCategory = (category) => {
    setFilters((prev) => ({ ...prev, [category]: [] }));
  };

  const limparTodosFiltros = () => {
    setFilters({
      status: [],
      vistaDeputado: [],
      diligenciaOrigem: [],
      tipo: [],
      situacao: [],
      setor: [],
      relator: [],
      autoria: [],
      ano: [],
    });
    setOnlyOpenVista(false);
    setOnlyDiligencia(false);
    setOnlyOpenDiligencia(false);
    setToggleUtilidade(false);
    setSearchTerm('');
  };

  const totalActiveFilters = useMemo(() => {
    return (
      Object.values(filters).reduce((acc, arr) => acc + arr.length, 0) +
      (onlyOpenVista ? 1 : 0) +
      (onlyDiligencia ? 1 : 0) +
      (onlyOpenDiligencia ? 1 : 0) +
      (toggleUtilidade ? 1 : 0)
    );
  }, [filters, onlyOpenVista, onlyDiligencia, onlyOpenDiligencia, toggleUtilidade]);

  // Gravação de Observações no Google Apps Script
  const handleSaveObservacao = async (numero) => {
    setIsSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ numero, observacao: editValue }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setData((prevData) =>
          prevData.map((row) => {
            const numRow = row['Número da Proposição'] || row['Numero da Proposicao'] || row['numero'] || '';
            return numRow === numero ? { ...row, Observações: editValue } : row;
          })
        );
        if (selectedItem && selectedItem.numero === numero) {
          setSelectedItem((prev) => ({ ...prev, observacoes: editValue }));
        }
        setEditingId(null);
        showToast('Observação salva na planilha!');
      } else {
        showToast('Erro ao salvar: ' + (result.message || 'Tente novamente'));
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de comunicação ao salvar a observação.');
    } finally {
      setIsSaving(false);
    }
  };

  // Exportação CSV enriquecida
  const exportToCSV = () => {
    if (sortedFilteredData.length === 0) {
      showToast('Nenhum dado filtrado para exportar.');
      return;
    }

    const headers = [
      'NÚMERO DA PROPOSIÇÃO',
      'TIPO',
      'FASE / STATUS',
      'SITUAÇÃO OFICIAL',
      'SETOR ATUAL',
      'RELATOR(A)',
      'PEDIDO DE VISTA (COM QUEM)',
      'REQUERIMENTO DE DILIGÊNCIA',
      'AUTORIA / SUBSCRIÇÃO',
      'EMENTA',
      'NÚMERO DA LEI APROVADA',
      'DATA REDAÇÃO FINAL / LEI',
      'LINK DA LEI',
      'LINK ALESC',
      'OBSERVAÇÕES INTERNAS',
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    const rows = sortedFilteredData.map((item) => [
      escapeCSV(item.numero),
      escapeCSV(item.tipo),
      escapeCSV(item.fasePrincipal),
      escapeCSV(item.situacao),
      escapeCSV(item.setor),
      escapeCSV(item.relator),
      escapeCSV(item.pedidoVista),
      escapeCSV(item.detalheDiligencia),
      escapeCSV(item.autoria),
      escapeCSV(item.ementa),
      escapeCSV(item.numeroLei),
      escapeCSV(item.dataRedacaoFinal),
      escapeCSV(item.leiLink?.url || ''),
      escapeCSV(item.link),
      escapeCSV(item.observacoes),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabulum_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Estilo visual de cada card conforme o status Mondrian Suavizado
  const getStatusTheme = (item) => {
    if (item.isVeto) {
      return {
        accentBar: 'bg-[#c41e3a]',
        badgeBg: 'bg-[#c41e3a] text-white',
        boxBg: 'bg-[#c41e3a]/10 border-[#c41e3a] text-[#8b1328]',
        label: 'PROJETO VETADO',
      };
    }
    if (item.pedidoVista) {
      return {
        accentBar: 'bg-[#c41e3a]',
        badgeBg: 'bg-[#c41e3a] text-white',
        boxBg: 'bg-[#c41e3a]/10 border-[#c41e3a] text-[#8b1328]',
        label: item.temVistaEmAberto ? 'PEDIDO DE VISTA EM ABERTO' : 'HISTÓRICO DE VISTA',
      };
    }
    if (item.temDiligenciaEmAberto) {
      return {
        accentBar: 'bg-[#ffdb58]',
        badgeBg: 'bg-[#ffdb58] text-slate-900',
        boxBg: 'bg-[#ffdb58]/35 border-[#b48a00] text-slate-900',
        label: 'EM DILIGÊNCIA',
      };
    }
    if (item.isVirouLei) {
      return {
        accentBar: 'bg-[#008080]',
        badgeBg: 'bg-[#008080] text-white',
        boxBg: 'bg-[#008080]/10 border-[#008080] text-[#004d4d]',
        label: item.numeroLei ? `VIROU LEI Nº ${item.numeroLei}` : 'TRANSFORMADO EM LEI',
      };
    }
    if (item.isAprovado || item.fasePrincipal === 'Encaminhado / Aprovado') {
      return {
        accentBar: 'bg-[#008080]',
        badgeBg: 'bg-[#008080]/90 text-white',
        boxBg: 'bg-[#008080]/10 border-[#008080] text-[#004d4d]',
        label: 'APROVADO',
      };
    }
    if (item.isEncerrado || item.fasePrincipal === 'Arquivado') {
      return {
        accentBar: 'bg-slate-400',
        badgeBg: 'bg-slate-200 text-slate-700',
        boxBg: 'bg-slate-100 border-slate-300 text-slate-700',
        label: item.fasePrincipal.toUpperCase(),
      };
    }
    return {
      accentBar: 'bg-[#ffdb58]',
      badgeBg: 'bg-[#ffdb58] text-slate-900',
      boxBg: 'bg-[#ffdb58]/25 border-[#d4af37] text-slate-900',
      label: item.fasePrincipal.toUpperCase(),
    };
  };

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-slate-900 font-sans p-3 sm:p-6 md:p-8 selection:bg-[#ffdb58] selection:text-slate-900">
      {/* ===============================================================
          CABEÇALHO MONDRIAN EDITORIAL SUAVIZADO
         =============================================================== */}
      <header className="max-w-7xl mx-auto mb-6">
        <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Barra superior Mondrian tricolor */}
          <div className="lg:col-span-12 h-2.5 flex border-b-2 border-slate-900">
            <div className="w-1/2 bg-[#c41e3a] border-r-2 border-slate-900"></div>
            <div className="w-1/3 bg-[#008080] border-r-2 border-slate-900"></div>
            <div className="w-1/6 bg-[#ffdb58]"></div>
          </div>

          {/* Identidade Visual */}
          <div className="lg:col-span-8 p-5 md:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 lg:border-b-0 lg:border-r-2 border-slate-900">
            <div
              onClick={limparTodosFiltros}
              className="flex items-center gap-4 md:gap-6 cursor-pointer group"
              title="Voltar ao estado inicial"
            >
              <img
                src="https://raw.githubusercontent.com/killuixo/tabulum-sig-monilegis/refs/heads/main/icon-192.png"
                alt="Ícone Tabulum"
                className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-xl border-2 border-slate-900 bg-[#f5f4ef] p-1.5 shadow-[2px_2px_0px_0px_#0f172a] group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-[#ffdb58] border border-slate-900 rounded">
                    ALESC • e-Legis
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {enrichedData.length} registros sincronizados
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-none mt-1">
                  TABULUM
                </h1>
                <p className="text-xs md:text-sm font-bold uppercase tracking-[0.22em] text-slate-600 mt-1">
                  Monitor Legislativo & Articuladores
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => setToggleUtilidade(!toggleUtilidade)}
                className={`px-3 py-2 rounded-lg border-2 border-slate-900 text-xs font-extrabold uppercase tracking-wider shadow-[2px_2px_0px_0px_#0f172a] transition-all ${
                  toggleUtilidade ? 'bg-[#ffdb58] text-slate-900' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {toggleUtilidade ? '✓ Utilidade Pública' : 'Utilidade Pública'}
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-3.5 py-2 rounded-lg border-2 border-slate-900 bg-white hover:bg-[#ffdb58]/40 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0.5 transition-all"
                title="Recarregar dados da planilha"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                Atualizar
              </button>
            </div>
          </div>

          {/* Seletor de Abas: Processo Legislativo vs Atividade Parlamentar */}
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1">
            <button
              onClick={() => {
                setActiveTab('processo');
                limparTodosFiltros();
              }}
              className={`p-4 md:p-5 font-black uppercase text-xs sm:text-sm tracking-wider border-r-2 lg:border-r-0 lg:border-b-2 border-slate-900 flex items-center justify-between transition-colors ${
                activeTab === 'processo'
                  ? 'bg-[#c41e3a] text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Processo Legislativo
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                activeTab === 'processo' ? 'bg-white text-[#c41e3a] border-white' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {enrichedData.filter((i) => i.isProcesso).length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('atividade');
                limparTodosFiltros();
              }}
              className={`p-4 md:p-5 font-black uppercase text-xs sm:text-sm tracking-wider flex items-center justify-between transition-colors ${
                activeTab === 'atividade'
                  ? 'bg-[#008080] text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Atividade Parlamentar
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                activeTab === 'atividade' ? 'bg-white text-[#008080] border-white' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {enrichedData.filter((i) => !i.isProcesso).length}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-5">
        {/* ===============================================================
            PAINEL DE RESPOSTAS RÁPIDAS (KPIs CLICÁVEIS MULTI-SELEÇÃO)
           =============================================================== */}
        {activeTab === 'processo' ? (
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Card 1: Total / Todos */}
            <div
              onClick={limparTodosFiltros}
              className={`p-3.5 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] hover:-translate-y-0.5 ${
                totalActiveFilters === 0 ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Exibindo</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffdb58]"></span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{stats.total}</p>
              <p className="text-[10px] font-bold opacity-75 mt-0.5">de {tabData.length} processos</p>
            </div>

            {/* Card 2: Em Tramitação */}
            <div
              onClick={() => toggleFilterValue('status', 'Em Tramitação')}
              className={`p-3.5 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] hover:-translate-y-0.5 ${
                filters.status.includes('Em Tramitação')
                  ? 'bg-[#ffdb58] text-slate-900 ring-2 ring-slate-900 ring-offset-2'
                  : 'bg-white hover:bg-[#ffdb58]/25'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Tramitando</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ffdb58] border border-slate-900"></span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1 text-slate-900">{stats.tramitando}</p>
              <p className="text-[10px] font-bold text-slate-600 mt-0.5">Nas comissões</p>
            </div>

            {/* Card 3: Com Pedido de Vista */}
            <div
              onClick={() => toggleFilterValue('status', 'Com Pedido de Vista')}
              className={`p-3.5 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] hover:-translate-y-0.5 ${
                filters.status.includes('Com Pedido de Vista')
                  ? 'bg-[#c41e3a] text-white ring-2 ring-slate-900 ring-offset-2'
                  : 'bg-white hover:bg-[#c41e3a]/10'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${filters.status.includes('Com Pedido de Vista') ? 'text-white' : 'text-[#c41e3a]'}`}>
                  Pedidos de Vista
                </span>
                <span className="w-2.5 h-2.5 rounded-sm bg-[#c41e3a] border border-slate-900"></span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{stats.comVista}</p>
              <p className={`text-[10px] font-bold mt-0.5 ${filters.status.includes('Com Pedido de Vista') ? 'text-white/90' : 'text-slate-600'}`}>
                {stats.comVistaAberta} em aberto
              </p>
            </div>

            {/* Card 4: Requerimentos de Diligência (NOVO) */}
            <div
              onClick={() => {
                setOnlyDiligencia(!onlyDiligencia);
                if (onlyOpenDiligencia) setOnlyOpenDiligencia(false);
              }}
              className={`p-3.5 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] hover:-translate-y-0.5 ${
                onlyDiligencia || onlyOpenDiligencia || filters.status.includes('Com Diligência')
                  ? 'bg-[#ffdb58] text-slate-900 ring-2 ring-slate-900 ring-offset-2'
                  : 'bg-white hover:bg-[#ffdb58]/30'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900">
                  Diligências
                </span>
                <span className="px-1 py-0.2 text-[8px] font-black uppercase bg-slate-900 text-[#ffdb58] rounded">
                  REQ
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1 text-slate-900">{stats.comDiligencia}</p>
              <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                {stats.comDiligenciaAberta} em aberto
              </p>
            </div>

            {/* Card 5: Aprovados (Geral / Redação Final) */}
            <div
              onClick={() => toggleFilterValue('status', 'Aprovado')}
              className={`p-3.5 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] hover:-translate-y-0.5 ${
                filters.status.includes('Aprovado')
                  ? 'bg-[#008080] text-white ring-2 ring-slate-900 ring-offset-2'
                  : 'bg-white hover:bg-[#008080]/10'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${filters.status.includes('Aprovado') ? 'text-white' : 'text-[#008080]'}`}>
                  Aprovados
                </span>
                <span className="w-2.5 h-2.5 rounded-sm bg-[#008080] border border-slate-900"></span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{stats.aprovadosTotal}</p>
              <p className={`text-[10px] font-bold mt-0.5 ${filters.status.includes('Aprovado') ? 'text-white/90' : 'text-slate-600'}`}>
                Plenário + Leis
              </p>
            </div>

            {/* Card 6: Viraram Lei */}
            <div
              onClick={() => toggleFilterValue('status', 'Virou Lei')}
              className={`p-3.5 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] hover:-translate-y-0.5 ${
                filters.status.includes('Virou Lei')
                  ? 'bg-[#008080] text-[#ffdb58] ring-2 ring-slate-900 ring-offset-2'
                  : 'bg-white hover:bg-[#008080]/15'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${filters.status.includes('Virou Lei') ? 'text-[#ffdb58]' : 'text-[#008080]'}`}>
                  Viraram Lei
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase bg-[#ffdb58] text-slate-900 border border-slate-900 rounded">
                  LEI
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{stats.virouLei}</p>
              <p className={`text-[10px] font-bold mt-0.5 ${filters.status.includes('Virou Lei') ? 'text-white' : 'text-slate-600'}`}>
                Sancionadas
              </p>
            </div>

            {/* Card 7: Vetados / Encerrados */}
            <div
              onClick={() => toggleFilterValue('status', 'Vetado')}
              className={`p-3.5 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] hover:-translate-y-0.5 ${
                filters.status.includes('Vetado')
                  ? 'bg-[#c41e3a] text-white ring-2 ring-slate-900 ring-offset-2'
                  : 'bg-white hover:bg-slate-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Vetados</span>
                <span className="text-[9px] font-bold opacity-75">Arq: {stats.encerrados}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{stats.vetados}</p>
              <p
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFilterValue('status', 'Encerrado');
                }}
                className="text-[10px] font-extrabold underline mt-0.5 hover:text-[#c41e3a]"
              >
                Encerrados ({stats.encerrados})
              </p>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div
              onClick={limparTodosFiltros}
              className={`p-4 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] ${
                totalActiveFilters === 0 ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
              }`}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">Total Atividades</span>
              <p className="text-3xl font-black mt-1">{stats.total}</p>
            </div>
            <div
              onClick={() => setOnlyDiligencia(!onlyDiligencia)}
              className={`p-4 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] ${
                onlyDiligencia ? 'bg-[#ffdb58] text-slate-900' : 'bg-white hover:bg-[#ffdb58]/25'
              }`}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Com Diligência</span>
              <p className="text-3xl font-black mt-1">{stats.comDiligencia}</p>
            </div>
            <div
              onClick={() => toggleFilterValue('status', 'Aguardando Resposta')}
              className={`p-4 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] ${
                filters.status.includes('Aguardando Resposta') ? 'bg-[#ffdb58] text-slate-900' : 'bg-white hover:bg-[#ffdb58]/20'
              }`}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Aguardando Resposta</span>
              <p className="text-3xl font-black mt-1">{stats.aguardando}</p>
            </div>
            <div
              onClick={() => toggleFilterValue('status', 'Encaminhado / Aprovado')}
              className={`p-4 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] ${
                filters.status.includes('Encaminhado / Aprovado') ? 'bg-[#008080] text-white' : 'bg-white hover:bg-[#008080]/15'
              }`}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Encaminhados</span>
              <p className="text-3xl font-black mt-1">{stats.encaminhados}</p>
            </div>
            <div
              onClick={() => toggleFilterValue('status', 'Arquivado')}
              className={`p-4 rounded-xl border-2 border-slate-900 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#0f172a] ${
                filters.status.includes('Arquivado') ? 'bg-slate-700 text-white' : 'bg-white hover:bg-slate-100'
              }`}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Arquivados</span>
              <p className="text-3xl font-black mt-1">{stats.arquivados}</p>
            </div>
          </section>
        )}

        {/* ===============================================================
            CAIXAS LADO A LADO:
            1. PEDIDOS DE VISTA ("COM QUEM ESTÁ?")
            2. REQUERIMENTOS DE DILIGÊNCIA (NOVO!)
            3. TIPOS DE PROPOSIÇÃO
           =============================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* CAIXA 1: Pedidos de Vista — Com quem está? */}
          <div className="lg:col-span-4 bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[3px_3px_0px_0px_#0f172a] flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#c41e3a] border border-slate-900"></span>
                  <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-900">
                    Pedidos de Vista
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleFilterValue('status', 'Com Pedido de Vista')}
                    className={`px-2 py-1 rounded-md border text-[10px] font-extrabold uppercase transition-colors ${
                      filters.status.includes('Com Pedido de Vista')
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({stats.comVista})
                  </button>
                  <button
                    onClick={() => setOnlyOpenVista(!onlyOpenVista)}
                    className={`px-2 py-1 rounded-md border text-[10px] font-extrabold uppercase transition-colors ${
                      onlyOpenVista
                        ? 'bg-[#c41e3a] text-white border-slate-900'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {onlyOpenVista ? '✓ Em Aberto' : `Em Aberto (${stats.comVistaAberta})`}
                  </button>
                </div>
              </div>

              {vistaBreakdown.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {vistaBreakdown.map(([deputado, qtd]) => {
                    const active = filters.vistaDeputado.includes(deputado);
                    return (
                      <button
                        key={deputado}
                        onClick={() => toggleFilterValue('vistaDeputado', deputado)}
                        className={`px-2.5 py-1 rounded-lg border-2 text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                          active
                            ? 'bg-[#c41e3a] text-white border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                            : 'bg-[#f5f4ef] text-slate-800 border-slate-300 hover:border-slate-900'
                        }`}
                      >
                        <span className="truncate max-w-[150px]">{deputado}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                          active ? 'bg-white text-[#c41e3a]' : 'bg-[#c41e3a]/15 text-[#c41e3a]'
                        }`}>
                          {qtd}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-400 italic py-2">
                  Nenhum pedido de vista nas proposições filtradas.
                </p>
              )}
            </div>
          </div>

          {/* CAIXA 2: Requerimentos de Diligência (AO LADO DE PEDIDOS DE VISTA) */}
          <div className="lg:col-span-4 bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[3px_3px_0px_0px_#0f172a] flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#ffdb58] border border-slate-900"></span>
                  <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-900">
                    Requerimentos de Diligência
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setOnlyDiligencia(!onlyDiligencia);
                      if (!onlyDiligencia) setOnlyOpenDiligencia(false);
                    }}
                    className={`px-2 py-1 rounded-md border text-[10px] font-extrabold uppercase transition-colors ${
                      onlyDiligencia
                        ? 'bg-[#ffdb58] text-slate-900 border-slate-900'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {onlyDiligencia ? '✓ Todas com Diligência' : `Todas (${stats.comDiligencia})`}
                  </button>
                  <button
                    onClick={() => {
                      setOnlyOpenDiligencia(!onlyOpenDiligencia);
                      if (!onlyOpenDiligencia) setOnlyDiligencia(false);
                    }}
                    className={`px-2 py-1 rounded-md border text-[10px] font-extrabold uppercase transition-colors ${
                      onlyOpenDiligencia
                        ? 'bg-slate-900 text-[#ffdb58] border-slate-900'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {onlyOpenDiligencia ? '✓ Em Aberto' : `Em Aberto (${stats.comDiligenciaAberta})`}
                  </button>
                </div>
              </div>

              {diligenciaBreakdown.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {diligenciaBreakdown.map(([origem, qtd]) => {
                    const active = filters.diligenciaOrigem.includes(origem);
                    return (
                      <button
                        key={origem}
                        onClick={() => toggleFilterValue('diligenciaOrigem', origem)}
                        className={`px-2.5 py-1 rounded-lg border-2 text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                          active
                            ? 'bg-[#ffdb58] text-slate-900 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                            : 'bg-[#f5f4ef] text-slate-800 border-slate-300 hover:border-slate-900'
                        }`}
                      >
                        <span className="truncate max-w-[165px]" title={origem}>{origem}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                          active ? 'bg-slate-900 text-[#ffdb58]' : 'bg-[#ffdb58]/60 text-slate-900'
                        }`}>
                          {qtd}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-400 italic py-2">
                  Nenhum requerimento de diligência nas proposições filtradas.
                </p>
              )}
            </div>
          </div>

          {/* CAIXA 3: Distribuição por Tipo de Proposição + Gráfico Mondrian */}
          <div className="lg:col-span-4 bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-900 mb-2.5 flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#008080] border border-slate-900"></span>
                Tipos de Proposição
              </h3>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {pieData.map((slice) => {
                  const selected = filters.tipo.includes(slice.name);
                  return (
                    <button
                      key={slice.name}
                      onClick={() => toggleFilterValue('tipo', slice.name)}
                      className={`px-2 py-1 rounded-md border text-[11px] font-extrabold uppercase flex items-center gap-1.5 transition-all ${
                        selected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-900'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-sm border border-slate-900" style={{ backgroundColor: slice.color }}></span>
                      <span>{slice.name}:</span>
                      <strong>{slice.value}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            {pieData.length > 0 && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] overflow-hidden bg-white">
                <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                  {(() => {
                    let cumulative = 0;
                    const total = pieData.reduce((acc, c) => acc + c.value, 0) || 1;
                    return pieData.map((slice) => {
                      if (slice.value === 0) return null;
                      const pct = slice.value / total;
                      const startAngle = cumulative * 360;
                      const endAngle = (cumulative + pct) * 360;
                      cumulative += pct;

                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      const cx = 16, cy = 16, r = 16;
                      const x1 = cx + r * Math.cos(startRad);
                      const y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad);
                      const y2 = cy + r * Math.sin(endRad);
                      const largeArc = pct > 0.5 ? 1 : 0;

                      const d =
                        pct >= 0.999
                          ? `M ${cx} 0 A ${r} ${r} 0 1 1 ${cx} 32 A ${r} ${r} 0 1 1 ${cx} 0 Z`
                          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                      return (
                        <path
                          key={slice.name}
                          d={d}
                          fill={slice.color}
                          onClick={() => toggleFilterValue('tipo', slice.name)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <title>{`${slice.name}: ${slice.value}`}</title>
                        </path>
                      );
                    });
                  })()}
                </svg>
              </div>
            )}
          </div>
        </section>

        {/* ===============================================================
            BARRA DE BUSCA UNIVERSAL + BOTÃO DE FILTROS MULTISELEÇÃO + EXPORTAR
           =============================================================== */}
        <section className="flex flex-col md:flex-row gap-3">
          {/* Busca Universal */}
          <div className="flex-1 flex items-center bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#0f172a] overflow-hidden focus-within:ring-2 focus-within:ring-[#008080]">
            <div className={`w-3 self-stretch border-r-2 border-slate-900 ${activeTab === 'processo' ? 'bg-[#c41e3a]' : 'bg-[#008080]'}`}></div>
            <div className="px-3.5 text-slate-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Busca universal: nº da proposição, ementa, relator, quem pediu vista, diligência, nº da lei..."
              className="w-full py-3.5 pr-4 text-sm sm:text-base font-bold text-slate-900 placeholder-slate-400 outline-none bg-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-3 text-xs font-black uppercase text-slate-400 hover:text-[#c41e3a]"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border-2 border-slate-900 font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-[3px_3px_0px_0px_#0f172a] transition-all ${
                showFilters || totalActiveFilters > 0
                  ? 'bg-[#ffdb58] text-slate-900'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filtros Universais</span>
              {totalActiveFilters > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px]">
                  {totalActiveFilters}
                </span>
              )}
            </button>

            <button
              onClick={exportToCSV}
              className="px-4 py-3 rounded-xl border-2 border-slate-900 bg-white hover:bg-[#008080] hover:text-white font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-[3px_3px_0px_0px_#0f172a] transition-colors"
              title="Exportar seleção atual para planilha CSV"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <div className="flex rounded-xl border-2 border-slate-900 bg-white shadow-[3px_3px_0px_0px_#0f172a] overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3.5 py-3 font-black uppercase text-xs flex items-center gap-1.5 transition-colors ${
                  viewMode === 'card' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                </svg>
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3.5 py-3 font-black uppercase text-xs flex items-center gap-1.5 border-l-2 border-slate-900 transition-colors ${
                  viewMode === 'list' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
                Lista
              </button>
            </div>
          </div>
        </section>

        {/* ===============================================================
            CHIPS (PÍLULAS) DE FILTROS ATIVOS
           =============================================================== */}
        {totalActiveFilters > 0 && (
          <section className="flex flex-wrap items-center gap-2 bg-white/80 border border-slate-300 rounded-xl px-4 py-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">
              Filtros Ativos:
            </span>

            {onlyOpenVista && (
              <span className="px-2.5 py-1 rounded-full bg-[#c41e3a] text-white text-xs font-bold flex items-center gap-1.5">
                Vista em Aberto
                <button onClick={() => setOnlyOpenVista(false)} className="hover:opacity-75">✕</button>
              </span>
            )}

            {onlyDiligencia && (
              <span className="px-2.5 py-1 rounded-full bg-[#ffdb58] text-slate-900 border border-slate-900 text-xs font-bold flex items-center gap-1.5">
                Com Requerimento de Diligência
                <button onClick={() => setOnlyDiligencia(false)} className="hover:opacity-75">✕</button>
              </span>
            )}

            {onlyOpenDiligencia && (
              <span className="px-2.5 py-1 rounded-full bg-slate-900 text-[#ffdb58] text-xs font-bold flex items-center gap-1.5">
                Diligência em Aberto
                <button onClick={() => setOnlyOpenDiligencia(false)} className="hover:opacity-75">✕</button>
              </span>
            )}

            {toggleUtilidade && (
              <span className="px-2.5 py-1 rounded-full bg-[#ffdb58] text-slate-900 border border-slate-900 text-xs font-bold flex items-center gap-1.5">
                Utilidade Pública
                <button onClick={() => setToggleUtilidade(false)} className="hover:opacity-75">✕</button>
              </span>
            )}

            {Object.entries(filters).map(([category, values]) =>
              values.map((val) => (
                <span
                  key={`${category}-${val}`}
                  className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <span className="opacity-70 uppercase text-[10px]">{category}:</span> {val}
                  <button
                    onClick={() => toggleFilterValue(category, val)}
                    className="hover:text-[#ffdb58] font-black"
                  >
                    ✕
                  </button>
                </span>
              ))
            )}

            <button
              onClick={limparTodosFiltros}
              className="ml-auto text-xs font-black uppercase underline text-[#c41e3a] hover:opacity-80"
            >
              Limpar Todos
            </button>
          </section>
        )}

        {/* ===============================================================
            PAINEL EXPANSÍVEL DE MULTISELEÇÃO UNIVERSAL (9 DIMENSÕES)
           =============================================================== */}
        {showFilters && (
          <section className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#0f172a]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b-2 border-slate-900">
              <div>
                <h3 className="font-black text-base uppercase tracking-wider flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#c41e3a] border border-slate-900 inline-block"></span>
                  Filtros de Multiseleção Universal
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Combine quantos critérios quiser (Fase, Quem pediu Vista, Diligência, Comissão, Relator, Autoria, Tipo e Ano).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Filtrar opções abaixo..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border-2 border-slate-900 rounded-lg bg-[#f5f4ef] outline-none"
                />
                <button
                  onClick={limparTodosFiltros}
                  className="px-3 py-1.5 rounded-lg border-2 border-slate-900 bg-[#c41e3a] text-white text-xs font-black uppercase"
                >
                  Resetar Tudo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { key: 'status', title: '1. Fase / Status', color: 'border-[#008080]' },
                { key: 'vistaDeputado', title: '2. Vista (Com Quem)', color: 'border-[#c41e3a]' },
                { key: 'diligenciaOrigem', title: '3. Diligência (Relator / Setor)', color: 'border-[#ffdb58]' },
                { key: 'setor', title: '4. Setor / Comissão Atual', color: 'border-[#008080]' },
                { key: 'relator', title: '5. Relator(a) na Comissão', color: 'border-slate-900' },
                { key: 'situacao', title: '6. Situação Oficial', color: 'border-[#c41e3a]' },
                { key: 'autoria', title: '7. Autoria / Subscrição', color: 'border-[#ffdb58]' },
                { key: 'tipo', title: '8. Tipo de Proposição', color: 'border-[#008080]' },
                { key: 'ano', title: '9. Ano da Proposição', color: 'border-slate-900' },
              ].map((col) => {
                const options = (filterOptions[col.key] || []).filter((o) =>
                  !filterSearch.trim() || o.label.toLowerCase().includes(filterSearch.toLowerCase().trim())
                );
                const selectedCount = (filters[col.key] || []).length;

                return (
                  <div key={col.key} className={`border-t-4 ${col.color} bg-[#f5f4ef]/60 rounded-lg p-3 border border-slate-200`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        {col.title}
                      </span>
                      {selectedCount > 0 && (
                        <button
                          onClick={() => clearCategory(col.key)}
                          className="text-[10px] font-extrabold text-[#c41e3a] underline"
                        >
                          Limpar ({selectedCount})
                        </button>
                      )}
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {options.length > 0 ? (
                        options.map((opt) => {
                          const checked = filters[col.key].includes(opt.label);
                          return (
                            <label
                              key={opt.label}
                              className={`flex items-center justify-between gap-2 px-2 py-1 rounded cursor-pointer text-xs font-bold transition-colors ${
                                checked ? 'bg-slate-900 text-white' : 'hover:bg-white text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleFilterValue(col.key, opt.label)}
                                  className="w-3.5 h-3.5 accent-[#008080] rounded flex-shrink-0"
                                />
                                <span className="truncate" title={opt.label}>
                                  {opt.label}
                                </span>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold flex-shrink-0 ${
                                checked ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {opt.count}
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="text-[11px] italic text-slate-400 py-2">Nenhuma opção disponível.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===============================================================
            BARRA DE ORDENAÇÃO RÁPIDA
           =============================================================== */}
        {!loading && !error && sortedFilteredData.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border-2 border-slate-900 rounded-xl px-4 py-2.5 shadow-[2px_2px_0px_0px_#0f172a]">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Ordenar por:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'movimento', label: 'Último Movimento' },
                { key: 'numero', label: 'Nº da Proposição' },
                { key: 'situacao', label: 'Situação' },
                { key: 'ementa', label: 'Ementa (A-Z)' },
                ...(activeTab === 'processo' ? [{ key: 'publicacao', label: 'Data Redação Final / Lei' }] : []),
              ].map((s) => {
                const active = sortConfig.key === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => handleSort(s.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-extrabold uppercase flex items-center gap-1 border transition-colors ${
                      active
                        ? 'bg-slate-900 text-[#ffdb58] border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-900'
                    }`}
                  >
                    <span>{s.label}</span>
                    {active && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===============================================================
            ESTADOS DE CARREGAMENTO E ERRO
           =============================================================== */}
        {loading && (
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-16 shadow-[4px_4px_0px_0px_#0f172a] flex flex-col items-center justify-center gap-4">
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-[#c41e3a] border-2 border-slate-900 animate-bounce"></div>
              <div className="w-5 h-5 bg-[#008080] border-2 border-slate-900 animate-bounce [animation-delay:150ms]"></div>
              <div className="w-5 h-5 bg-[#ffdb58] border-2 border-slate-900 animate-bounce [animation-delay:300ms]"></div>
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider">Sincronizando Proposições...</h2>
          </div>
        )}

        {error && (
          <div className="bg-[#c41e3a] text-white border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0f172a] flex items-center gap-4">
            <div className="p-3 bg-white text-[#c41e3a] rounded-xl border-2 border-slate-900 font-black text-xl">!</div>
            <div>
              <h2 className="text-lg font-black uppercase">Erro de Conexão com a Planilha</h2>
              <p className="text-sm font-bold opacity-95 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ===============================================================
            VISUALIZAÇÃO EM CARDS (MONDRIAN SUAVIZADO)
           =============================================================== */}
        {!loading && !error && viewMode === 'card' && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedFilteredData.map((item) => {
              const theme = getStatusTheme(item);

              return (
                <article
                  key={item.numero}
                  onClick={(e) => {
                    if (!e.target.closest('a') && !e.target.closest('button') && !e.target.closest('textarea')) {
                      setSelectedItem(item);
                    }
                  }}
                  className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col overflow-hidden"
                >
                  {/* Barra de Cor Superior Mondrian */}
                  <div className={`h-2.5 w-full border-b-2 border-slate-900 ${theme.accentBar}`}></div>

                  {/* Cabeçalho do Card */}
                  <div className="p-4 border-b border-slate-200 flex justify-between items-start gap-2 bg-slate-50/70">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                          {item.tipo}
                        </span>
                        <span className={`px-2 py-0.5 rounded border border-slate-900 text-[10px] font-black uppercase tracking-wider ${theme.badgeBg}`}>
                          {theme.label}
                        </span>
                        {item.temDiligencia && !item.temDiligenciaEmAberto && (
                          <span className="px-2 py-0.5 rounded border border-slate-900 bg-[#ffdb58]/60 text-slate-900 text-[9px] font-black uppercase">
                            Diligência
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                        {item.numero}
                      </h3>
                      {item.autoria && (
                        <p className="text-[11px] font-bold text-slate-600 mt-0.5 line-clamp-1" title={item.autoria}>
                          Autoria: <span className="text-slate-900">{item.autoria}</span>
                        </p>
                      )}
                    </div>

                    {item.link && item.link !== '-' && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg bg-white border-2 border-slate-900 hover:bg-[#ffdb58] transition-colors flex-shrink-0"
                        title="Abrir proposição no Portal e-Legis ALESC"
                      >
                        <svg className="w-4 h-4 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M15 3h6v6" />
                          <path d="M10 14 21 3" />
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        </svg>
                      </a>
                    )}
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-4 flex-1 flex flex-col gap-3.5">
                    {/* Destaque Especial: Pedido de Vista e Com Quem Está */}
                    {item.pedidoVista && (
                      <div className="p-3 rounded-xl border-2 border-[#c41e3a] bg-[#c41e3a]/10">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#c41e3a] mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#c41e3a] animate-pulse"></span>
                            Pedido de Vista — Com quem:
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-900 leading-snug">
                          {item.pedidoVista}
                        </p>
                      </div>
                    )}

                    {/* Destaque Especial: Requerimento de Diligência (NOVO) */}
                    {item.temDiligencia && (
                      <div className="p-3 rounded-xl border-2 border-slate-900 bg-[#ffdb58]/35">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-900 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-slate-900"></span>
                            {item.temDiligenciaEmAberto ? 'Requerimento de Diligência (Em Aberto)' : 'Requerimento de Diligência'}
                          </span>
                          {item.diligenciaResponsavel && (
                            <span className="px-1.5 py-0.2 rounded bg-white/80 border border-slate-900 text-[9px] truncate max-w-[120px]">
                              {item.diligenciaResponsavel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {item.detalheDiligencia}
                        </p>
                      </div>
                    )}

                    {/* Destaque Especial: Lei Aprovada */}
                    {item.isVirouLei && (
                      <div className="p-3 rounded-xl border-2 border-[#008080] bg-[#008080]/10 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#008080]">
                            Transformado em Norma Jurídica
                          </p>
                          <p className="text-sm font-black text-slate-900">
                            {item.numeroLei ? `Lei nº ${item.numeroLei}` : 'Lei Aprovada'}
                            {item.dataRedacaoFinal ? ` • ${item.dataRedacaoFinal}` : ''}
                          </p>
                        </div>
                        {item.leiLink?.url && (
                          <a
                            href={item.leiLink.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-lg bg-[#008080] text-white text-[10px] font-black uppercase border border-slate-900 hover:opacity-90 flex-shrink-0"
                          >
                            Ver Lei
                          </a>
                        )}
                      </div>
                    )}

                    {/* Ementa */}
                    <div className="bg-[#f5f4ef] border border-slate-300 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Ementa / Resumo
                      </p>
                      <p className="text-xs font-bold text-slate-800 leading-relaxed line-clamp-4">
                        {item.ementa || <span className="italic font-normal text-slate-400">Ementa não informada.</span>}
                      </p>
                    </div>

                    {/* Último Movimento */}
                    <div className={`p-3 rounded-xl border ${theme.boxBg}`}>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider mb-1">
                        <span>Último Movimento</span>
                        {item.dataUltMov && <span>{item.dataUltMov}</span>}
                      </div>
                      <p className="text-xs font-bold leading-snug line-clamp-3">
                        {item.textoUltMov}
                      </p>
                    </div>

                    {/* Situação, Setor e Relatoria */}
                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Situação Atual</p>
                        <p className="font-extrabold text-slate-900 truncate" title={item.situacao}>
                          {item.situacao}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Setor / Comissão</p>
                        <p className="font-extrabold text-slate-800 truncate" title={item.setor}>
                          {item.setor}
                        </p>
                      </div>
                    </div>

                    {item.isProcesso && (item.relator || item.infoRelatoria) && (
                      <div className="pt-2.5 border-t border-dashed border-slate-300 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Relator(a):</span>
                          {item.dataDistribuicao && (
                            <span className="text-[10px] font-bold text-slate-400">
                              Dist: {formatarData(item.dataDistribuicao)}
                            </span>
                          )}
                        </div>
                        <p className="font-black text-slate-900 uppercase truncate" title={item.relator}>
                          {item.relator || 'Não designado'}
                        </p>
                        {item.infoRelatoria && (
                          <p className="text-[11px] font-bold text-[#008080] italic mt-0.5 line-clamp-2">
                            {item.infoRelatoria}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Notas Internas dos Articuladores */}
                    <div className="mt-auto pt-3 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          Notas dos Articuladores
                        </span>
                        {editingId !== item.numero && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(item.numero);
                              setEditValue(item.observacoes || '');
                            }}
                            className="text-[10px] font-extrabold uppercase underline text-[#008080] hover:text-slate-900"
                          >
                            Editar
                          </button>
                        )}
                      </div>

                      {editingId === item.numero ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <textarea
                            rows="2"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Anotação para os articuladores..."
                            className="w-full p-2 text-xs font-bold border-2 border-slate-900 rounded-lg bg-[#f5f4ef] outline-none focus:border-[#008080]"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={isSaving}
                              className="px-2.5 py-1 rounded border border-slate-400 text-[10px] font-bold uppercase"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveObservacao(item.numero)}
                              disabled={isSaving}
                              className="px-3 py-1 rounded border border-slate-900 bg-[#008080] text-white text-[10px] font-black uppercase"
                            >
                              {isSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-700 line-clamp-2">
                          {item.observacoes || (
                            <span className="italic font-normal text-slate-400">Sem anotações internas.</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* ===============================================================
            VISUALIZAÇÃO EM LISTA COMPACTA
           =============================================================== */}
        {!loading && !error && viewMode === 'list' && (
          <section className="space-y-3">
            {sortedFilteredData.map((item) => {
              const theme = getStatusTheme(item);

              return (
                <div
                  key={item.numero}
                  onClick={(e) => {
                    if (!e.target.closest('a') && !e.target.closest('button') && !e.target.closest('textarea')) {
                      setSelectedItem(item);
                    }
                  }}
                  className="bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#0f172a] hover:shadow-[5px_5px_0px_0px_#0f172a] transition-all cursor-pointer flex flex-col md:flex-row overflow-hidden"
                >
                  <div className={`w-full md:w-3 h-2 md:h-auto border-b-2 md:border-b-0 md:border-r-2 border-slate-900 flex-shrink-0 ${theme.accentBar}`}></div>

                  <div className="p-4 flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Coluna 1: Identificação */}
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black uppercase">
                          {item.tipo}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border border-slate-900 text-[9px] font-black uppercase ${theme.badgeBg}`}>
                          {theme.label}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900">{item.numero}</h4>
                      {item.autoria && (
                        <span className="text-[11px] font-bold text-slate-500 truncate" title={item.autoria}>
                          {item.autoria}
                        </span>
                      )}
                    </div>

                    {/* Coluna 2: Ementa */}
                    <div className="md:col-span-4">
                      <p className="text-xs font-bold text-slate-800 line-clamp-3" title={item.ementa}>
                        {item.ementa || '-'}
                      </p>
                    </div>

                    {/* Coluna 3: Último Movimento, Vista e Diligência */}
                    <div className="md:col-span-3 space-y-1.5">
                      {item.pedidoVista && (
                        <div className="px-2.5 py-1 rounded-lg bg-[#c41e3a]/10 border border-[#c41e3a] text-[11px] font-black text-[#c41e3a]">
                          Vista: {item.pedidoVista}
                        </div>
                      )}
                      {item.temDiligencia && (
                        <div className="px-2.5 py-1 rounded-lg bg-[#ffdb58]/40 border border-slate-900 text-[11px] font-black text-slate-900">
                          Diligência: {item.detalheDiligencia}
                        </div>
                      )}
                      <div className={`p-2 rounded-lg border text-xs font-bold ${theme.boxBg}`}>
                        <span className="block text-[10px] font-black uppercase opacity-75">
                          {item.dataUltMov || 'Movimento'}
                        </span>
                        <span className="line-clamp-2">{item.textoUltMov}</span>
                      </div>
                    </div>

                    {/* Coluna 4: Situação, Relator e Notas */}
                    <div className="md:col-span-3 flex flex-col justify-between gap-1 text-xs border-t md:border-t-0 md:border-l border-dashed border-slate-300 pt-2 md:pt-0 md:pl-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Situação / Setor:</span>
                        <p className="font-extrabold text-slate-900 truncate">{item.situacao}</p>
                        <p className="text-[11px] font-bold text-slate-500 truncate">{item.setor}</p>
                      </div>
                      {item.relator && (
                        <p className="text-[11px] font-extrabold text-[#008080] truncate">
                          Rel: {item.relator}
                        </p>
                      )}
                      {item.observacoes && (
                        <p className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded truncate">
                          💬 {item.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Estado Vazio */}
        {!loading && !error && sortedFilteredData.length === 0 && (
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_#0f172a]">
            <h3 className="text-xl font-black uppercase text-slate-900">Nenhuma proposição encontrada</h3>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Ajuste os filtros universais ou clique abaixo para mostrar todas as proposições.
            </p>
            <button
              onClick={limparTodosFiltros}
              className="mt-4 px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-[#ffdb58] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#0f172a]"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        )}

        {/* ===============================================================
            MODAL DE DETALHES COMPLETOS DA PROPOSIÇÃO
           =============================================================== */}
        {selectedItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="bg-white border-2 border-slate-900 rounded-2xl shadow-[8px_8px_0px_0px_#ffdb58] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Barra Mondrian */}
              <div className="h-3 flex border-b-2 border-slate-900">
                <div className="w-1/2 bg-[#c41e3a] border-r-2 border-slate-900"></div>
                <div className="w-1/3 bg-[#008080] border-r-2 border-slate-900"></div>
                <div className="w-1/6 bg-[#ffdb58]"></div>
              </div>

              {/* Cabeçalho do Modal */}
              <div className="p-5 sm:p-6 bg-[#f5f4ef] border-b-2 border-slate-900 flex justify-between items-start gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-slate-900 text-white text-xs font-black uppercase">
                      {selectedItem.tipo}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded border border-slate-900 text-xs font-black uppercase ${getStatusTheme(selectedItem).badgeBg}`}>
                      {getStatusTheme(selectedItem).label}
                    </span>
                    {selectedItem.dataEntrada && (
                      <span className="text-xs font-bold text-slate-500">
                        Entrada: {formatarData(selectedItem.dataEntrada)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                    {selectedItem.numero}
                  </h2>
                  {selectedItem.autoria && (
                    <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                      Autoria / Subscrição: <strong className="text-slate-900">{selectedItem.autoria}</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedItem.link && selectedItem.link !== '-' && (
                    <a
                      href={selectedItem.link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2.5 rounded-xl bg-white border-2 border-slate-900 font-black text-xs uppercase flex items-center gap-2 hover:bg-[#ffdb58] shadow-[2px_2px_0px_0px_#0f172a]"
                    >
                      <span>Abrir na ALESC</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-2.5 rounded-xl bg-white border-2 border-slate-900 hover:bg-[#c41e3a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_#0f172a]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Corpo do Modal */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                {/* Alerta de Pedido de Vista no Modal */}
                {selectedItem.pedidoVista && (
                  <div className="p-4 rounded-xl border-2 border-[#c41e3a] bg-[#c41e3a]/10">
                    <p className="text-xs font-black uppercase tracking-wider text-[#c41e3a] mb-1">
                      Pedido de Vista Registrado (Com Quem Está)
                    </p>
                    <p className="text-base font-black text-slate-900">
                      {selectedItem.pedidoVista}
                    </p>
                  </div>
                )}

                {/* Alerta de Requerimento de Diligência no Modal */}
                {selectedItem.temDiligencia && (
                  <div className="p-4 rounded-xl border-2 border-slate-900 bg-[#ffdb58]/40">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                        {selectedItem.temDiligenciaEmAberto
                          ? 'Requerimento de Diligência (Em Aberto / Aguardando)'
                          : 'Requerimento de Diligência Registrado'}
                      </p>
                      {selectedItem.diligenciaResponsavel && (
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-900 text-xs font-black">
                          {selectedItem.diligenciaResponsavel}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-black text-slate-900">
                      {selectedItem.detalheDiligencia}
                    </p>
                  </div>
                )}

                {/* Alerta de Lei Aprovada no Modal */}
                {selectedItem.isVirouLei && (
                  <div className="p-4 rounded-xl border-2 border-[#008080] bg-[#008080]/10 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#008080]">
                        Proposição Transformada em Lei
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {selectedItem.numeroLei ? `Lei nº ${selectedItem.numeroLei}` : 'Norma Jurídica Promulgada'}
                        {selectedItem.dataRedacaoFinal ? ` • Publicação Redação Final: ${selectedItem.dataRedacaoFinal}` : ''}
                      </p>
                    </div>
                    {selectedItem.leiLink?.url && (
                      <a
                        href={selectedItem.leiLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#008080] text-white border-2 border-slate-900 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#0f172a]"
                      >
                        Acessar Texto da Lei
                      </a>
                    )}
                  </div>
                )}

                {/* Último Movimento */}
                <div className="p-4 rounded-xl border-2 border-slate-900 bg-[#ffdb58]/40">
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-slate-800 mb-1">
                    <span>Último Movimento Registrado</span>
                    {selectedItem.dataUltMov && <span>{selectedItem.dataUltMov}</span>}
                  </div>
                  <p className="text-base font-black text-slate-900">
                    {selectedItem.textoUltMov}
                  </p>
                </div>

                {/* Ementa Completa */}
                <div className="p-4 rounded-xl border-2 border-slate-900 bg-white">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Ementa Completa
                  </p>
                  <p className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {selectedItem.ementa || '-'}
                  </p>
                </div>

                {/* Grade de Detalhes de Tramitação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-300 bg-[#f5f4ef] space-y-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500">Situação Atual</p>
                      <p className="text-base font-black text-[#008080]">{selectedItem.situacao}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500">Setor / Comissão Atual</p>
                      <p className="text-sm font-bold text-slate-900">{selectedItem.setor}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500">Última Verificação pelo Robô</p>
                      <p className="text-xs font-bold text-slate-700">{formatarData(selectedItem.dataVerificacao)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-300 bg-[#f5f4ef] space-y-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500">Relator(a) na Comissão</p>
                      <p className="text-sm font-black uppercase text-slate-900">
                        {selectedItem.relator || 'Não designado'}
                      </p>
                      {selectedItem.dataDistribuicao && (
                        <p className="text-xs font-bold text-slate-500">
                          Distribuído em: {formatarData(selectedItem.dataDistribuicao)}
                        </p>
                      )}
                      {selectedItem.infoRelatoria && (
                        <p className="text-xs font-bold text-[#008080] italic mt-1">
                          Parecer / Info: {selectedItem.infoRelatoria}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500">Processos Apensados / Anexos</p>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedItem.processosAnexos || 'Nenhum processo anexo'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Editor de Observações Internas no Modal */}
                <div className="p-4 rounded-xl border-2 border-slate-900 bg-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Anotações Internas da Articulação
                    </span>
                    {editingId !== selectedItem.numero && (
                      <button
                        onClick={() => {
                          setEditingId(selectedItem.numero);
                          setEditValue(selectedItem.observacoes || '');
                        }}
                        className="text-xs font-black uppercase underline text-[#008080]"
                      >
                        Editar Anotação
                      </button>
                    )}
                  </div>

                  {editingId === selectedItem.numero ? (
                    <div className="space-y-3">
                      <textarea
                        rows="3"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full p-3 text-sm font-bold border-2 border-slate-900 rounded-xl bg-white outline-none"
                        placeholder="Insira observações estratégicas para a equipe..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-lg border-2 border-slate-900 bg-white text-xs font-black uppercase"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveObservacao(selectedItem.numero)}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-lg border-2 border-slate-900 bg-[#008080] text-white text-xs font-black uppercase"
                        >
                          {isSaving ? 'Salvando...' : 'Salvar na Planilha'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-700 whitespace-pre-wrap">
                      {selectedItem.observacoes || (
                        <span className="italic font-normal text-slate-400">Nenhuma anotação registrada.</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Notificação Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border-2 border-slate-900 bg-[#ffdb58] text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] font-black text-xs uppercase tracking-wider">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
