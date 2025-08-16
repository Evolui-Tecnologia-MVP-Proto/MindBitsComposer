# EVO-MindBits Composer (CPx)

**Compositor integrado para documentação técnica e empresarial, assistido por IA e para a IA.**

Uma plataforma avançada de sincronização de workflows empresariais que permite gerenciamento inteligente de documentos e edição colaborativa através de tecnologias de ponta.

## 📚 Documentação Completa das Páginas da Aplicação

### Índice de Páginas
1. [Página Principal (Home)](#1-página-principal-home)
2. [Página de Documentos](#2-página-de-documentos)
3. [Página de Administração](#3-página-de-administração)
4. [Página de Templates](#4-página-de-templates)
5. [Página de Fluxos](#5-página-de-fluxos)
6. [Página do Editor Lexical](#6-página-do-editor-lexical)
7. [Página de Plugins](#7-página-de-plugins)
8. [Página de Configurações](#8-página-de-configurações)
9. [Página de Cadastros Gerais](#9-página-de-cadastros-gerais)
10. [Página de Preferências](#10-página-de-preferências)
11. [Página de Editor](#11-página-de-editor)
12. [Página de Autenticação](#12-página-de-autenticação)

---

## 1. Página Principal (Home)
**Rota:** `/`  
**Menu:** Principal  
**Descrição:** Dashboard principal com visão geral dos documentos e processos em andamento.

### Componentes e Controles

#### Sistema de Tabs Principal
- **Revisões CT → RAG**: Documentos pendentes de revisão do sistema CT para RAG
- **Triagem**: Documentos em processo de triagem
- **Projetos**: Documentos relacionados a projetos
- **Elicitações DEV**: Documentos de elicitação para desenvolvimento

**Controle de Expansão/Colapso:**
- Cada tab possui botão chevron (↓/↑) para expandir/colapsar conteúdo
- Estado persistente durante navegação entre tabs

#### Cards de Estatísticas (Base de Conhecimento)
- **Card "A Revisar"**
  - Exibe total de documentos MindBits_CT com status "Integrado"
  - Inclui linha adicional "X na minha alçada" mostrando documentos da responsabilidade do usuário logado
  - Ícone: Clock
  - Cor: Azul
  
- **Card "Em Revisão"**  
  - Total de documentos com status "Em Processo"
  - Ícone: AlertCircle
  - Cor: Amarelo
  
- **Card "Finalizados"**
  - Total de documentos com status "Concluído"
  - Ícone: CheckCircle2
  - Cor: Verde

#### Tabela "Meus Documentos em Processo"
**Componente:** DocsProcessEmbed
**Condições de exibição:** Sempre visível quando há documentos

**Colunas:**
- **Título**: Nome do documento
- **Responsável**: Código da especialidade responsável
- **Data Criação**: Formato DD/MM/AAAA HH:MM
- **Tsk.Status**: Badge colorido com status da task
  - Verde: "OK"
  - Amarelo: "Working" 
  - Vermelho: "Need Action"
- **Ações**: Botão "Iniciar Documentação"

**Filtros disponíveis:**
- Por responsável (dropdown)
- Botão "Limpar Filtros" (ícone FilterX)

### Modais

#### DocumentReviewModal
**Gatilho:** Botão "Revisar" em documentos elegíveis
**Condições:** 
- Documento deve ter origem "MindBits_CT"
- Status deve ser "Integrado"
- Usuário deve ter especialidade correspondente

**Funcionalidades:**
- Seleção múltipla de documentos
- Limite configurável por revisor (MAX_ITEMS_PER_REVISOR)
- Atribuição automática ao revisor

---

## 2. Página de Documentos
**Rota:** `/documentos`  
**Menu:** Documentos  
**Descrição:** Gerenciamento completo de documentos com múltiplas visões e operações.

### Sistema de Tabs

#### Tab "Incluídos"
**Filtros:**
- origem = "CPx"
- status = "Incluído"

#### Tab "Integrados" 
**Filtros:**
- origem = "MindBits_CT"
- status = "Integrado"

#### Tab "Em Processo"
**Componente:** DocsProcessEmbed
**Funcionalidades especiais:**
- Exibe documentos com execuções de fluxo ativas
- Integração com sistema de workflows

#### Tab "GitHub"
**Componente:** GitHubTab
**Funcionalidades:**
- Explorador de arquivos do repositório
- Upload/download de documentos
- Sincronização com estrutura remota

### Controles Principais

#### Barra de Ferramentas
- **Botão "Novo Documento"** (ícone Plus)
  - Abre CreateDocumentModal
  - Sempre habilitado
  
- **Botão "Filtros"** (ícone Filter/FilterX)
  - Alterna painel de filtros
  - Muda ícone conforme estado

#### Tabela de Documentos (DocumentosTable)

**Colunas padrão:**
- Checkbox para seleção múltipla
- ID
- Origem
- Objeto  
- Tipo
- Cliente
- Responsável
- Sistema
- Módulo
- Status
- Anexos (contador)
- Ações

**Ações por linha:**
- **Visualizar** (ícone Eye): Abre ViewDocumentModal
- **Editar** (ícone Pencil): Abre EditDocumentModal
- **Anexos** (ícone Paperclip): Abre AddArtifactModal
- **Documentar** (ícone BookOpen): Abre DocumentationModal
- **Excluir** (ícone Trash): Abre DeleteConfirmDialog

**Condições das ações:**
- Documentar: Disponível apenas para documentos com status diferente de "Concluído"
- Excluir: Sempre disponível, mas requer confirmação
- Anexos: Sempre disponível

### Modais de Documentos

#### CreateDocumentModal
**Tabs internas:**
- **Dados Gerais**: Campos obrigatórios do documento
- **Escopo**: Sistema, módulo, detalhamento (colapsível)
- **Pessoas**: Solicitante, aprovador, agente (colapsível)

**Validações:**
- Todos os campos de "Dados Gerais" são obrigatórios
- Origem sempre "CPx" para novos
- Status inicial sempre "Incluído"

#### EditDocumentModal
**Funcionalidades:**
- Carrega dados existentes
- Permite edição de todos os campos
- Validação em tempo real

#### ViewDocumentModal
**Modo:** Somente leitura
**Exibe:**
- Todos os campos do documento
- Lista de anexos
- Metadados (datas, IDs)

#### DocumentationModal
**Componente complexo com:**
- Editor Lexical integrado
- Sistema de templates
- Mapeamento de campos
- Salvamento automático
- Conversão Markdown

**Condições especiais:**
- Cria document_edition ao abrir
- Rastreia flux_node_id se iniciado de fluxo
- Atualiza status do documento

#### AddArtifactModal
**Tipos de anexo:**
- Upload de arquivo local
- Seleção de asset global
- Limite de tamanho: 10MB

**Validações:**
- Verificação de tipo MIME
- Conversão automática para base64
- Metadados automáticos

#### DeleteConfirmDialog
**Proteções:**
- Confirmação dupla
- Exibe nome do documento
- Operação irreversível

---

## 3. Página de Administração
**Rota:** `/admin`  
**Menu:** Admin  
**Descrição:** Painel administrativo com gestão de usuários, integrações e sistema.

### Sistema de Tabs

#### Tab "Usuários"
**Componente:** UserTable
**Funcionalidades:**
- CRUD completo de usuários
- Gestão de permissões
- Reset de senha
- Associação com especialidades

#### Tab "Monday Sync"
**Seções:**
- **Mapeamentos de Quadros**
  - Lista de integrações Monday.com
  - Status de sincronização
  - Configuração de colunas
  
- **Jobs Agendados**
  - Badge de status (Ativo/Inativo)
  - Frequência e horário
  - Última execução

**Controles:**
- Botão "Novo Mapeamento"
- Botão "Executar Agora" (ícone Play)
- Botão "Editar" por linha
- Botão "Excluir" com confirmação

#### Tab "Logs do Sistema"
**Filtros:**
- Por tipo de evento
- Por período
- Por usuário

**Colunas:**
- Timestamp
- Tipo de evento
- Mensagem
- Usuário
- Parâmetros (JSON)

### Modais Administrativos

#### Modal de Mapeamento Monday
**Campos:**
- Nome do mapeamento
- ID do quadro
- Descrição
- Filtros (JSON)
- Valores padrão

**Aba de Colunas:**
- Mapeamento coluna Monday → campo CPx
- Função de transformação
- Campo chave (checkbox)

#### Modal de Agendamento
**Campos:**
- Frequência (Diário/Semanal/Mensal)
- Horário de execução
- Dias da semana (se semanal)
- Dia do mês (se mensal)

#### Modal de Conexões de Serviço
**Serviços suportados:**
- Monday.com
- GitHub
- OpenAI

**Validações:**
- Token obrigatório
- Teste de conexão disponível

---

## 4. Página de Templates
**Rota:** `/templates`  
**Menu:** Templates  
**Descrição:** Gerenciamento de templates estruturais e de saída.

### Sistema de Tabs

#### Tab "Templates Estruturais"
**Tipo:** struct
**Uso:** Define estrutura de documentos

#### Tab "Templates de Saída"
**Tipo:** output
**Uso:** Define formato de exportação

### Cards de Template
**Informações exibidas:**
- Nome e código
- Descrição
- Data de criação
- Ações (Editar, Duplicar, Excluir)

**Ações:**
- **Duplicar** (ícone Copy): Cria cópia com sufixo
- **Editar** (ícone Edit): Abre TemplateFormModal
- **Excluir** (ícone Trash2): Requer confirmação

### TemplateFormModal
**Campos:**
- Nome (obrigatório)
- Código (único)
- Descrição
- Tipo (struct/output)
- Estrutura (JSON editor)

**Aba de Mapeamentos:**
- Define relação seção → campo Monday
- Validação JSON em tempo real

**Recursos especiais:**
- Sintaxe highlighting para JSON
- Validação de estrutura
- Preview da estrutura

---

## 5. Página de Fluxos
**Rota:** `/fluxos`  
**Menu:** Fluxos  
**Descrição:** Editor visual de workflows com ReactFlow.

### Área de Canvas
**Componente:** FlowDiagram
**Controles de zoom:**
- Zoom in/out
- Fit view
- Minimap (toggle)

### Tipos de Nós

#### StartNode (Início)
- Cor: Verde
- Apenas saída
- Obrigatório em todo fluxo

#### ActionNode (Tarefa)
- Cor: Azul
- Entrada e saída
- Campos: título, descrição, responsável

#### SwitchNode (Decisão)
- Cor: Laranja
- Uma entrada, duas saídas
- Condições TRUE/FALSE

#### DocumentNode (Documento)
- Cor: Roxo
- Vincula documento ao fluxo
- Abre DocumentationModal

#### IntegrationNode (Integração)
- Cor: Ciano
- Conecta com sistemas externos
- Configuração de API

#### EndNode (Fim)
- Cor: Vermelho
- Apenas entrada
- Finaliza o fluxo

### Barra de Ferramentas (FlowToolbar)
- **Novo Fluxo**: Limpa canvas
- **Salvar**: Persiste no banco
- **Desfazer/Refazer**: Histórico de ações
- **Biblioteca**: Abre BibliotecaFluxos

### Painel Lateral (NodeInspector)
**Ativação:** Clique em nó
**Funcionalidades:**
- Edição de propriedades
- Configuração de permissões (adminRoleAcs)
- Exclusão de nó
- Pin/unpin do painel

### Modais de Fluxo

#### NewFlowModal
**Campos:**
- Nome do fluxo
- Código (único)
- Descrição
- Tipo de fluxo

#### FlowMetadataModal
**Exibe:**
- Informações do fluxo
- Estatísticas de uso
- Histórico de execuções

#### BibliotecaFluxos
**Funcionalidades:**
- Lista fluxos salvos
- Busca por nome/código
- Importação para canvas
- Exclusão com confirmação

### Sistema de Permissões
**Campo:** adminRoleAcs
**Validação:** Contra user.flowProcessAcs
**Mensagem de erro:** "ATENÇÃO: Seu usuário não possui direitos a operar ações neste processo"

---

## 6. Página do Editor Lexical
**Rota:** `/lexical`  
**Menu:** Editor Lexical  
**Descrição:** Editor avançado de documentos com recursos profissionais.

### Barra de Ferramentas Principal
- **Novo** (ícone Plus): Limpa editor
- **Abrir arquivo local** (ícone FolderOpen): 
  - Desabilitado em documentos de biblioteca
  - Aceita .lexical e .md
  
- **Salvar** (ícone Save): Abre SaveFileModal
- **Download** (ícone Download): Exporta arquivo
- **Templates** (dropdown): Carrega template estrutural
- **Anexos** (ícone Paperclip): Toggle painel lateral

### Modos de Visualização
- **Editor**: Modo de edição Lexical
- **Preview**: Visualização Markdown
- **MDX**: Preview com componentes React

### Editor Lexical
**Recursos de formatação:**
- **Negrito** (Ctrl+B)
- **Itálico** (Ctrl+I) 
- **Sublinhado** (Ctrl+U)
- **Tachado**
- **Código inline**

**Blocos especiais:**
- **Cabeçalhos** (H1, H2, H3) - Desabilitados na toolbar
- **Quote**: Converte seleção em citação
- **Code Block**: Com numeração de linhas
- **Tabelas**: Editáveis com menu de contexto
- **Imagens**: Resize e alinhamento
- **Containers colapsáveis**: Com título editável

### Painel de Anexos
**Filtro:** Apenas COMPOSER_ASSET
**Ações por anexo:**
- Visualizar thumbnail (se imagem)
- Inserir no documento
- Excluir anexo

### Sistema de Templates
**Funcionalidades:**
- Carregamento de estrutura
- Mapeamento automático de seções
- Header fields com dados dinâmicos
- Botões de ação (refresh, unplug)

### Modais do Editor

#### SaveFileModal
**Opções de salvamento:**
- Documento Lexical (.lexical)
- Markdown (.md)
- Biblioteca (banco de dados)

**Campos:**
- Nome do arquivo
- Tags (para biblioteca)
- Público/Privado (toggle)

#### PluginModal
**Tipos de plugin:**
- DATA_SOURCE
- AI_AGENT
- CHART
- FORMATTER
- INTEGRATION
- UTILITY

**Funcionalidades:**
- Configuração JSON
- Teste de plugin
- Ativação/desativação

### Conversão Markdown
**Recursos preservados:**
- Formatação de texto
- Estrutura de blocos
- Tabelas complexas
- Links e imagens
- Metadados de header fields

---

## 7. Página de Plugins
**Rota:** `/plugins`  
**Menu:** Plugins  
**Descrição:** Gerenciamento de extensões e integrações.

### Tabela de Plugins
**Colunas:**
- Ícone (customizável)
- Nome
- Descrição
- Tipo (badge colorido)
- Versão
- Status (Ativo/Inativo)
- Ações

### Controles
- **Novo Plugin** (ícone Plus): Abre modal de criação
- **Busca**: Filtro por nome
- **Filtro por tipo**: Dropdown

### Modal de Plugin
**Tabs:**
- **Geral**: Informações básicas
- **Configuração**: JSON de config

**Campos Gerais:**
- Nome (obrigatório)
- Descrição (mín. 10 caracteres)
- Tipo (seleção)
- Versão (formato semver)
- Autor
- Ícone (biblioteca ou upload)

**Configuração JSON:**
- Editor com syntax highlighting
- Validação em tempo real
- Mensagens de erro inline

### Ações por Plugin
- **Ativar/Desativar** (toggle)
- **Testar** (ícone Play): Abre modal de teste
- **Editar** (ícone Pencil)
- **Excluir** (ícone Trash)

### Modal de Teste
**Funcionalidades:**
- Input de dados de teste
- Execução em sandbox
- Visualização de resultado
- Log de erros

---

## 8. Página de Configurações
**Rota:** `/configuracoes`  
**Menu:** Configurações  
**Descrição:** Configurações de sistema e integrações.

### Tabs de Configuração

#### Tab "Conexões de Serviço"
**Serviços disponíveis:**
- Monday.com
- GitHub
- OpenAI

**Card por serviço:**
- Status (Conectado/Desconectado)
- Última sincronização
- Botão configurar

#### Tab "Parâmetros do Sistema"
**Configurações globais:**
- MAX_ITEMS_PER_REVISOR
- TEMPLATE_ACCORDION_ENABLED
- AUTO_SAVE_INTERVAL
- DEBUG_MODE

### Modal de Conexão
**Campos comuns:**
- Nome do serviço (readonly)
- Token/API Key (obrigatório)
- Descrição

**GitHub específico:**
- Teste de conexão
- Listagem de repositórios
- Seleção de repo padrão

**Validações:**
- Token válido
- Permissões adequadas
- Conexão ativa

### Ações
- **Testar Conexão**: Valida token
- **Salvar**: Persiste configuração
- **Excluir**: Remove conexão (confirmação)

---

## 9. Página de Cadastros Gerais
**Rota:** `/cadastros-gerais`  
**Menu:** Cadastros Gerais  
**Descrição:** Manutenção de dados mestres do sistema.

### Cadastros Disponíveis

#### Especialidades
**Campos:**
- Código (único)
- Nome
- Descrição
- Ativa (checkbox)

#### Tipos de Documento
**Campos:**
- Código
- Nome
- Categoria
- Template padrão

#### Status de Processo
**Campos:**
- Código
- Nome
- Cor (color picker)
- Ordem de exibição

### Funcionalidades Comuns
- CRUD completo
- Importação/Exportação CSV
- Auditoria de mudanças
- Validações de integridade

---

## 10. Página de Preferências
**Rota:** `/preferences`  
**Menu:** Preferências  
**Descrição:** Configurações pessoais do usuário.

### Seções

#### Perfil
- Nome completo
- Email
- Foto de perfil
- Biografia

#### Aparência
- Tema (Claro/Escuro/Auto)
- Cor de destaque
- Tamanho da fonte
- Densidade da interface

#### Notificações
- Email de notificações
- Notificações do navegador
- Som de alertas
- Frequência de resumos

#### Atalhos de Teclado
- Lista de atalhos
- Customização
- Reset para padrão

### Botões de Ação
- **Salvar Preferências**
- **Resetar Padrões**
- **Exportar Configurações**

---

## 11. Página de Editor
**Rota:** `/editor`  
**Menu:** Editor  
**Descrição:** Editor simplificado para edição rápida.

### Características
- Interface minimalista
- Foco em produtividade
- Atalhos de teclado
- Salvamento automático

### Funcionalidades
- Edição de texto puro
- Sintaxe Markdown
- Preview lateral
- Exportação rápida

---

## 12. Página de Autenticação  
**Rota:** `/auth`  
**Acesso:** Público (não requer login)
**Descrição:** Sistema de login e registro.

### Formulário de Login
**Campos:**
- Email (validação de formato)
- Senha (mínimo 6 caracteres)
- Lembrar-me (checkbox)

**Ações:**
- Entrar
- Esqueci minha senha
- Criar conta

### Formulário de Registro
**Campos:**
- Nome completo
- Email
- Senha
- Confirmar senha
- Aceitar termos (obrigatório)

**Validações:**
- Email único
- Senhas coincidem
- Força da senha

### Recuperação de Senha
**Processo:**
1. Inserir email
2. Receber link por email
3. Definir nova senha
4. Login automático

---

## 🚀 Visão Geral do Sistema

### Arquitetura Principal
- **Frontend**: React 18 + TypeScript com interface moderna e responsiva
- **Backend**: Node.js + Express com APIs RESTful robustas
- **Banco de Dados**: PostgreSQL com Drizzle ORM para máxima performance
- **Editor**: Lexical Framework para edição rica de texto profissional
- **Integrações**: Monday.com, GitHub, OpenAI para workflows completos

## 📖 Guia de Navegação Rápida

### Principais Fluxos de Trabalho

#### 🔄 Fluxo de Criação de Documento
1. **Página Documentos** → Botão "Novo Documento"
2. Preencher dados gerais (obrigatórios)
3. Configurar escopo e pessoas (opcional)
4. Salvar → Status "Incluído"
5. Iniciar documentação → Editor Lexical
6. Aplicar template → Estrutura automática
7. Editar conteúdo → Salvar versões
8. Finalizar → Status "Concluído"

#### 📊 Fluxo de Integração Monday.com
1. **Página Admin** → Tab "Monday Sync"
2. Configurar mapeamento de colunas
3. Definir filtros e valores padrão
4. Agendar sincronização (diária/semanal/mensal)
5. Executar teste manual
6. Monitorar logs de execução

#### 🔀 Fluxo de Criação de Workflow
1. **Página Fluxos** → Novo Fluxo
2. Adicionar nós (Start → Actions → End)
3. Conectar nós com edges
4. Configurar propriedades de cada nó
5. Definir permissões (adminRoleAcs)
6. Salvar na biblioteca
7. Vincular a documentos

#### 🔗 Fluxo de Integração GitHub
1. **Página Configurações** → Adicionar conexão GitHub
2. Inserir token de acesso pessoal
3. Testar conexão → Listar repositórios
4. Selecionar repositório padrão
5. **Página Documentos** → Tab GitHub
6. Explorar estrutura de pastas
7. Upload/download de arquivos
8. Sincronizar estruturas locais

### Atalhos de Teclado Globais

| Atalho | Ação |
|--------|------|
| `Ctrl+S` | Salvar documento atual |
| `Ctrl+N` | Novo documento |
| `Ctrl+O` | Abrir arquivo |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` | Refazer |
| `Ctrl+F` | Buscar |
| `Ctrl+H` | Substituir |
| `Esc` | Fechar modal |

### Códigos de Status

#### Status de Documento
- **Incluído**: Documento novo, não processado
- **Integrado**: Importado de sistema externo
- **Em Processo**: Sendo editado/documentado
- **Em Revisão**: Aguardando aprovação
- **Concluído**: Finalizado e publicado
- **Cancelado**: Descontinuado

#### Status de Task (Tsk.Status)
- **OK** (Verde): Tarefa concluída
- **Working** (Amarelo): Em andamento
- **Need Action** (Vermelho): Requer atenção

### Permissões e Acessos

#### Níveis de Usuário
1. **Administrador**: Acesso total
2. **Editor**: Criar/editar documentos
3. **Revisor**: Aprovar documentos
4. **Visualizador**: Somente leitura

#### Permissões de Fluxo (flowProcessAcs)
- Define quais nós de fluxo o usuário pode executar
- Validado contra adminRoleAcs do nó
- Mensagem de erro específica quando sem permissão

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

## 🔧 Configurações e Parametrizações

### Parâmetros do Sistema (system_params)

| Parâmetro | Descrição | Valor Padrão |
|-----------|-----------|--------------|
| `MAX_ITEMS_PER_REVISOR` | Limite de documentos por revisor | 10 |
| `TEMPLATE_ACCORDION_ENABLED` | Habilita accordion de templates | true |
| `AUTO_SAVE_INTERVAL` | Intervalo de salvamento automático (ms) | 30000 |
| `DEBUG_MODE` | Modo debug com logs extras | false |
| `MAX_FILE_SIZE` | Tamanho máximo de upload (MB) | 10 |
| `SESSION_TIMEOUT` | Timeout de sessão (minutos) | 60 |
| `PLUGIN_TYPES` | Tipos de plugins disponíveis | JSON array |

### Configurações de Integração

#### Monday.com
- **API Endpoint**: `https://api.monday.com/v2`
- **Rate Limit**: 100 requests/minute
- **Batch Size**: 50 items
- **Timeout**: 30 seconds

#### GitHub
- **API Version**: v3
- **User Agent**: "EVO-MindBits-Composer"
- **Max File Size**: 100MB
- **Supported Files**: .md, .json, .lexical

#### OpenAI
- **Model**: GPT-4
- **Max Tokens**: 4000
- **Temperature**: 0.7
- **Timeout**: 60 seconds

### Mapeamentos de Campos

#### Documento → Monday.com
| Campo CPx | Coluna Monday | Transformação |
|-----------|---------------|---------------|
| objeto | name | Direto |
| status | status | Mapeamento de valores |
| responsavel | person | ID do usuário |
| data_criacao | date | ISO 8601 |
| descricao | long_text | HTML para texto |
| anexos | files | Base64 para upload |

### Validações e Limites

#### Documentos
- **Título**: Máximo 255 caracteres
- **Descrição**: Máximo 5000 caracteres
- **Anexos**: Máximo 10 por documento
- **Tags**: Máximo 20 por documento

#### Templates
- **Código**: Único, alfanumérico, máximo 50 caracteres
- **Estrutura JSON**: Máximo 1MB
- **Seções**: Máximo 50 por template

#### Fluxos
- **Nós**: Máximo 100 por fluxo
- **Conexões**: Máximo 200 por fluxo
- **Profundidade**: Máximo 20 níveis

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

### Diagrama Entidade-Relacionamento

```mermaid
erDiagram
    %% Core User Management
    users {
        serial id PK
        text name
        text email UK
        text password
        text role
        text status
        text avatar_url
        boolean must_change_password
        timestamp created_at
        timestamp updated_at
    }

    %% Document Management System
    documentos {
        uuid id PK
        text origem
        text objeto
        text tipo
        text cliente
        text responsavel
        text sistema
        text modulo
        text descricao
        text status
        text status_origem
        text solicitante
        text aprovador
        text agente
        text task_state
        bigint id_origem
        text id_origem_txt
        json general_columns
        json monday_item_values
        boolean assets_synced
        timestamp created_at
        timestamp updated_at
    }

    lexical_documents {
        uuid id PK
        text title
        text content
        text plain_text
        integer user_id FK
        boolean is_public
        text[] tags
        timestamp created_at
        timestamp updated_at
    }

    document_editions {
        uuid id PK
        uuid document_id FK
        uuid template_id FK
        integer started_by FK
        text status
        text lex_file
        json json_file
        text md_file
        timestamp init
        timestamp publish
        timestamp created_at
        timestamp updated_at
    }

    %% Template System
    templates {
        uuid id PK
        text name
        text code
        text description
        text type
        json structure
        json mappings
        timestamp created_at
        timestamp updated_at
    }

    %% Assets Management
    documents_artifacts {
        uuid id PK
        uuid documento_id FK
        text name
        text file_data
        text file_name
        text file_size
        text mime_type
        text type
        text origin_asset_id
        text is_image
        text monday_column
        text file_metadata
        text description
        timestamp created_at
        timestamp updated_at
    }

    global_assets {
        uuid id PK
        text name
        text file_data
        text file_name
        text file_size
        text mime_type
        text type
        text is_image
        integer uploaded_by FK
        text description
        text tags
        text file_metadata
        text editor
        timestamp created_at
        timestamp updated_at
    }

    %% Monday.com Integration
    monday_mappings {
        uuid id PK
        text name
        text description
        text board_id
        text quadro_monday
        text status_column
        text responsible_column
        text mapping_filter
        json default_values
        json assets_mappings
        json schedules_params
        timestamp last_sync
        timestamp created_at
        timestamp updated_at
    }

    monday_columns {
        uuid id PK
        uuid mapping_id FK
        text column_id
        text title
        text type
        timestamp created_at
        timestamp updated_at
    }

    mapping_columns {
        uuid id PK
        uuid mapping_id FK
        text monday_column_id
        text monday_column_title
        text cpx_field
        text transform_function
        boolean is_key
        timestamp created_at
        timestamp updated_at
    }

    %% Workflow System
    flow_types {
        uuid id PK
        text name
        text description
        json node_metadata
        timestamp created_at
        timestamp updated_at
    }

    documents_flows {
        uuid id PK
        text name
        text description
        text code UK
        uuid flow_type_id FK
        json flow_data
        integer user_id FK
        integer created_by FK
        integer updated_by FK
        boolean is_locked
        boolean is_enabled
        timestamp created_at
        timestamp updated_at
    }

    document_flow_executions {
        uuid id PK
        uuid document_id FK
        uuid flow_id FK
        text status
        json execution_data
        json flow_tasks
        integer started_by FK
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }

    %% GitHub Integration
    repo_structure {
        uuid uid PK
        text folder_name
        uuid linked_to FK
        boolean is_sync
        timestamp created_at
        timestamp updated_at
    }

    %% Service Connections
    service_connections {
        uuid id PK
        text service_name UK
        text token
        text description
        text[] parameters
        timestamp created_at
        timestamp updated_at
    }

    %% Plugin System
    plugins {
        text id PK
        text name
        text description
        text type
        text status
        text version
        text author
        text icon
        text page_name
        json configuration
        json endpoints
        text[] permissions
        text[] dependencies
        timestamp created_at
        timestamp updated_at
    }

    %% System Monitoring
    app_logs {
        uuid id PK
        text event_type
        text message
        json parameters
        timestamp timestamp
        integer user_id FK
        timestamp created_at
    }

    %% Generic Tables
    generic_tables {
        uuid id PK
        text name
        text description
        json content
        timestamp created_at
        timestamp updated_at
    }

    %% Relationships
    users ||--o{ lexical_documents : creates
    users ||--o{ global_assets : uploads
    users ||--o{ document_editions : starts
    users ||--o{ documents_flows : owns
    users ||--o{ documents_flows : creates
    users ||--o{ documents_flows : updates
    users ||--o{ document_flow_executions : starts
    users ||--o{ app_logs : performs

    documentos ||--o{ documents_artifacts : contains
    documentos ||--o{ document_editions : has
    documentos ||--o{ document_flow_executions : executes

    templates ||--o{ document_editions : guides

    monday_mappings ||--o{ monday_columns : defines
    monday_mappings ||--o{ mapping_columns : maps

    flow_types ||--o{ documents_flows : categorizes
    documents_flows ||--o{ document_flow_executions : executes

    repo_structure ||--o{ repo_structure : contains

    %% Self-referencing relationships
    repo_structure }o--|| repo_structure : linked_to
```

### Tabelas Principais
- **users**: Usuários com roles (ADMIN, EDITOR, USER) e status

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