import { Cargo, Candidato, Eleitor, ConfiguracaoEleicao } from '@/types/election';

export const INITIAL_CONFIG: ConfiguracaoEleicao = {
  id: 'cfg-default',
  titulo: 'Eleições Juventude 2026',
  igreja: 'Ministério de Jovens da Igreja',
  subtitulo: 'Escolha com oração e sabedoria a nova diretoria para o próximo mandato',
  status: 'aberta',
  exigir_codigo_eleitor: true,
  codigo_mesario: '1234',
  som_habilitado: true,
  modo_votacao: 'sequencial_um_por_vez',
  cargo_ativo_id: 'cargo-presidente',
  eleitos: [],
};

// Os 5 cargos solicitados na ordem oficial
export const INITIAL_CARGOS: Cargo[] = [
  {
    id: 'cargo-presidente',
    nome: 'PRESIDENTE',
    ordem: 1,
    digitos: 2,
    permite_branco: true,
    descricao: 'Presidente do Grupo de Jovens',
  },
  {
    id: 'cargo-vice',
    nome: 'VICE-PRESIDENTE',
    ordem: 2,
    digitos: 2,
    permite_branco: true,
    descricao: 'Vice-Presidente do Grupo de Jovens',
  },
  {
    id: 'cargo-sec-1',
    nome: '1º SECRETÁRIO',
    ordem: 3,
    digitos: 2,
    permite_branco: true,
    descricao: 'Primeiro Secretário(a)',
  },
  {
    id: 'cargo-sec-2',
    nome: '2º SECRETÁRIO',
    ordem: 4,
    digitos: 2,
    permite_branco: true,
    descricao: 'Segundo Secretário(a)',
  },
  {
    id: 'cargo-tesoureiro',
    nome: 'TESOUREIRO',
    ordem: 5,
    digitos: 2,
    permite_branco: true,
    descricao: 'Tesoureiro(a) do Grupo de Jovens',
  },
];

// Exemplos de candidatos (alguns disputam mais de um cargo para demonstrar a regra de eliminação caso eleitos)
export const INITIAL_CANDIDATOS: Candidato[] = [
  // 1. PRESIDENTE
  {
    id: 'cand-pres-1',
    cargo_id: 'cargo-presidente',
    numero: '10',
    nome: 'LUCAS EMANUEL',
    chapa: 'CHAPA 10 - GERAÇÃO ELEITA',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    descricao: 'Compromisso com discipulado e crescimento espiritual dos jovens.',
  },
  {
    id: 'cand-pres-2',
    cargo_id: 'cargo-presidente',
    numero: '20',
    nome: 'GABRIEL SANTOS',
    chapa: 'CHAPA 20 - RESGATE E GRAÇA',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    descricao: 'Foco no acolhimento de novos jovens, retiros e evangelismo.',
  },

  // 2. VICE-PRESIDENTE (Gabriel Santos e Rebeca também se inscreveram para Vice caso não ganhem)
  {
    id: 'cand-vice-1',
    cargo_id: 'cargo-vice',
    numero: '11',
    nome: 'REBECA LIMA',
    chapa: 'CHAPA 10 - GERAÇÃO ELEITA',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    descricao: 'Apoio à liderança e integração dos ministérios.',
  },
  {
    id: 'cand-vice-2',
    cargo_id: 'cargo-vice',
    numero: '21',
    nome: 'GABRIEL SANTOS',
    chapa: 'CHAPA 20 - RESGATE E GRAÇA',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    descricao: 'Disputa também a vice-presidência se não for eleito presidente.',
  },
  {
    id: 'cand-vice-3',
    cargo_id: 'cargo-vice',
    numero: '31',
    nome: 'SARAH MARTINS',
    chapa: 'CHAPA 30 - ATOS 2',
    foto_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    descricao: 'Pastoreio e aconselhamento de jovens.',
  },

  // 3. 1º SECRETÁRIO
  {
    id: 'cand-sec1-1',
    cargo_id: 'cargo-sec-1',
    numero: '12',
    nome: 'ANA CLARA ALBUQUERQUE',
    chapa: 'CHAPA 10 - GERAÇÃO ELEITA',
    foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    descricao: 'Atas, comunicação oficial e registros dos cultos jovens.',
  },
  {
    id: 'cand-sec1-2',
    cargo_id: 'cargo-sec-1',
    numero: '22',
    nome: 'DANIEL RIBEIRO',
    chapa: 'CHAPA 20 - RESGATE E GRAÇA',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    descricao: 'Organização administrativa e cronogramas das atividades.',
  },

  // 4. 2º SECRETÁRIO
  {
    id: 'cand-sec2-1',
    cargo_id: 'cargo-sec-2',
    numero: '13',
    nome: 'FELIPE AUGUSTO',
    chapa: 'CHAPA 10 - GERAÇÃO ELEITA',
    foto_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
    descricao: 'Apoio à secretaria e relatórios mensais de presença.',
  },
  {
    id: 'cand-sec2-2',
    cargo_id: 'cargo-sec-2',
    numero: '23',
    nome: 'CAMILA FERREIRA',
    chapa: 'CHAPA 20 - RESGATE E GRAÇA',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    descricao: 'Frequência e avisos semanais aos jovens.',
  },

  // 5. TESOUREIRO (Daniel Ribeiro também concorre à tesouraria se não for eleito secretário)
  {
    id: 'cand-tes-1',
    cargo_id: 'cargo-tesoureiro',
    numero: '14',
    nome: 'MATHEUS SILVA',
    chapa: 'CHAPA 10 - GERAÇÃO ELEITA',
    foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    descricao: 'Transparência nas contas, cantina e finanças dos retiros.',
  },
  {
    id: 'cand-tes-2',
    cargo_id: 'cargo-tesoureiro',
    numero: '24',
    nome: 'DANIEL RIBEIRO',
    chapa: 'CHAPA 20 - RESGATE E GRAÇA',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    descricao: 'Concorre à tesouraria caso não vença como 1º Secretário.',
  },
  {
    id: 'cand-tes-3',
    cargo_id: 'cargo-tesoureiro',
    numero: '34',
    nome: 'BEATRIZ SOUZA',
    chapa: 'CHAPA 30 - ATOS 2',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    descricao: 'Gestão dos recursos do ministério com fidelidade.',
  },
];

export const INITIAL_ELEITORES: Eleitor[] = [
  { id: 'el-1', nome: 'Ana Clara Albuquerque', codigo: 'JUMP-01', votou: false },
  { id: 'el-2', nome: 'Bernardo Costa', codigo: 'JUMP-02', votou: false },
  { id: 'el-3', nome: 'Camila Ferreira', codigo: 'JUMP-03', votou: false },
  { id: 'el-4', nome: 'Daniel Ribeiro', codigo: 'JUMP-04', votou: false },
  { id: 'el-5', nome: 'Eduarda Vasconcelos', codigo: 'JUMP-05', votou: false },
  { id: 'el-6', nome: 'Felipe Augusto', codigo: 'JUMP-06', votou: false },
  { id: 'el-7', nome: 'Gabriela Ramos', codigo: 'JUMP-07', votou: false },
  { id: 'el-8', nome: 'Heitor Nogueira', codigo: 'JUMP-08', votou: false },
  { id: 'el-9', nome: 'Isabela Monteiro', codigo: 'JUMP-09', votou: false },
  { id: 'el-10', nome: 'João Pedro Carvalho', codigo: 'JUMP-10', votou: false },
];
