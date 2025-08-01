# EVO-MindBits Composer (CPx)

## Overview

EVO-MindBits Composer is an integrated technical and business documentation platform with AI assistance. It serves as an advanced business workflow synchronization platform, enabling intelligent document management and collaborative editing. The project aims to streamline documentation processes, enhance collaboration, and integrate with external systems to create a cohesive information management ecosystem.

## User Preferences

Preferred communication style: Simple, everyday language.
Menu item naming: Change "Home" to "Principal" for Portuguese localization.

## Recent Changes

### Document Management Page Refactoring (July 2025)
- Created `documentos-page-embed.tsx` as simplified version of main documents page
- Removed all tab implementations (incluidos, integrados, concluidos, repositorio) 
- Removed tabs structure completely - displays documents directly
- Cleaned up related states, imports, and GitHub integration code
- Focused exclusively on "Em Processo" (In Process) documents with embedded FlowWithAutoFitView
- Maintained all core functionality (view, edit, delete documents, modals, flow diagrams)
- Significantly reduced code complexity from ~3900 lines

### Reusable Component Creation (August 2025)
- Created `DocsProcessEmbed.tsx` as complete reusable component
- **Zero functionality loss**: All 3,371 lines of original page preserved exactly
- Full FlowWithAutoFitView implementation maintained (1,980 lines of advanced flow functionality)
- Complete modal system, CRUD operations, Monday.com integration, GitHub sync preserved
- Configurable props for customization:
  - `className`: Custom styling classes
  - `showFilters`: Toggle table filters visibility  
  - `activeTab`: Define tab functionality ("em-processo", "concluidos", etc.)
- Enables embedding complete document management functionality in any page or dashboard
- Maintains all advanced features: flow diagrams, approval workflows, integration engines

### Home Page Tab Control System (August 2025)
- Implemented comprehensive tab control system on home page with 4 tabs:
  - "Revisões CT → RAG" (contains existing content panels)
  - "Triagem" (placeholder for future development)
  - "Projetos" (placeholder for future development) 
  - "Elicitações DEV" (placeholder for future development)
- Moved "Base de conhecimento CT → OC" and "Documentos MindBits_CT - Integrados por Especialidade" panels to "Revisões CT → RAG" tab
- "Meus Documentos em Processo" section positioned outside tabs, visible across all tabs with 10px spacing from tab content
- Added filter toggle button to "Meus Documentos em Processo" section with show/hide functionality
- Consistent dark theme styling (#0F172A) applied across all tab components

### Menu Cleanup (August 2025)
- Removed "Tests & Refacts" section from main navigation menu
- Removed access to experimental pages: documentos-refact and documentos-embed
- Cleaned up corresponding routes in App.tsx to streamline navigation
- Maintains only production-ready menu items for end users

### Major Code Cleanup - documentos-page.tsx (August 2025)
- Removed massive code duplication (~2,078 lines, 53% reduction)
- File reduced from 3,932 to 1,854 lines
- Eliminated duplicate FlowWithAutoFitView function definition
- Removed duplicate component implementations and modals
- DocsProcessEmbed now handles both "Em Processo" and "Concluídos" tabs via statusFilter prop
- Significantly improved maintainability and performance

### GitHub Integration Component Extraction (August 2025)
- Created `GitHubIntegration.tsx` as a completely self-sufficient component with internal state management
- Extracted and refactored GitHubTab to remove all external dependencies:
  - All GitHub-related states, queries, and mutations moved internally
  - Header section with sync operations (sync refs, pull from GitHub, push to GitHub)
  - Two-column grid layout with repository structure and file listing
  - FileExplorer integration for browsing repository folders
  - Real-time file listing for selected folders
  - All loading states, empty states, and error handling
- GitHubTab.tsx simplified to 4 lines (just renders GitHubIntegration component)
- Component is completely autonomous and reusable in any context
- Maintains 100% of original functionality without any feature loss
- Applied dark theme styling to CreateDocumentModal accordions (Escopo and Pessoas sections)

### Component Standardization - "Incluídos" Tab (August 2025)
- Replaced custom IncluirDocumentosTab implementation with DocsProcessEmbed component
- Eliminated code duplication by using unified table component with `statusFilter="Incluido"`
- Removed IncluirDocumentosTab import and implementation from documentos-page.tsx
- All tabs now use the standardized DocsProcessEmbed component for consistency
- Maintained 100% functionality while reducing code complexity

### GitHub Code Cleanup - documentos-page.tsx (August 2025)
- Removed unused GitHub-related queries: `serviceConnections` and `repoStructures`
- Removed unused state: `selectedFlowId` (no longer needed after GitHubIntegration extraction)
- Cleaned up dead code that was duplicated in GitHubIntegration.tsx component
- Page now only contains code relevant to document management functionality
- Reduced file complexity by removing ~10 lines of unused GitHub code

### Comprehensive Code Cleanup - documentos-page.tsx (August 2025)
- **Massive removal of dead code**: Reduced from 1,352 to 1,219 lines (-133 lines, 10% reduction)
- Removed unused states:
  - `filePreviewModal`, `setFilePreviewModal` (file preview functionality)
  - `isFlowModalOpen`, `setIsFlowModalOpen`, `currentFlowData`, `currentDocTitle` (flow modal states)
  - `isLoadingMondayAttachments`, `setIsLoadingMondayAttachments`, `mondayAttachmentsPreview` (Monday attachments)
- Removed unused functions:
  - `isMimeTypeViewable()` - MIME type validation function never called
  - `getTemplateInfo()` - template lookup function never used
  - `getColumnTitle()` - column title mapping never used
- Removed unused queries and data:
  - `flowExecutionCounts` - fetched but never accessed
  - `allMondayColumns` - complex query for data never used
  - `columnTitleMap` - memoized map never accessed
  - `templatesList` - template data never accessed
- Removed unused imports:
  - ReactFlow components: `ReactFlow`, `useReactFlow`, `Controls`, `Background`
  - React hooks: `useMemo`, `useEffect` (no longer needed)
  - FlowNode components: All 6 custom node components not used in main page
  - CSS import: `reactflow/dist/style.css`
- **Fixed all LSP diagnostics**: From 8 TypeScript errors to 0 clean compilation
- Maintained 100% of active functionality while dramatically improving code maintainability

## System Architecture

### UI/UX Decisions
The application utilizes a modern, responsive interface built with React 18 and Shadcn/ui, leveraging Radix UI primitives and Tailwind CSS for a consistent design system. Color schemes are authentically implemented, including context-specific colors (e.g., RBx-purple, OCx-green, CPx-teal, IA-purple). Dark mode is comprehensively supported across all components, including headers, footers, sidebars, modals, tables, and form elements, ensuring visual consistency and user comfort. Elements like table headers and card backgrounds are standardized with specific dark mode colors (e.g., #1E293B, #0F172A). Typography, spacing, and icon usage are harmonized throughout the application.

### Technical Implementations
The system follows a monorepo structure with shared TypeScript schemas for type safety.
- **Lexical Rich Text Editor**: Provides advanced document editing with custom nodes for images, tables, and collapsible sections. It supports bidirectional Markdown conversion and a plugin architecture for extensibility.
- **Monday.com Integration Engine**: Synchronizes business workflows by mapping data between Monday.com and CPx fields, with scheduled job execution and robust failure handling.
- **Asset Management System**: Manages global assets and document-specific artifacts, handling local file uploads, base64 encoding for storage, and metadata extraction.
- **GitHub Repository Integration**: Offers version control through interactive repository tree navigation and synchronization between remote and local repositories.
- **Plugin System**: Enables extensible functionality through various plugin types (data sources, AI agents, charts, formatters), loaded via a modal-based system with data exchange capabilities.
- **Template Engine**: Standardizes document structures using JSON-based definitions for both content organization (struct templates) and final output formatting (output templates), supporting flexible mapping.
- **Document Versioning**: Employs `md_file_old` column in `document_editions` table for storing previous markdown versions.
- **Header Field Management**: Utilizes template mapping for automatic header field population, with action buttons (refresh, plugin) for dynamic data updates.
- **Edit Protection**: Restricts editing to specified container areas within the Lexical editor to maintain document structure integrity.
- **Markdown Conversion**: Advanced system for converting Lexical content to Markdown and vice-versa, preserving inline formatting (bold, italic, strikethrough, inline code) and handling complex elements like tables (including nested tables).
- **System Parameters Management**: A dedicated table (`system_params`) provides a centralized mechanism for managing application-wide configuration parameters.
- **Specialty-User Association**: Manages user associations with areas of expertise, allowing for fine-grained control over document access and workflow assignments.
- **Dynamic Flow Filtering**: Implements an `application_filter` JSON criteria for documentation modals, allowing flows to be dynamically displayed based on document field values.
- **Flow Actions Tracking**: The `flow_actions` table tracks individual actions within document flow executions, recording who performed each action, when it started and ended, and a description of the action. This enables detailed auditing and progress monitoring of workflow executions.

### Feature Specifications
- **Toolbar-Based Container Editing**: Edit/delete functions for collapsible containers are integrated into the Lexical editor toolbar, appearing conditionally only for user-inserted containers (fromToolbar=true), not for template-created containers.
- **Enhanced Block Spacing**: Quote and code blocks automatically include empty lines for improved readability.
- **Code Block Line Numbering**: Code blocks in the Lexical editor feature automatic line numbering.
- **Selected Text Conversion**: Quote and code block buttons can convert selected text instead of just inserting empty blocks.
- **Disabled Heading Buttons**: H1, H2, H3 buttons in the Lexical editor toolbar are visible but disabled.
- **Conditional Template Accordion**: Template accordion in the document list (biblioteca) is conditionally enabled/disabled based on a `COMPOSER_TEMPLATE_ENABLED` system parameter.
- **Focus Control**: All automatic focus behaviors have been eliminated to give the user full control over cursor placement.
- **Task Status Display**: "Tsk.Status" column with color-coded badges is added to the "Meus Documentos em Processo" table on the home page.
- **Document Review Limits**: Document review modal enforces limits based on `MAX_ITEMS_PER_REVISOR` parameter, accounting for documents already in process by the user.
- **Dynamic Plugin Loading**: Plugins are dynamically discovered and loaded based on database entries, removing the need for manual registration.
- **Repository Path Selection**: Templates can be assigned to specific repository paths through a hierarchical selector.
- **LTH Menus Path Plugin**: A specialized plugin for selecting hierarchical menu paths, returning a structured path string.
- **JSON Validation**: Plugin editor modal includes in-modal JSON validation with visual feedback.
- **Multiple Document Processing**: "Iniciar Documentação" supports batch processing of multiple selected documents with visual progress indicators.
- **Navigation Customization**: "Home" menu item changed to "Principal"; main navigation menu items reordered.
- **Local File Button Disablement**: "Abrir arquivo .lexical local" button is disabled when editing documents from the library.
- **Cursor Fixes**: Resolved issues with cursor disappearing in collapsible containers and header fields.
- **Dynamic Height**: Repository tab and main content areas use dynamic flexbox layouts for responsive height adjustment.
- **Datetime Formatting**: Automatic datetime formatting to DD/MM/AAAA for mapped datetime fields.
- **Header Field Action Buttons**: Refresh and unplug buttons appear on header fields with mapping information.
- **Structured JSON for Mappings**: Template mappings use a structured JSON format (`{"type": "field/formula/plugin", "value": "..."}`) for explicit type definitions.
- **Filtered Attachments Panel**: Composer's attachments panel filters plugins to show only `COMPOSER_ASSET` types.
- **Markdown Output Enhancements**: Generated Markdown includes section separators (`---`), bold header field names, and correctly renders tables and inline formatting.

## External Dependencies

### Core Infrastructure
- **@neondatabase/serverless**: PostgreSQL connection management
- **drizzle-orm**: Type-safe database operations
- **express**: REST API server framework
- **passport**: Authentication middleware

### Frontend Libraries
- **@lexical/react**: Rich text editor framework
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight client-side routing

### Business Integrations
- **Monday.com API**: Project management synchronization
- **GitHub API**: Repository integration
- **OpenAI API**: AI-powered content assistance (planned)

### Utility & File Processing
- **multer**: File upload handling
- **node-cron**: Job scheduling
- **ws**: WebSocket support (likely for database communication)