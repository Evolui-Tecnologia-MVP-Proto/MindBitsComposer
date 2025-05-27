# Sistema de Gestão de Documentos e Workflows

Uma plataforma avançada de gestão de documentos e workflows com integração inteligente aos sistemas empresariais.

## 🚀 Características Principais

- **Gestão Inteligente de Documentos**: Sistema completo para criação, edição e organização de documentos
- **Integração Monday.com**: Sincronização automática bidirecional com quadros do Monday
- **Processamento Automatizado**: Sistema de jobs para execução de tarefas em background
- **Interface Administrativa**: Painel completo para configuração de mapeamentos e monitoramento
- **Sistema de Logs Avançado**: Rastreamento detalhado de todas as operações do sistema
- **Autenticação Segura**: Sistema de login com criptografia de senhas

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React** com TypeScript
- **Tailwind CSS** para estilização
- **Shadcn/UI** para componentes
- **Wouter** para roteamento
- **TanStack Query** para gerenciamento de estado
- **React Hook Form** para formulários
- **Framer Motion** para animações

### Backend
- **Node.js** com Express
- **TypeScript**
- **Drizzle ORM** para banco de dados
- **PostgreSQL** como banco de dados
- **Passport.js** para autenticação
- **Node-cron** para agendamento de tarefas

### Integrações
- **Monday.com API** para sincronização de dados
- **GitHub API** para versionamento de documentos
- **OpenAI** para processamento inteligente

## 📋 Funcionalidades

### Gestão de Documentos
- Criação e edição de documentos
- Sistema de versionamento
- Categorização por projetos e módulos
- Relacionamentos entre documentos

### Sincronização Monday.com
- Mapeamento flexível de colunas
- Filtros personalizáveis
- Sincronização automática agendada
- Processamento de anexos e arquivos

### Sistema de Jobs
- Execução automática de sincronizações
- Configuração de horários e frequências
- Monitoramento de status em tempo real
- Logs detalhados de execução

### Painel Administrativo
- Configuração de mapeamentos
- Gestão de usuários
- Visualização de logs do sistema
- Monitoramento de performance

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- Chaves de API do Monday.com

### Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITORIO]
cd [NOME_DO_PROJETO]
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Configure o banco de dados:
```bash
npm run db:push
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O servidor estará disponível em `http://localhost:5000`

## 📁 Estrutura do Projeto

```
├── client/src/           # Frontend React
│   ├── components/       # Componentes reutilizáveis
│   ├── pages/           # Páginas da aplicação
│   └── lib/             # Utilitários e configurações
├── server/              # Backend Node.js
│   ├── routes.ts        # Rotas da API
│   ├── auth.ts          # Sistema de autenticação
│   ├── job-manager.ts   # Gerenciador de jobs
│   └── logger.ts        # Sistema de logs
├── shared/              # Código compartilhado
│   └── schema.ts        # Esquemas do banco de dados
└── scripts/             # Scripts utilitários
```

## 🔧 Configuração

### Variáveis de Ambiente
- `DATABASE_URL`: URL de conexão com PostgreSQL
- `MONDAY_API_KEY`: Chave da API do Monday.com
- `GITHUB_TOKEN`: Token para integração GitHub
- `OPENAI_API_KEY`: Chave da API OpenAI

### Banco de Dados
O projeto utiliza Drizzle ORM com PostgreSQL. Para aplicar mudanças no schema:
```bash
npm run db:push
```

## 📊 Monitoramento

O sistema inclui:
- Logs detalhados de todas as operações
- Monitoramento de performance
- Alertas de erro em tempo real
- Dashboard administrativo

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte ou dúvidas, entre em contato através dos issues do GitHub.