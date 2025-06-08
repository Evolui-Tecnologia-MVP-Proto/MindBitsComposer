# EVO-MindBits Composer (CPx)

Compositor integrado para documentação técnica e empresarial, assistido por IA e para a IA. Uma plataforma avançada de sincronização de workflows empresariais que permite gerenciamento inteligente de documentos e edição colaborativa através de tecnologias de ponta.

## 🚀 Características Principais

### Editor Lexical Avançado
- **Editor Rich Text** com Lexical Framework
- **Suporte completo a imagens** com metadados e redimensionamento
- **Tabelas avançadas** com células editáveis e formatação
- **Nós personalizados** para estruturas complexas de documento
- **Sistema de templates** com mapeamento inteligente de seções
- **Conversão Markdown** bidirecional mantendo formatação
- **Salvamento local** em múltiplos formatos (Lexical JSON, Markdown)

### Integração Monday.com
- **Sincronização bidirecional** automática com quadros Monday
- **Mapeamento flexível** de colunas e campos
- **Processamento de anexos** com download e conversão automática
- **Sistema de jobs** para execução agendada
- **Filtros personalizáveis** para seleção de dados
- **Logs detalhados** de todas as operações de sincronização

### Gerenciamento de Assets
- **Global Assets** acessíveis em todo o sistema
- **Document Artifacts** vinculados a documentos específicos
- **Processamento de imagens** com conversão base64/referência
- **Upload local** com validação de tipos de arquivo
- **Metadados automáticos** (tamanho, tipo MIME, timestamps)

### Integração GitHub
- **Explorador de repositórios** com navegação em árvore
- **Sincronização de estruturas** de pastas e arquivos
- **Controle de versão** integrado ao workflow
- **Mapping de estruturas** locais com repositórios remotos

### Sistema de Fluxos de Trabalho
- **Editor visual de fluxos** com ReactFlow
- **Nós personalizados** para diferentes tipos de operações
- **Execução automatizada** de workflows documentais
- **Monitoramento em tempo real** do status de execução

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** com TypeScript para interface moderna
- **Lexical Framework** para edição rica de texto
- **Tailwind CSS 3** + **Shadcn/UI** para design system
- **Wouter** para roteamento client-side
- **TanStack Query v5** para gerenciamento de estado servidor
- **React Hook Form** + **Zod** para validação de formulários
- **Framer Motion** para animações fluidas
- **ReactFlow** para editores visuais
- **Recharts** para visualizações de dados

### Backend
- **Node.js** + **Express** com TypeScript
- **Drizzle ORM** para abstração de banco de dados
- **PostgreSQL** como banco principal
- **Passport.js** para autenticação segura
- **Node-cron** para agendamento de tarefas
- **Multer** para upload de arquivos
- **Express-session** para gerenciamento de sessões

### Integrações Externas
- **Monday.com API v2** para sincronização de dados
- **GitHub API v3** para versionamento e estruturas
- **OpenAI API** para processamento inteligente de conteúdo
- **File System Access API** para operações locais de arquivo

### Infraestrutura
- **Vite** para bundling e desenvolvimento
- **ESBuild** para compilação de produção
- **WebSockets** para comunicação em tempo real
- **PostgreSQL** com pooling de conexões

## 📋 Funcionalidades Detalhadas

### Sistema de Documentos
- **Criação e edição** com editor Lexical avançado
- **Versionamento automático** com timestamps
- **Categorização** por tags e projetos
- **Relacionamentos** entre documentos
- **Exportação** em múltiplos formatos
- **Importação** de arquivos existentes
- **Visualização** com modo preview integrado

### Sincronização Monday.com
- **Configuração de mapeamentos** com interface visual
- **Processamento de anexos** com conversão automática
- **Execução headless** para automação completa
- **Filtros avançados** por status, usuário, data
- **Logs estruturados** com rastreamento completo
- **Retry automático** em caso de falhas
- **Validação de dados** antes da sincronização

### Sistema de Jobs e Automação
- **Agendamento flexível** (diário, semanal, mensal)
- **Execução em background** sem impacto na interface
- **Monitoramento de status** em tempo real
- **Cancelamento dinâmico** de jobs ativos
- **Histórico completo** de execuções
- **Alertas automáticos** em caso de erro

### Painel Administrativo
- **Dashboard** com métricas em tempo real
- **Gestão de usuários** e permissões
- **Configuração de sistema** centralizada
- **Logs estruturados** com filtros avançados
- **Monitoramento de performance** do sistema
- **Backup e restauração** de configurações

### Canvas de Desenho Livre
- **Ferramenta de desenho** integrada
- **Formas geométricas** (círculo, quadrado, linha)
- **Paleta de cores** personalizável
- **Borracha** para correções
- **Redimensionamento** de canvas
- **Exportação** como imagem PNG
- **Importação** de imagens existentes

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 20+ (recomendado)
- PostgreSQL 14+
- Chaves de API válidas (Monday.com, GitHub, OpenAI)

### Instalação Rápida

1. **Clone do repositório:**
```bash
git clone https://github.com/Evolui-Tecnologia-MVP-Proto/MindBitsComposer.git
cd MindBitsComposer
```

2. **Instalação de dependências:**
```bash
npm install
```

3. **Configuração do banco de dados:**
```bash
# Configure a variável DATABASE_URL no ambiente
npm run db:push
```

4. **Início do desenvolvimento:**
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:5000`

### Variáveis de Ambiente Necessárias

```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/mindbitscpx
PGHOST=localhost
PGPORT=5432
PGUSER=user
PGPASSWORD=password
PGDATABASE=mindbitscpx

# Integrações Externas (opcional para desenvolvimento)
MONDAY_API_KEY=seu_token_monday
GITHUB_TOKEN=seu_token_github
OPENAI_API_KEY=seu_token_openai
```

## 📁 Arquitetura do Sistema

```
├── client/src/                    # Frontend React
│   ├── components/               # Componentes reutilizáveis
│   │   ├── ui/                  # Componentes base (Shadcn/UI)
│   │   ├── lexical/             # Nós e plugins Lexical
│   │   ├── LexicalEditor.tsx    # Editor principal
│   │   ├── SaveFileModal.tsx    # Modal de salvamento
│   │   └── FileExplorer.tsx     # Explorador de arquivos
│   ├── pages/                   # Páginas da aplicação
│   │   ├── lexical-page.tsx     # Editor de documentos
│   │   ├── documentos-page.tsx  # Gestão de documentos
│   │   ├── admin-page.tsx       # Painel administrativo
│   │   ├── fluxos-page.tsx      # Editor de workflows
│   │   └── plugins/             # Plugins e extensões
│   ├── lib/                     # Utilitários
│   │   ├── queryClient.ts       # Cliente TanStack Query
│   │   └── utils.ts             # Funções auxiliares
│   └── hooks/                   # Custom hooks React
├── server/                      # Backend Node.js
│   ├── routes.ts               # Rotas da API REST
│   ├── auth.ts                 # Sistema de autenticação
│   ├── job-manager.ts          # Gerenciador de jobs
│   ├── logger.ts               # Sistema de logs
│   ├── storage.ts              # Interface de armazenamento
│   └── db.ts                   # Configuração do banco
├── shared/                     # Código compartilhado
│   └── schema.ts               # Esquemas Drizzle + Zod
├── scripts/                    # Scripts utilitários
└── uploads/                    # Arquivos enviados pelo sistema
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Produção
npm run build        # Compila para produção
npm start           # Inicia servidor de produção

# Banco de Dados
npm run db:push     # Aplica mudanças do schema

# Verificação
npm run check       # Verificação de tipos TypeScript
```

## 📊 Monitoramento e Logs

### Sistema de Logs Estruturados
- **Event Types** categorizados por operação
- **Parâmetros detalhados** para debugging
- **User tracking** para auditoria
- **Timestamps precisos** para análise temporal
- **Filtros avançados** na interface administrativa

### Métricas Disponíveis
- **Performance** de sincronizações
- **Uso de recursos** do sistema
- **Estatísticas de usuário** e documentos
- **Taxa de sucesso** de operações
- **Tempo de resposta** das APIs

### Alertas Automáticos
- **Falhas de sincronização** com Monday.com
- **Erros de conectividade** com serviços externos
- **Problemas de performance** do banco de dados
- **Limites de API** atingidos

## 🔐 Segurança e Autenticação

### Sistema de Autenticação
- **Passport.js** com estratégia local
- **Hash de senhas** com salt seguro
- **Sessões persistentes** com PostgreSQL
- **Middleware de proteção** para rotas sensíveis

### Controle de Acesso
- **Validação** de entrada com Zod
- **Sanitização** automática de dados
- **Rate limiting** para APIs externas
- **Logs de auditoria** para ações críticas

## 🤝 Contribuição

### Processo de Desenvolvimento
1. **Fork** do repositório principal
2. **Branch** para nova feature (`feature/nome-da-feature`)
3. **Desenvolvimento** seguindo padrões do projeto
4. **Testes** locais de funcionalidade
5. **Pull Request** com descrição detalhada

### Padrões de Código
- **TypeScript** obrigatório para type safety
- **ESLint/Prettier** para formatação consistente
- **Componentes funcionais** com hooks
- **Nomenclatura semântica** para funções e variáveis

### Estrutura de Commits
```
feat: adiciona nova funcionalidade X
fix: corrige problema em Y
docs: atualiza documentação Z
refactor: melhora código sem mudança funcional
```

## 📝 Licença

Este projeto está licenciado sob **MIT License**. Consulte o arquivo `LICENSE` para detalhes completos.

## 📞 Suporte e Contato

### Canais de Suporte
- **Issues GitHub**: Para bugs e solicitações de features
- **Documentação**: Wiki do repositório para guias detalhados
- **Email**: contato@evoluitecnologia.com.br

### Informações do Projeto
- **Versão**: 1.0.0
- **Desenvolvido por**: EVO-MindBits Team
- **Organização**: Evolui Tecnologia
- **Status**: Produção ativa

---

*Sistema desenvolvido para otimizar workflows empresariais através de sincronização inteligente e edição colaborativa de documentos.*