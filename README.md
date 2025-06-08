# EVO-MindBits Composer (CPx)

**Compositor integrado para documentação técnica e empresarial, assistido por IA e para a IA.**

Uma plataforma avançada de sincronização de workflows empresariais que permite gerenciamento inteligente de documentos e edição colaborativa através de tecnologias de ponta.

## 🚀 Visão Geral do Sistema

### Arquitetura Principal
- **Frontend**: React 18 + TypeScript com interface moderna e responsiva
- **Backend**: Node.js + Express com APIs RESTful robustas
- **Banco de Dados**: PostgreSQL com Drizzle ORM para máxima performance
- **Editor**: Lexical Framework para edição rica de texto profissional
- **Integrações**: Monday.com, GitHub, OpenAI para workflows completos

### Funcionalidades Core

#### 🖋️ Editor Lexical Avançado
- **Rich Text Editing** com nós personalizados para estruturas complexas
- **Suporte completo a imagens** com redimensionamento e metadados automáticos
- **Tabelas editáveis** com células personalizáveis e formatação avançada
- **Sistema de templates** com mapeamento inteligente de seções
- **Conversão Markdown** bidirecional preservando formatação
- **Salvamento local** em múltiplos formatos (Lexical JSON, Markdown)
- **Nós colapsáveis** para organização hierárquica de conteúdo

#### 🔄 Sincronização Monday.com
- **Mapeamento flexível** entre colunas Monday e campos CPx
- **Processamento automático** de anexos com conversão para base64
- **Sistema de jobs** com agendamento configurável (diário/semanal/mensal)
- **Execução headless** para automação completa sem interface
- **Filtros avançados** por status, responsável e critérios personalizados
- **Logs estruturados** com rastreamento completo de operações
- **Retry automático** com tratamento inteligente de falhas

#### 📁 Gerenciamento de Assets
- **Global Assets**: Biblioteca centralizada acessível sistema-wide
- **Document Artifacts**: Assets vinculados a documentos específicos
- **Processamento inteligente**: Conversão automática base64/referência
- **Upload local** com validação rigorosa de tipos MIME
- **Metadados automáticos**: Tamanho, tipo, timestamps e relacionamentos
- **Organização por tags**: Sistema flexível de categorização

#### 🔗 Integração GitHub
- **Explorador de repositórios** com navegação em árvore interativa
- **Sincronização de estruturas** entre repositórios remotos e locais
- **Mapeamento hierárquico** de pastas e arquivos
- **Controle de versão** integrado ao workflow documental
- **Status de sincronização** em tempo real

#### 📊 Sistema de Fluxos Documentais
- **Editor visual** baseado em ReactFlow para workflows complexos
- **Nós especializados**: Start, Task, Decision, Elaborate, Approve, Revise, End
- **Execução automatizada** com monitoramento de status em tempo real
- **Transferência de fluxos** entre documentos
- **Biblioteca de fluxos** reutilizáveis para padronização

#### 🛠️ Plugins e Extensões
- **Canvas de desenho livre** com formas geométricas e exportação PNG
- **Sistema de plugins** extensível com tipos categorizados
- **Configuração dinâmica** por plugin com persistência
- **Gerenciamento de dependências** e permissões

## 🛠️ Stack Tecnológico Completo

### Frontend React
```javascript
React 18.3.1             // Interface moderna com hooks
TypeScript 5.6.3         // Type safety completo
Lexical 0.31.2           // Editor de texto avançado
Tailwind CSS 3.4         // Styling utilitário
Shadcn/UI               // Componentes design system
Wouter 3.3.5            // Roteamento client-side
TanStack Query 5.60.5    // Estado servidor e cache
React Hook Form 7.55     // Formulários com validação
Framer Motion 11.13      // Animações fluidas
ReactFlow 11.11         // Editor visual de fluxos
Recharts 2.15           // Visualizações de dados
```

### Backend Node.js
```javascript
Node.js + Express 4.21   // Servidor HTTP robusto
TypeScript               // Desenvolvimento type-safe
Drizzle ORM 0.39        // Abstração de banco moderna
PostgreSQL              // Banco relacional principal
Passport.js 0.7         // Autenticação estratégica
Node-cron 4.0           // Agendamento de tarefas
Multer 2.0              // Upload de arquivos
Express-session 1.18    // Gerenciamento de sessões
WebSockets 8.18         // Comunicação tempo real
```

### Integrações Externas
```javascript
Monday.com API v2       // Sincronização de dados empresariais
GitHub API v3           // Controle de versão e estruturas
OpenAI API 4.102        // Processamento IA de conteúdo
File System Access API  // Operações locais de arquivo
```

### Infraestrutura e Build
```javascript
Vite 5.4.14             // Bundling e desenvolvimento
ESBuild 0.25            // Compilação otimizada
PostgreSQL 14+          // Banco com pooling de conexões
Drizzle Kit 0.30        // Migrações de schema
```

## 📋 Estrutura de Banco de Dados

### Tabelas Principais
- **users**: Usuários com roles (ADMIN, EDITOR, USER) e status
- **lexicalDocuments**: Documentos do editor com conteúdo serializado
- **templates**: Templates estruturais e de output para documentos
- **mondayMappings**: Configurações de sincronização Monday.com
- **documentos**: Sistema empresarial de documentação
- **documentsArtifacts**: Assets vinculados a documentos específicos
- **globalAssets**: Biblioteca centralizada de assets
- **documentsFlows**: Fluxos de trabalho documentais visuais
- **documentFlowExecutions**: Execuções de fluxos com status tracking
- **repoStructure**: Estruturas de repositórios GitHub mapeadas
- **systemLogs**: Logs estruturados para auditoria e debugging
- **plugins**: Sistema extensível de plugins e integrações

### Relacionamentos Complexos
- **Hierarquia de repositórios**: Auto-referenciamento para estruturas aninhadas
- **Fluxos documentais**: Relacionamento n:n entre documentos e workflows
- **Assets multiuso**: Compartilhamento entre documentos e sistema global
- **Logs auditáveis**: Rastreamento de ações por usuário e timestamp

## 🚀 Instalação e Setup

### Pré-requisitos
```bash
Node.js 20+             # Runtime recomendado
PostgreSQL 14+          # Banco de dados principal
Git                     # Controle de versão
```

### Instalação Rápida
```bash
# 1. Clone do repositório
git clone https://github.com/Evolui-Tecnologia-MVP-Proto/MindBitsComposer.git
cd MindBitsComposer

# 2. Instalação de dependências
npm install

# 3. Configuração do banco
npm run db:push

# 4. Início do desenvolvimento
npm run dev
```

### Variáveis de Ambiente
```env
# Database (obrigatório)
DATABASE_URL=postgresql://user:password@localhost:5432/mindbitscpx
PGHOST=localhost
PGPORT=5432
PGUSER=user
PGPASSWORD=password
PGDATABASE=mindbitscpx

# Integrações (opcional para desenvolvimento)
MONDAY_API_KEY=seu_token_monday_com
GITHUB_TOKEN=seu_token_github
OPENAI_API_KEY=sua_chave_openai
```

## 📁 Arquitetura de Diretórios

```
MindBitsComposer/
├── client/src/                     # Frontend React Application
│   ├── components/                 # Componentes reutilizáveis
│   │   ├── ui/                    # Shadcn/UI components base
│   │   ├── lexical/               # Nós e plugins Lexical
│   │   │   ├── ImageNode.tsx      # Nó de imagem básico
│   │   │   ├── ImageWithMetadataNode.tsx  # Nó de imagem avançado
│   │   │   ├── CollapsibleNode.tsx        # Nós colapsáveis
│   │   │   └── TablePlugin.tsx    # Plugin de tabelas
│   │   ├── documentos/            # Sistema de documentos
│   │   │   ├── modals/           # Modais especializados
│   │   │   ├── tables/           # Tabelas de dados
│   │   │   └── tabs/             # Abas organizacionais
│   │   ├── fluxos/               # Sistema de workflows
│   │   │   ├── nodes/            # Nós especializados ReactFlow
│   │   │   └── FlowDiagram.tsx   # Editor visual principal
│   │   ├── LexicalEditor.tsx     # Editor principal
│   │   ├── SaveFileModal.tsx     # Modal de salvamento
│   │   └── FileExplorer.tsx      # Explorador GitHub
│   ├── pages/                    # Páginas da aplicação
│   │   ├── lexical-page.tsx      # Editor de documentos
│   │   ├── documentos-page.tsx   # Gestão empresarial
│   │   ├── admin-page.tsx        # Painel administrativo
│   │   ├── fluxos-page.tsx       # Editor de workflows
│   │   ├── templates-page.tsx    # Gestão de templates
│   │   ├── plugins-page.tsx      # Gerenciamento de plugins
│   │   └── plugins/              # Plugins individuais
│   ├── lib/                      # Utilitários e configurações
│   │   ├── queryClient.ts        # Cliente TanStack Query
│   │   └── utils.ts              # Funções auxiliares
│   └── hooks/                    # Custom hooks React
├── server/                       # Backend Node.js
│   ├── routes.ts                 # Rotas API REST completas
│   ├── auth.ts                   # Sistema de autenticação
│   ├── job-manager.ts            # Gerenciador de jobs cron
│   ├── logger.ts                 # Sistema de logs estruturados
│   ├── storage.ts                # Interface de armazenamento
│   ├── db.ts                     # Configuração Drizzle + PostgreSQL
│   ├── index.ts                  # Servidor Express principal
│   └── vite.ts                   # Integração Vite SSR
├── shared/                       # Código compartilhado
│   └── schema.ts                 # Schemas Drizzle + Zod completos
├── scripts/                      # Scripts utilitários
│   └── generate-password.ts     # Gerador de senhas hash
├── uploads/                      # Arquivos temporários upload
└── attached_assets/              # Assets anexados pelo usuário
```

## 🔧 Scripts de Desenvolvimento

```bash
# Desenvolvimento
npm run dev              # Servidor completo (backend + frontend)
npm run check            # Verificação TypeScript

# Produção
npm run build            # Build otimizado para produção
npm start                # Servidor de produção

# Banco de Dados
npm run db:push          # Aplicar mudanças de schema
```

## 📊 Sistema de Monitoramento

### Logs Estruturados
- **Event Types**: USER_ACTION, DOCUMENT_ACTION, MONDAY_SYNC, GITHUB_SYNC, SYSTEM_ERROR
- **Parâmetros detalhados**: Contexto completo para debugging
- **User tracking**: Auditoria completa de ações por usuário
- **Timestamps precisos**: Análise temporal de operações
- **Filtros avançados**: Interface administrativa para análise

### Métricas de Performance
- **Sincronizações Monday**: Taxa de sucesso e tempo médio
- **Uso de recursos**: CPU, memória e I/O do sistema
- **Estatísticas documentais**: Criação, edição e visualização
- **APIs externas**: Latência e rate limiting
- **Fluxos de trabalho**: Execução e completion rate

### Alertas Automáticos
- **Falhas de sincronização**: Monday.com connectivity issues
- **Erros de API**: GitHub, OpenAI rate limits e timeouts
- **Performance degradation**: Slow queries e memory leaks
- **Autenticação**: Failed login attempts e security events

## 🔐 Segurança e Compliance

### Autenticação Robusta
- **Passport.js local strategy**: Username/password seguro
- **Password hashing**: SHA-512 com salt único por usuário
- **Session persistence**: PostgreSQL store para escalabilidade
- **Middleware protection**: Rotas protegidas por role-based access

### Validação e Sanitização
- **Zod validation**: Entrada validada em todos os endpoints
- **SQL injection prevention**: Drizzle ORM parametrized queries
- **XSS protection**: Sanitização automática de inputs
- **File upload security**: Validação MIME type e size limits

### Auditoria Completa
- **System logs**: Todas as ações críticas registradas
- **User activity tracking**: Login, logout, document changes
- **API access logs**: Rate limiting e usage patterns
- **Error tracking**: Stack traces e context preservation

## 🤝 Contribuição e Desenvolvimento

### Workflow de Contribuição
1. **Fork** do repositório principal no GitHub
2. **Feature branch** seguindo convenção `feature/nome-da-funcionalidade`
3. **Desenvolvimento** com testes locais obrigatórios
4. **Pull Request** com descrição detalhada e screenshots
5. **Code Review** pela equipe técnica

### Padrões de Código
- **TypeScript strict mode**: Type safety obrigatório
- **Functional components**: Hooks sobre class components
- **Naming conventions**: camelCase para variáveis, PascalCase para componentes
- **Comment standards**: JSDoc para funções públicas
- **Git commits**: Conventional commits format

### Estrutura de Commits
```bash
feat: adiciona sistema de plugins extensível
fix: corrige upload de imagens grandes
docs: atualiza documentação da API Monday
refactor: otimiza queries de sincronização
perf: melhora performance do editor Lexical
test: adiciona testes para fluxos documentais
```

## 📈 Roadmap e Evolução

### Próximas Funcionalidades
- **Colaboração em tempo real**: Edição simultânea de documentos
- **Versionamento avançado**: Git-like branching para documentos
- **AI Assistant**: Integração OpenAI para sugestões contextuais
- **Mobile app**: Aplicativo nativo para iOS/Android
- **Advanced analytics**: Dashboard executivo com KPIs

### Melhorias Planejadas
- **Performance optimization**: Lazy loading e code splitting
- **Offline support**: Service workers e sync quando reconectar
- **Integração Slack/Teams**: Notificações e comandos inline
- **API pública**: SDK para integrações de terceiros
- **Docker deployment**: Containerização para produção

## 📝 Licença e Suporte

### Licenciamento
Este projeto está licenciado sob **MIT License**, permitindo uso comercial e modificação com atribuição adequada.

### Canais de Suporte
- **GitHub Issues**: Bugs reports e feature requests
- **Email**: contato@evoluitecnologia.com.br
- **Documentação**: Wiki completa no repositório

### Informações do Projeto
- **Versão atual**: 1.0.0 (Production Ready)
- **Desenvolvido por**: EVO-MindBits Team
- **Organização**: Evolui Tecnologia LTDA
- **Status**: Produção ativa com atualizações regulares

---

**Sistema desenvolvido para otimizar workflows empresariais através de sincronização inteligente e edição colaborativa de documentos técnicos e empresariais.**