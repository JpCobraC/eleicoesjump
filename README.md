# 🗳️ Sistema de Eleições da Juventude da Igreja

Sistema web completo, seguro e em tempo real para as eleições do grupo de jovens da igreja, pronto para deploy na **Vercel** e integrado ao banco de dados do **Supabase**.

Projetado especificamente para ser **projetado no telão da igreja com QR Code**, onde os jovens votam diretamente em seus smartphones, e a liderança controla a eleição etapa por etapa pelo **Painel Admin**.

---

## 🏛️ Cargos Oficiais & Regras do Pleito

O sistema segue a ordem de votação sequencial solicitada:

1. **Presidente**
2. **Vice-presidente**
3. **1º Secretário**
4. **2º Secretário**
5. **Tesoureiro**

### ⚡ Regras de Negócio Implementadas
* **1 Votação por vez (Sequencial)**: A liderança abre a votação para Presidente, os jovens votam pelo celular, o admin encerra e proclama o vencedor. Em seguida abre Vice-presidente, depois 1º Secretário, e assim sucessivamente.
* **Candidatura Multi-Cargo com Eliminação Automática**: Jovens podem se candidatar a múltiplos cargos. No entanto, assim que uma pessoa vence e é proclamada eleita em um cargo, ela se torna **automaticamente inelegível nos cargos seguintes** em todo o sistema (banco, admin, telão e celular dos votantes).
* **Votação por QR Code no Telão**: O Datashow projeta o QR Code dinâmico e o placar. Os jovens apontam a câmera do celular para o telão e votam na mesma hora.
* **Modo Suspense**: O telão pode ocultar os números de votos durante a apuração para manter o suspense do culto e revelar o vencedor com efeitos sonoros e confetes na hora da proclamação!

---

## 📱 Visão Geral das Telas e Rotas

| Rota | Descrição | Onde Usar |
| :--- | :--- | :--- |
| **`/telao`** | **Telão do Datashow do Culto**: Projeta o QR Code grande, o cargo em disputa, o status (Aberta / Encerrada) e a proclamação do vencedor com chuva de confetes. | Projetor / TV do altar |
| **`/`** | **Urna no Smartphone do Jovem**: Interface mobile-first touch. Mostra fotos, nomes e números dos candidatos da rodada aberta, botão de voto em branco, som clássico de confirmação e bloqueio de voto duplicado. | Celular dos jovens (via QR Code) |
| **`/admin`** | **Painel de Controle da Liderança**: Gerenciamento das 5 etapas da eleição, liberação de cada rodada, proclamação de eleito, zerésima e Boletim de Urna (BU). | Notebook do pastor / mesário |
| **`/admin/candidatos`** | **Cadastro de Candidatos com Fotos**: Upload de foto do celular/computador ou link web, corte automático 3:4, número da urna e seleção de múltiplos cargos com 1 clique. | Notebook da organização |
| **`/resultados`** | **Placar Geral em Tempo Real**: Visão analítica detalhada com gráfico de barras, abstenção e histórico de eleitos por cargo. | Telas de acompanhamento da equipe |
| **`/mesario`** | **Mesa Receptora / Chamada**: Lista de jovens aptos, controle de presença e liberação assistida de códigos. | Mesa de recepção na entrada |

---

## 🚀 Como Colocar no Ar (Vercel + Supabase)

### 1️⃣ Criar o Banco no Supabase (Gratuito)

1. Crie uma conta gratuita em [supabase.com](https://supabase.com).
2. Clique em **"New Project"** e escolha o nome (ex: `eleicoes-juventude`).
3. No menu lateral do Supabase, clique em **SQL Editor**.
4. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) deste repositório, copie todo o conteúdo e cole no SQL Editor.
5. Clique em **"Run"** para criar as tabelas com os 5 cargos oficiais e políticas de segurança.
6. Vá em **Project Settings** > **API** e anote:
   - **Project URL**
   - **anon / public key**

---

### 2️⃣ Fazer Deploy na Vercel (Gratuito)

1. Suba este repositório para o seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
3. Importe o repositório `eleicoesjump`.
4. Em **Environment Variables**, adicione as seguintes variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`: sua Project URL do Supabase (ex: `https://xyzcompany.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: sua chave pública do Supabase
   - `NEXT_PUBLIC_ADMIN_PIN`: `1234` *(ou a senha numérica da sua escolha)*
5. Clique em **"Deploy"**.
6. Pronto! A sua eleição estará no ar com HTTPS e alta performance.

> 💡 **Modo Offline / Sem Supabase (Fallback Inteligente)**:  
> Se você rodar sem configurar o Supabase, o sistema entra automaticamente em modo de simulação local (LocalStorage do navegador). Você pode testar todas as funcionalidades imediatamente mesmo offline!

---

## 💻 Como Rodar Localmente no seu Computador

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/eleicoesjump.git
cd eleicoesjump

# 2. Instale as dependências
npm install

# 3. (Opcional) Copie o arquivo de variáveis de ambiente
cp .env.example .env.local

# 4. Inicie o servidor
npm run dev
```

Acesse no navegador:
* Telão para o Datashow: [http://localhost:3000/telao](http://localhost:3000/telao)
* Votação Mobile: [http://localhost:3000](http://localhost:3000)
* Painel Admin: [http://localhost:3000/admin](http://localhost:3000/admin) *(PIN padrão: `1234`)*
* Cadastro de Candidatos: [http://localhost:3000/admin/candidatos](http://localhost:3000/admin/candidatos)

---

## 🎯 Passo a Passo do Dia da Eleição no Culto

1. **Antes do Culto**:
   - Abra `/admin/candidatos` e cadastre os jovens que concorrerão com suas fotos, números e cargos pretendidos.
   - No `/admin`, imprima ou salve a **Zerésima Oficial** comprovando que todos os candidatos começam com zero votos.
2. **Projetando o Telão**:
   - Conecte o notebook ao projetor/datashow e abra `/telao` em tela cheia (`F11`).
   - O telão exibirá o QR Code grande com o cargo atual.
3. **Durante a Eleição (Etapa por Etapa)**:
   - No celular ou notebook da mesa (`/admin`), clique em **"Liberar Votação para Presidente"**.
   - Os jovens apontam o celular para o QR Code no telão e votam no seu candidato ou em branco.
   - O admin encerra a votação e clica em **"Eleger Vencedor & Avançar"**.
   - O telão solta confetes e proclama o eleito!
   - Se o candidato eleito estava inscrito para Vice ou Secretário, o sistema automaticamente o elimina dessas próximas disputas.
   - O admin repete o processo para Vice, depois 1º Secretário, 2º Secretário e Tesoureiro.
4. **Finalização**:
   - Ao término do último cargo, o admin emite o **Boletim de Urna (BU)** oficial com toda a diretoria eleita para arquivo da igreja e assinatura da liderança.

---

## 🔒 Segurança e Sigilo do Voto

- O voto é gravado de forma anônima na tabela de votos (não há identificação de quem votou em qual candidato).
- Bloqueio de votos duplos na mesma rodada com token seguro de sessão por dispositivo.
- Painel administrativo e funções de encerramento protegidos por PIN.
- Sintetizador de áudio Web Audio API puro, sem dependência de conexões externas de áudio para o clássico som de confirmação da urna.
