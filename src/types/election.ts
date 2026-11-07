export interface Cargo {
  id: string;
  nome: string;
  ordem: number;
  digitos: number;
  permite_branco: boolean;
  descricao?: string;
}

export interface Candidato {
  id: string;
  cargo_id: string;
  numero: string;
  nome: string;
  nome_vice?: string;
  chapa: string;
  foto_url?: string;
  descricao?: string;
  inelegivel?: boolean;
  motivo_inelegivel?: string;
}

export interface Eleitor {
  id: string;
  nome: string;
  codigo: string; // Ex: "JUMP-101" ou matrícula
  votou: boolean;
  votou_em?: string;
}

export interface Voto {
  id: string;
  cargo_id: string;
  candidato_id: string | null; // null para nulo ou branco
  tipo: 'valido' | 'branco' | 'nulo';
  numero_digitado: string;
  created_at?: string;
}

export interface PessoaEleita {
  nome: string;
  cargo_id: string;
  cargo_nome: string;
  candidato_id?: string;
  votos: number;
  eleito_em: string;
}

export interface ConfiguracaoEleicao {
  id: string;
  titulo: string;
  igreja: string;
  subtitulo: string;
  status: 'aguardando' | 'aberta' | 'encerrada';
  exigir_codigo_eleitor: boolean;
  codigo_mesario: string;
  som_habilitado: boolean;
  modo_votacao: 'sequencial_um_por_vez' | 'todos_juntos';
  cargo_ativo_id: string; // Cargo que está sendo votado agora na urna
  eleitos: PessoaEleita[]; // Lista de pessoas já eleitas em etapas anteriores
}

export interface ApuracaoCargo {
  cargo: Cargo;
  totalVotos: number;
  votosValidos: number;
  votosBrancos: number;
  votosNulos: number;
  candidatos: {
    candidato: Candidato;
    votos: number;
    porcentagem: number;
  }[];
}
