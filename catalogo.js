// Catálogo-base da Janu Turismo.
// Os dados de passeio ficam centralizados aqui. O restante do app continua usando
// um adaptador de compatibilidade para não quebrar o que já funciona no site.

export const CATEGORIAS = ['bate-e-volta', 'fim-de-semana', 'parque', 'praia', 'serra', 'sertao', 'feriado'];
export const STATUS_PASSEIO = ['aberto', 'vagas-limitadas', 'esgotado', 'data-a-confirmar', 'encerrado'];

const embarques = cidades => cidades.map(cidade => ({ cidade, horario: null }));

export const PASSEIOS_SEED = [
  {
    id: 'guaramiranga',
    seedRevision: 20261003,
    photoRevision: 202610031551,
    slug: 'guaramiranga-natal-de-luz-2026',
    titulo: 'Guaramiranga',
    subtitulo: 'Natal de Luz 2026',
    destino: 'Guaramiranga',
    categoria: 'serra',
    startDate: '2026-12-19',
    endDate: '2026-12-20',
    duracao: '2 dias',
    status: 'aberto',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'individual', nome: 'Individual', preco: 480, por: 'pessoa', pessoasIncluidas: 1 },
      { id: 'casal', nome: 'Casal (2 pessoas)', preco: 1000, por: 'casal', pessoasIncluidas: 2 },
    ],
    regraCrianca: null,
    incluso: [
      'Transporte de ida e volta',
      'Hospedagem em pousada no centro de Guaramiranga',
      'Café da manhã no sábado e no domingo',
    ],
    naoIncluso: [
      'Entrada do Mosteiro dos Jesuítas',
      'Entrada da Cachoeira do Perigo',
    ],
    roteiro: [
      'Cabanas da Serra',
      'Mosteiro dos Jesuítas',
      'Cachoeira do Perigo',
      'Parque de Aventura Nosso Sítio',
    ],
    hospedagem: 'Pousada no centro de Guaramiranga',
    observacoes: 'Reserva efetivada com o pagamento da primeira parcela.',
    embarques: embarques(['Tauá', 'Boa Viagem']),
    pagamento: {
      pix: {
        regrasPorOpcao: {
          individual: [{ diasMinimos: 0, maxParcelas: 3 }],
          casal: [{ diasMinimos: 0, maxParcelas: 5 }],
        },
        observacao: 'Máximo divulgado: individual em até 3x e casal em até 5x. A quantidade de parcelas diminui conforme a data do passeio se aproxima.',
      },
    },
    imagens: [
      './assets/guaramiranga.webp',
      './assets/guaramiranga-centro-20261003.jpg',
    ],
  },
  {
    id: 'sitio-do-bosco',
    seedRevision: 20261003,
    photoRevision: 202610031551,
    publicVacancyStatus: 'last-spots',
    slug: 'sitio-do-bosco-ubajara-2026',
    titulo: 'Sítio do Bosco & Ubajara',
    subtitulo: 'Serra da Ibiapaba',
    destino: 'Sítio do Bosco & Ubajara',
    categoria: 'serra',
    startDate: '2026-10-17',
    endDate: '2026-10-18',
    duracao: '2 dias',
    status: 'aberto',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'individual', nome: 'Individual', preco: 450, por: 'pessoa', pessoasIncluidas: 1 },
      { id: 'casal', nome: 'Casal', preco: 950, por: 'casal', pessoasIncluidas: 2 },
    ],
    regraCrianca: null,
    incluso: [
      'Transporte de ida e volta',
      'Hospedagem em Ubajara',
      'Café da manhã nos dois dias',
      'Almoço nos dois dias',
      'Entrada no Sítio do Bosco',
      'Passeio de bondinho',
    ],
    naoIncluso: [],
    roteiro: ['Sítio do Bosco', 'Ubajara'],
    hospedagem: 'Hospedagem em Ubajara',
    observacoes: 'Passeio de bondinho mediante doação de 3 kg de alimentos, destinada a instituições locais.',
    embarques: embarques(['Tauá', 'Boa Viagem', 'Pedra Branca']),
    pagamento: {
      pix: {
        maxParcelas: 1,
        observacao: '[CONFIRMAR] O anúncio informa Pix, mas não informa parcelamento.',
      },
      cartao: {
        maxParcelas: null,
        acrescimoPercentual: null,
        observacao: '[CONFIRMAR] Parcelas e percentual de acréscimo do cartão.',
      },
    },
    imagens: [
      './assets/sitio-do-bosco.webp',
      './assets/sitio-do-bosco-restaurante-20261003.jpg',
      './assets/sitio-do-bosco-mirante-20261003.jpg',
    ],
  },
  {
    id: 'arajara-park',
    seedRevision: 2026100301,
    photoRevision: 202610031422,
    publicVacancyStatus: 'last-spots',
    slug: 'arajara-park-mes-das-criancas-2026',
    titulo: 'Arajara Park',
    subtitulo: 'Especial Mês das Crianças',
    destino: 'Arajara Park',
    categoria: 'parque',
    startDate: '2026-10-11',
    endDate: '2026-10-11',
    duracao: 'Bate e volta',
    status: 'aberto',
    dateTbc: false,
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'individual', nome: 'Individual', preco: 160, por: 'pessoa', pessoasIncluidas: 1 },
    ],
    regraCrianca: 'Valor de R$ 160 para adultos e crianças acima de 5 anos.',
    incluso: ['Transporte climatizado', 'Entrada no parque'],
    naoIncluso: [],
    roteiro: [],
    hospedagem: null,
    observacoes: 'Data atualizada para 11 de outubro. O anúncio informa vagas limitadas.',
    embarques: [],
    pagamento: {
      pix: { maxParcelas: 1, observacao: '[CONFIRMAR] Condições de parcelamento no Pix.' },
      cartao: { maxParcelas: null, acrescimoPercentual: null, observacao: '[CONFIRMAR] Condições do cartão.' },
    },
    imagens: [
      './assets/arajara-park-piscinas-20261003.jpg',
      './assets/arajara-park-dinossauro-20261003.jpg',
    ],
    publicado: true,
  },
  {
    id: 'praia-de-lagoinha',
    seedRevision: 20261003,
    photoRevision: 202610031551,
    slug: 'praia-de-lagoinha-dezembro-2026',
    titulo: 'Praia de Lagoinha',
    subtitulo: 'Hotel Terraço',
    destino: 'Praia de Lagoinha',
    categoria: 'praia',
    startDate: '2026-12-12',
    endDate: '2026-12-13',
    duracao: '2 dias',
    status: 'aberto',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'quarto-casal', nome: 'Quarto casal ou 2 pessoas', preco: 800, por: 'quarto', pessoasIncluidas: 2 },
      { id: 'triplo-quadruplo', nome: 'Quarto triplo ou quádruplo', preco: 380, por: 'pessoa', pessoasIncluidas: 1 },
    ],
    regraCrianca: 'Até 5 anos não pagam, viajam no colo e dormem com os pais.',
    incluso: ['Hospedagem no Hotel Terraço'],
    naoIncluso: [],
    roteiro: [],
    hospedagem: 'Hotel Terraço',
    observacoes: '',
    embarques: embarques(['Mombaça', 'Minerolândia', 'Pedra Branca', 'Tauá', 'Cruzeta', 'Boa Viagem', 'Madalena']),
    pagamento: {
      pix: { maxParcelas: 2, observacao: 'Pix em até 2x.' },
      cartao: { maxParcelas: null, acrescimoPercentual: null, observacao: '[CONFIRMAR] Parcelas e percentual de acréscimo do cartão.' },
    },
    imagens: [
      './assets/lagoinha.webp',
      './assets/praia-de-lagoinha-20261003.jpg',
    ],
  },
  {
    id: 'praia-aguas-belas',
    seedRevision: 20261003,
    photoRevision: 202610031551,
    slug: 'praia-aguas-belas-outubro-2026',
    titulo: 'Praia de Águas Belas',
    subtitulo: 'Um dia de lazer',
    destino: 'Águas Belas',
    categoria: 'praia',
    startDate: '2026-10-11',
    endDate: '2026-10-11',
    duracao: 'Bate e volta',
    status: 'aberto',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'valor-divulgado', nome: 'Valor divulgado', preco: 130, por: 'pessoa', pessoasIncluidas: 1 },
      { id: 'saida-taua', nome: 'Saída de Tauá', preco: 160, por: 'pessoa', pessoasIncluidas: 1 },
    ],
    regraCrianca: null,
    incluso: ['Transporte confortável de ida e volta', 'Dia de lazer na Praia de Águas Belas'],
    naoIncluso: [],
    roteiro: ['Praia de Águas Belas'],
    hospedagem: null,
    observacoes: 'A publicação divulga R$ 130 e também R$ 160 para embarque em Tauá. Confirme o valor conforme a cidade de saída.',
    embarques: [],
    pagamento: {},
    imagens: [
      './assets/lagoinha.webp',
      './assets/praia-aguas-belas-20261003.jpg',
    ],
  },
  {
    id: 'parque-nacional-ubajara',
    seedRevision: 20261003,
    photoRevision: 202610031551,
    slug: 'parque-nacional-ubajara-novembro-2026',
    titulo: 'Parque Nacional de Ubajara',
    subtitulo: 'Natureza, aventura e paisagens',
    destino: 'Ubajara',
    categoria: 'serra',
    startDate: '2026-11-15',
    endDate: '2026-11-15',
    duracao: 'Bate e volta',
    status: 'aberto',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'individual', nome: 'Individual', preco: 280, por: 'pessoa', pessoasIncluidas: 1 },
    ],
    regraCrianca: null,
    incluso: ['Café da manhã', 'Almoço', 'Transporte de ida e volta'],
    naoIncluso: [
      'Visita à Gruta de Ubajara: R$ 20',
      'Passeio no bondinho mediante agendamento prévio e doação de 3 kg de alimentos não perecíveis',
    ],
    roteiro: ['Parque Nacional de Ubajara'],
    hospedagem: null,
    observacoes: 'Atividades opcionais incluem bondinho, visita à Gruta de Ubajara e trilhas mais longas até cachoeiras.',
    embarques: embarques(['Mombaça', 'Minerolândia', 'Pedra Branca', 'Boa Viagem', 'Monsenhor Tabosa']),
    pagamento: {
      pix: { maxParcelas: 1, observacao: 'Condições confirmadas pela Janu.' },
      cartao: { maxParcelas: null, acrescimoPercentual: null, observacao: 'Condições confirmadas pela Janu.' },
    },
    imagens: [
      './assets/sitio-do-bosco.webp',
      './assets/ubajara-bondinho-20261003.jpg',
    ],
  },
  {
    id: 'buq-celebration',
    seedRevision: 2026100301,
    photoRevision: 202610031422,
    publicVacancyStatus: 'last-spots',
    slug: 'buq-celebration-novembro-2026',
    titulo: 'BUQ Celebration',
    subtitulo: 'O maior evento Gospel do Norte/Nordeste',
    destino: 'Fortaleza',
    categoria: 'bate-e-volta',
    startDate: '2026-11-07',
    endDate: '2026-11-07',
    duracao: 'Bate e volta',
    status: 'aberto',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'transporte', nome: 'Transporte para o evento', preco: 100, por: 'pessoa', pessoasIncluidas: 1 },
    ],
    regraCrianca: null,
    incluso: ['Transporte climatizado'],
    naoIncluso: [],
    roteiro: ['Aterro da Praia de Iracema - Fortaleza'],
    hospedagem: null,
    observacoes: 'BUQ Celebration em 07 de novembro de 2026. Embarques confirmados em Boa Viagem e Madalena.',
    embarques: embarques(['Boa Viagem', 'Madalena']),
    pagamento: {
      pix: { maxParcelas: 1, observacao: 'Condições confirmadas pela Janu.' },
    },
    imagens: [
      './assets/buq-celebration-cartaz-20261003.jpg',
      './assets/buq-celebration-publico-20261003.jpg',
    ],
  },
  {
    id: 'lagoa-encantada-alchymist',
    seedRevision: 20261003,
    slug: 'lagoa-encantada-alchymist-setembro-2026',
    titulo: 'Lagoa Encantada do Alchymist',
    subtitulo: 'Passeio bate e volta',
    destino: 'Lagoa Encantada do Alchymist',
    categoria: 'praia',
    startDate: '2026-09-27',
    endDate: '2026-09-27',
    duracao: 'Bate e volta',
    status: 'encerrado',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'individual', nome: 'Individual', preco: 100, por: 'pessoa', pessoasIncluidas: 1 },
    ],
    regraCrianca: null,
    incluso: ['Transporte de ida e volta'],
    naoIncluso: ['Entrada na Lagoa Encantada do Alchymist: R$ 39'],
    roteiro: ['Lagoa Encantada do Alchymist'],
    hospedagem: null,
    observacoes: 'Passeio realizado em 27 de setembro de 2026; mantido apenas no histórico do catálogo.',
    embarques: embarques(['Minerolândia', 'Pedra Branca', 'Boa Viagem', 'Madalena']),
    pagamento: {
      pix: { maxParcelas: 1, observacao: 'Condições históricas.' },
    },
    imagens: ['./assets/lagoa-do-paraiso.webp'],
  },
  {
    id: 'morro-branco',
    slug: 'morro-branco-setembro-2026',
    titulo: 'Morro Branco',
    subtitulo: 'Passeio bate e volta',
    destino: 'Morro Branco',
    categoria: 'praia',
    startDate: '2026-09-06',
    endDate: '2026-09-06',
    duracao: 'Bate e volta',
    status: 'encerrado',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'individual', nome: 'Individual', preco: 130, por: 'pessoa', pessoasIncluidas: 1 },
    ],
    regraCrianca: null,
    incluso: ['Transporte confortável e seguro'],
    naoIncluso: [],
    roteiro: [],
    hospedagem: null,
    observacoes: 'Passeio já realizado; mantido no catálogo para validar encerramento por data.',
    embarques: embarques(['Pedra Branca', 'Boa Viagem', 'Madalena']),
    pagamento: {
      pix: { maxParcelas: 1, observacao: '[CONFIRMAR] Condições históricas de pagamento.' },
      cartao: { maxParcelas: null, acrescimoPercentual: null, observacao: '[CONFIRMAR] Condições históricas de pagamento.' },
    },
    imagens: [],
  },
  {
    // Mantido porque já existe no site e continua útil.
    id: 'jericoacoara',
    photoRevision: 202610031551,
    slug: 'jericoacoara',
    titulo: 'Jericoacoara',
    subtitulo: 'Sol, lagoas e pôr do sol',
    destino: 'Jericoacoara',
    categoria: 'praia',
    startDate: null,
    endDate: null,
    dataTexto: '06 de dezembro',
    duracao: 'Bate e volta',
    status: 'aberto',
    vagasTotais: null,
    vagasOcupadas: null,
    minToConfirm: null,
    opcoesPreco: [
      { id: 'individual', nome: 'Individual', preco: 320, por: 'pessoa', pessoasIncluidas: 1 },
    ],
    regraCrianca: null,
    incluso: ['Transporte de ida e volta', 'Café da manhã', 'Transporte em veículo 4×4'],
    naoIncluso: [],
    roteiro: ['Lagoa do Paraíso', 'Lagun Beach', 'Praia do Preá', 'Pôr do sol nas dunas da Lagoa do Amâncio'],
    hospedagem: null,
    observacoes: '[CONFIRMAR] Ano/data completa do passeio já existente.',
    embarques: embarques(['Pedra Branca', 'Boa Viagem', 'Madalena', 'Livramento', 'Monsenhor Tabosa']),
    pagamento: {
      pix: { maxParcelas: 1, observacao: '[CONFIRMAR] Condições do Pix.' },
      cartao: { maxParcelas: null, acrescimoPercentual: null, observacao: '[CONFIRMAR] Condições do cartão.' },
    },
    imagens: [
      './assets/jericoacoara.webp',
      './assets/jericoacoara-lagoa-20261003.jpg',
    ],
  },
];

function dataLocal(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return new Date(`${iso}T12:00:00`);
}

function formatarData(iso) {
  const data = dataLocal(iso);
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(data);
}

export function formatarPeriodo(passeio) {
  if (passeio.dataTexto) return passeio.dataTexto;
  const startDate = passeio.startDate || passeio.dataInicio;
  const endDate = passeio.endDate || passeio.dataFim || startDate;
  if (!startDate) return 'Data a confirmar';
  if (!endDate || endDate === startDate) return formatarData(startDate);
  const inicio = dataLocal(startDate);
  const fim = dataLocal(endDate);
  if (!inicio || !fim) return 'Data a confirmar';
  if (inicio.getMonth() === fim.getMonth()) {
    const mes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(fim);
    return `${String(inicio.getDate()).padStart(2, '0')} e ${String(fim.getDate()).padStart(2, '0')} de ${mes}`;
  }
  return `${formatarData(startDate)} a ${formatarData(endDate)}`;
}

export function parcelasDisponiveis(passeio, opcao, hoje = new Date()) {
  const opcaoId = typeof opcao === 'string' ? opcao : opcao?.id;
  if (!passeio?.pagamento?.pix || !opcaoId) return 1;

  const inicio = dataLocal(passeio.startDate || passeio.dataInicio);
  const referencia = hoje instanceof Date
    ? new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12)
    : dataLocal(String(hoje));

  if (inicio && referencia && inicio < referencia) return 0;

  const regras = passeio.pagamento.pix.regrasPorOpcao?.[opcaoId];
  if (Array.isArray(regras) && regras.length) {
    const diasRestantes = inicio && referencia ? Math.ceil((inicio - referencia) / 86400000) : Number.POSITIVE_INFINITY;
    const regra = [...regras]
      .sort((a, b) => b.diasMinimos - a.diasMinimos)
      .find(item => diasRestantes >= item.diasMinimos);
    return Math.max(1, Number(regra?.maxParcelas || 1));
  }

  return Math.max(1, Number(passeio.pagamento.pix.maxParcelas || 1));
}

function categoriaLegada(categoria) {
  const mapa = {
    'bate-e-volta': 'Passeio',
    'fim-de-semana': 'Fim de semana',
    parque: 'Parque',
    praia: 'Praia',
    serra: 'Serra',
    sertao: 'Sertão',
    feriado: 'Feriado',
  };
  return mapa[categoria] || categoria || 'Passeio';
}

function tipoLegado(passeio) {
  if (/bate e volta/i.test(passeio.duracao || '')) return 'Bate e volta';
  if (passeio.hospedagem) return 'Viagem com hospedagem';
  if (passeio.categoria === 'parque') return 'Passeio';
  return 'Passeio';
}

function iconeInclusao(texto) {
  const valor = String(texto).toLowerCase();
  if (valor.includes('hosped') || valor.includes('pousada') || valor.includes('hotel')) return 'bed';
  if (valor.includes('café')) return 'coffee';
  if (valor.includes('almoço') || valor.includes('refei')) return 'meal';
  if (valor.includes('entrada') || valor.includes('ingresso')) return 'ticket';
  if (valor.includes('4×4') || valor.includes('4x4') || valor.includes('bondinho')) return 'car';
  if (valor.includes('transporte')) return 'bus';
  return 'check';
}

function menorPrecoPorPessoa(opcoes = []) {
  const valores = opcoes
    .map(opcao => {
      if (!Number.isFinite(opcao.preco)) return null;
      if (opcao.por === 'casal' || opcao.por === 'quarto') {
        return opcao.preco / Math.max(1, Number(opcao.pessoasIncluidas || 1));
      }
      return opcao.preco;
    })
    .filter(Number.isFinite);
  return valores.length ? Math.min(...valores) : 0;
}

export function adaptarPasseioParaApp(passeio) {
  const opcoes = passeio.opcoesPreco || [];
  const primeiroPreco = opcoes[0] || { nome: 'Individual', preco: 0, pessoasIncluidas: 1 };
  const publicado = passeio.publicado !== false && passeio.status !== 'encerrado';

  return {
    ...passeio,
    title: passeio.titulo,
    subtitle: passeio.subtitulo || '',
    startDate: passeio.startDate || passeio.dataInicio || '',
    endDate: passeio.endDate || passeio.dataFim || passeio.startDate || passeio.dataInicio || '',
    minToConfirm: passeio.minToConfirm ?? passeio.minimoParaConfirmar ?? null,
    dateTbc: passeio.dateTbc === true || passeio.status === 'data-a-confirmar',
    date: formatarPeriodo(passeio),
    price: menorPrecoPorPessoa(opcoes),
    priceNote: primeiroPreco.nome,
    category: categoriaLegada(passeio.categoria),
    image: passeio.imagens?.[0] || './assets/logo-janu.webp',
    imageAlt: passeio.titulo,
    kind: tipoLegado(passeio),
    blurb: passeio.observacoes || passeio.subtitulo || '',
    fareOptions: opcoes.map(opcao => ({
      id: opcao.id,
      label: opcao.nome,
      amount: opcao.preco,
      seats: Math.max(1, Number(opcao.pessoasIncluidas || 1)),
      pricePer: opcao.por,
    })),
    includes: (passeio.incluso || []).map(item => [iconeInclusao(item), item]),
    stops: (passeio.roteiro || []).map(item => [item, (passeio.naoIncluso || []).some(nao => nao.toLowerCase().includes(item.toLowerCase())) ? 'Entrada não inclusa' : '']),
    notice: [passeio.regraCrianca, ...(passeio.naoIncluso || [])].filter(Boolean).join(' · '),
    boarding: (passeio.embarques || []).map(item => item.cidade),
    payment: [
      passeio.pagamento?.pix ? 'Pix' : null,
      passeio.pagamento?.cartao ? 'Cartão' : null,
    ].filter(Boolean),
    images: passeio.imagens || [],
    published: publicado,
    special: false,
    specialUntil: '',
  };
}
