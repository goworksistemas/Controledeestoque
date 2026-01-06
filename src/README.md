# 🏢 Gowork - Sistema de Controle de Estoque

Sistema interno completo de gerenciamento de estoque e movimentação de móveis para as unidades Gowork.

## 📋 Índice

- [Sobre o Sistema](#sobre-o-sistema)
- [Perfis de Usuário](#perfis-de-usuário)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Fluxos Operacionais](#fluxos-operacionais)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Setup e Instalação](#setup-e-instalação)
- [Segurança](#segurança)

---

## 🎯 Sobre o Sistema

O **Gowork Sistema de Estoque** é uma aplicação web completa desenvolvida para gerenciar o controle de estoque de móveis e materiais nas unidades Gowork. O sistema está em produção com foco inicial nas unidades **Paulista 302** e **Paulista 475**, mas preparado para escalar para todas as 11 unidades.

### Características Principais

- ✅ **100% Responsivo** - Interface mobile-first otimizada para operação em campo
- ✅ **Dark Mode** - Suporte completo a tema escuro/claro
- ✅ **Auditoria Completa** - Log master de todas as movimentações
- ✅ **QR Code** - Entregas e confirmações via QR Code
- ✅ **Tempo Real** - Sincronização instantânea com banco de dados
- ✅ **Multi-perfil** - 6 perfis distintos com permissões específicas

### Design System

Seguimos o **brandbook oficial da Gowork**:

| Cor | Hex | Uso |
|-----|-----|-----|
| 🎨 Festival da Ópera | `#3F76FF` | Cor primária |
| 🎨 Pelourinho | `#00C5E9` | Cor secundária |
| 🎨 Cinza Profundo | `#606060` | Cor de apoio |

---

## 👥 Perfis de Usuário

### 1. 🔧 **Developer**
**Acesso total ao sistema** - Gerenciamento completo de dados e configurações.

**Funcionalidades:**
- Gestão de usuários (criar, editar, redefinir senha)
- Gestão de unidades e andares
- Gestão de itens e móveis
- Acesso ao painel administrativo completo
- Migrações de dados
- Logs de sistema

**Localização:** Dashboard Developer → Todas as abas

---

### 2. 👨‍💼 **Admin (Controlador)**
**Gestão operacional e aprovações** - Controla solicitações e transferências.

**Funcionalidades:**
- Aprovar/rejeitar solicitações de móveis
- Aprovar/rejeitar transferências entre unidades
- Visualizar histórico completo de movimentações
- Acessar analytics e relatórios
- Exportar relatórios em CSV
- Gerenciar estoque de móveis por unidade

**Localização:** Dashboard Admin → Abas: Solicitações, Transferências, Analytics

**Fluxos:**
1. **Aprovação de Solicitação:**
   - Revisa solicitação pendente
   - Aprova ou rejeita (com justificativa)
   - Sistema notifica almoxarifado

2. **Aprovação de Transferência:**
   - Revisa transferência solicitada
   - Aprova ou rejeita
   - Sistema atualiza status para "Aguardando Coleta"

---

### 3. 📦 **Almoxarifado (Warehouse)**
**Gestão de estoque central** - Controla entrada, saída e entregas.

**Funcionalidades:**
- Gerenciar estoque de materiais
- Processar solicitações aprovadas
- Criar entregas em lote
- Receber móveis retirados (para armazenagem/descarte)
- Adicionar/consumir itens do estoque
- Visualizar timeline de movimentações

**Localização:** Dashboard Almoxarifado → Abas: Estoque, Solicitações, Entregas

**Fluxos:**
1. **Processar Solicitação:**
   - Vê solicitações aprovadas pelo Admin
   - Cria entrega (individual ou em lote)
   - Gera QR Code para motorista

2. **Criar Entrega em Lote:**
   - Seleciona múltiplas solicitações
   - Atribui motorista
   - Gera QR Code único do lote

3. **Receber Móveis Retirados:**
   - Confirma recebimento de móveis removidos
   - Atualiza estoque (se armazenagem)
   - Finaliza ciclo de retirada

---

### 4. 🎨 **Designer**
**Avaliação de retiradas** - Decide destino de móveis removidos.

**Funcionalidades:**
- Avaliar solicitações de retirada de móveis
- Aprovar para armazenagem
- Aprovar para descarte (com justificativa)
- Rejeitar retirada
- Visualizar histórico de avaliações

**Localização:** Dashboard Designer → Aba: Retiradas Pendentes

**Fluxo:**
1. **Avaliar Retirada:**
   - Revisa solicitação de retirada
   - Decide:
     - ✅ **Armazenar** - Móvel volta ao almoxarifado
     - ✅ **Descartar** - Móvel será descartado (exige justificativa)
     - ❌ **Rejeitar** - Móvel permanece na unidade

---

### 5. 🚚 **Motorista (Driver)**
**Entregas e confirmações** - Responsável por transportar e entregar.

**Funcionalidades:**
- Visualizar entregas atribuídas
- Confirmar entrega via QR Code
- Marcar entrega como pendente (se destinatário ausente)
- Timeline de entregas
- Status de cada entrega do lote

**Localização:** Dashboard Motorista

**Fluxos:**
1. **Entrega via QR Code (Confirmação Imediata):**
   - Abre câmera do celular
   - Escaneia QR Code do recebedor
   - Sistema valida código único do dia
   - Confirma entrega automaticamente

2. **Entrega Pendente (Confirmação Posterior):**
   - Marca como "Pendente" se recebedor ausente
   - Admin recebe notificação
   - Admin confirma manualmente após

---

### 6. 📝 **Solicitante (Requester)**
**Solicitações e recebimentos** - Usuários finais das unidades.

**Funcionalidades:**
- Solicitar móveis para sua unidade
- Solicitar retirada de móveis
- Gerar QR Code pessoal para recebimento
- Confirmar recebimento de entregas
- Visualizar histórico de solicitações

**Localização:** Dashboard Solicitante → Abas: Solicitar, Minhas Solicitações

**Fluxos:**
1. **Solicitar Móvel:**
   - Seleciona item e quantidade
   - Especifica local (unidade + andar)
   - Aguarda aprovação do Admin
   - Recebe notificação de entrega

2. **Receber Entrega:**
   - Abre QR Code pessoal (código do dia)
   - Motorista escaneia
   - Confirma recebimento instantâneo

3. **Solicitar Retirada:**
   - Indica móvel a ser retirado
   - Especifica motivo
   - Designer avalia
   - Almoxarifado agenda coleta

---

## 🔄 Funcionalidades Principais

### 1. 📊 Log Master de Movimentações

Sistema completo de auditoria que registra **todas** as ações no sistema.

**Tipos de Registro:**
- ✅ Movimentações de estoque (entrada/saída)
- ✅ Solicitações (criação, aprovação, rejeição, entrega)
- ✅ Transferências (solicitação, aprovação, conclusão)
- ✅ Retiradas (solicitação, avaliação designer, recebimento)
- ✅ Entregas em lote (criação, entrega)

**Informações Capturadas:**
- 📅 Data e hora exata
- 👤 Usuário responsável pela ação
- 🏷️ Perfil do usuário
- 📦 Item/móvel movimentado
- 🔢 Quantidade
- 📍 Unidade/Local (origem e destino)
- ✅ Status traduzido
- 📝 Detalhes completos da ação

**Funcionalidades do Log:**
- 🔍 Filtros por período (7d, 30d, 90d, tudo)
- 🎯 Filtro por tipo de ação
- 🔎 Busca em tempo real
- 📊 Gráfico de barras com distribuição
- 📥 Exportação para CSV

---

### 2. 🎯 Sistema de QR Code

#### QR Code Pessoal (Código do Dia)
Cada solicitante possui um **código único diário** para recebimento seguro.

**Características:**
- 🔄 Renovado automaticamente a cada dia
- 🔒 Único e vinculado ao usuário
- ⏰ Válido apenas no dia atual
- 📱 Acessível via dashboard

**Uso:**
1. Solicitante gera QR Code
2. Motorista escaneia com celular
3. Sistema valida código
4. Confirma entrega instantaneamente

#### QR Code de Lote
Para entregas múltiplas, o almoxarifado gera um QR Code de lote.

**Características:**
- 📦 Agrupa múltiplas solicitações
- 🚚 Vinculado a um motorista
- 📋 Lista todas as entregas do lote
- ✅ Rastreamento individual por item

---

### 3. 🔄 Fluxo Completo de Móveis

#### Solicitação → Aprovação → Entrega
```
Solicitante         Admin           Almoxarifado      Motorista       Solicitante
    |                |                   |                |               |
    |--Solicita----->|                   |                |               |
    |                |---Aprova--------->|                |               |
    |                |                   |--Cria Entrega->|               |
    |                |                   |                |--Escaneia QR->|
    |                |                   |                |               |--Recebe
```

#### Retirada → Avaliação → Armazenagem/Descarte
```
Solicitante       Designer        Almoxarifado
    |                |                 |
    |--Retirada----->|                 |
    |                |--Avalia-------->|
    |                |  (Armazenar     |--Recebe + Estoca
    |                |   ou Descartar) |
```

---

### 4. 📈 Analytics e Relatórios

Dashboard completo para gestão e tomada de decisão.

**Métricas Disponíveis:**
- 📊 Total de movimentações por período
- 📦 Distribuição por tipo de ação
- 🏢 Atividade por unidade
- 👤 Ações por usuário
- ⏱️ Tempo médio de aprovação
- 📈 Tendências de consumo

**Relatórios Exportáveis:**
- 📥 CSV completo do log master
- 📊 Relatório de estoque por unidade
- 📋 Histórico de solicitações
- 🚚 Relatório de entregas

---

## 🛠️ Tecnologias

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones
- **Sonner** - Notificações toast
- **React Router** - Navegação

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL (banco de dados)
  - Edge Functions (Hono + Deno)
  - Auth (autenticação)
  - Storage (armazenamento)
  - Realtime (sincronização)

### Arquitetura
```
Frontend (React) 
    ↓
Edge Function (Hono Server)
    ↓
PostgreSQL Database (Supabase)
```

---

## 📁 Estrutura do Projeto

```
/
├── components/               # Componentes React
│   ├── ui/                  # Componentes de UI base
│   ├── *Dashboard.tsx       # Dashboards por perfil
│   ├── *Dialog.tsx          # Modais e dialogs
│   └── *Panel.tsx           # Painéis específicos
│
├── contexts/
│   └── AppContext.tsx       # Context global (usuários, estoque, etc)
│
├── hooks/
│   └── useInactivityLogout.ts  # Hook de logout automático
│
├── supabase/
│   └── functions/server/
│       ├── index.tsx        # Servidor Hono
│       └── kv_store.tsx     # Utilitário key-value store
│
├── types/
│   └── index.ts             # Definições TypeScript
│
├── utils/
│   ├── api.ts               # Cliente API
│   ├── auth.ts              # Autenticação
│   ├── dailyCode.ts         # Gerador de código diário
│   └── supabase/            # Cliente Supabase
│
├── styles/
│   └── globals.css          # Estilos globais + tokens
│
└── App.tsx                  # Componente raiz
```

---

## 🚀 Setup e Instalação

### Pré-requisitos
- Node.js 18+
- Conta Supabase

### Variáveis de Ambiente
O sistema requer as seguintes variáveis (já configuradas):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

### Schema do Banco de Dados

#### Tabela: `kv_store_46b247d8`
Tabela key-value para armazenamento genérico.

```sql
CREATE TABLE kv_store_46b247d8 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `units`
Unidades Gowork.

```sql
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `floors`
Andares por unidade.

```sql
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Chaves no KV Store

| Key | Tipo | Descrição |
|-----|------|-----------|
| `users` | Array | Todos os usuários |
| `items` | Array | Catálogo de itens/móveis |
| `movements` | Array | Movimentações de estoque |
| `requests` | Array | Solicitações de móveis |
| `furniture_transfers` | Array | Transferências entre unidades |
| `furniture_removal_requests` | Array | Solicitações de retirada |
| `delivery_batches` | Array | Lotes de entrega |
| `delivery_confirmations` | Array | Confirmações de entrega |
| `furniture_stock` | Array | Estoque de móveis por unidade |
| `unit_stocks` | Array | Estoque de materiais por unidade |

---

## 🔐 Segurança

### Autenticação
- Login via email + senha
- Sessões gerenciadas pelo Supabase Auth
- Logout automático por inatividade (30 minutos)
- Redefinição de senha via Admin (Developer)

### Permissões
Cada perfil possui acesso restrito às suas funcionalidades:

| Funcionalidade | Developer | Admin | Almox | Designer | Motorista | Solicitante |
|----------------|-----------|-------|-------|----------|-----------|-------------|
| Gestão de usuários | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestão de unidades | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Aprovar solicitações | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestão de estoque | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Criar entregas | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Avaliar retiradas | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Confirmar entregas | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Solicitar móveis | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Analytics | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### QR Code Security
- Códigos diários únicos por usuário
- Validação de timestamp (apenas dia atual)
- Algoritmo: `SHA-256(userId + date + secret)`
- Renovação automática meia-noite

### Auditoria
- Log master registra **todas** as ações
- Impossível deletar registros de log
- Rastreamento completo: quem, quando, o quê
- Exportação para compliance

---

## 📱 Mobile First

O sistema foi desenvolvido com **mobile-first approach**:

- ✅ Interface otimizada para telas pequenas
- ✅ Botões grandes e tocáveis
- ✅ Câmera nativa para QR Code
- ✅ Layouts responsivos
- ✅ Performance otimizada
- ✅ PWA ready (pode ser instalado no celular)

---

## 🎨 Design System

### Cores Principais
```css
--festival-da-opera: #3F76FF;  /* Primary */
--pelourinho: #00C5E9;         /* Secondary */
--cinza-profundo: #606060;     /* Gray */
```

### Tipografia
- **Font:** System fonts (optimal performance)
- **Scales:** Tailwind default (text-sm, text-base, text-lg, etc.)

### Componentes UI
Biblioteca completa de componentes em `/components/ui/`:
- Buttons, Cards, Dialogs, Tables
- Badges, Alerts, Tooltips
- Forms, Inputs, Selects
- Charts, Timelines, Accordions

---

## 🚦 Status do Sistema

### ✅ **100% Funcional**

#### Módulos Completos:
- [x] Autenticação e gestão de usuários
- [x] Sistema de perfis e permissões
- [x] Gestão de unidades e andares
- [x] Catálogo de itens e móveis
- [x] Controle de estoque (materiais + móveis)
- [x] Solicitações de móveis
- [x] Transferências entre unidades
- [x] Retiradas e avaliação por designer
- [x] Sistema de entregas e QR Code
- [x] Entregas em lote
- [x] Log master de auditoria
- [x] Analytics e relatórios
- [x] Exportação CSV
- [x] Dark mode
- [x] Responsividade mobile

#### Features Avançadas:
- [x] Timeline de movimentações
- [x] Histórico completo por unidade
- [x] Código único diário (QR)
- [x] Logout automático por inatividade
- [x] Notificações toast
- [x] Validações em tempo real
- [x] Sincronização instantânea

---

## 📞 Suporte

Para dúvidas ou suporte, contate o time de desenvolvimento.

---

## 📄 Licença

© 2024 Gowork. Todos os direitos reservados.
Sistema proprietário de uso interno.

---

**Desenvolvido com ❤️ para Gowork**
