# EVO-MindBits Composer (CPx)

## Overview

EVO-MindBits Composer is an integrated technical and business documentation platform with AI assistance, serving as an advanced business workflow synchronization tool. It aims to streamline documentation processes, enhance collaboration, and integrate with external systems to create a cohesive information management ecosystem. The project enables intelligent document management and collaborative editing.

## User Preferences

Preferred communication style: Simple, everyday language.
Menu item naming: Change "Home" to "Principal" for Portuguese localization.

## System Architecture

### UI/UX Decisions
The application uses React 18, Shadcn/ui, Radix UI primitives, and Tailwind CSS for a modern, responsive interface. It features consistent design with authentic color schemes (e.g., RBx-purple, OCx-green, CPx-teal, IA-purple) and comprehensive dark mode support across all components. Typography, spacing, and icon usage are harmonized.

### Technical Implementations
The system employs a monorepo structure with shared TypeScript schemas.
- **Lexical Rich Text Editor**: Provides advanced document editing with custom nodes, bidirectional Markdown conversion, and a plugin architecture.
- **Monday.com Integration Engine**: Synchronizes business workflows by mapping data and executing scheduled jobs.
- **Asset Management System**: Manages global assets and document-specific artifacts, including local file uploads and metadata extraction.
- **GitHub Repository Integration**: Offers version control and synchronization between remote and local repositories.
- **Plugin System**: Enables extensible functionality through various plugin types (data sources, AI agents, charts, formatters) with data exchange capabilities.
- **Template Engine**: Standardizes document structures using JSON-based definitions for content organization and output formatting.
- **Document Versioning**: Stores previous Markdown versions in the `md_file_old` column of the `document_editions` table.
- **Cleaned Architecture**: Removed unused `lexical_documents` table and all related functionality (January 2025) - was partially implemented but never activated in production.
- **Flow Integration**: Added `flux_node_id` field to the `document_editions` table to associate document editions with flow nodes. When a user clicks on a documentNode in the flow diagram and initiates editing ("Iniciar Documentação"), the system saves the node ID (e.g., "documentNode-3") in this field for proper tracking.
- **Header Field Management**: Uses template mapping for automatic population, with action buttons for dynamic updates.
- **Edit Protection**: Restricts editing to specified container areas within the Lexical editor.
- **Markdown Conversion**: Advanced system for converting Lexical content to/from Markdown, preserving formatting and handling complex elements.
- **System Parameters Management**: Centralized configuration via a `system_params` table.
- **Specialty-User Association**: Manages user expertise associations for access and workflow assignments.
- **Dynamic Flow Filtering**: Uses an `application_filter` JSON criteria for documentation modals to dynamically display flows based on document field values.
- **Flow Actions Tracking**: The `flow_actions` table tracks individual actions within document flow executions for auditing and progress monitoring, including a `flow_node` field to identify the specific flow node where each action occurred. When a documentation flow is initiated, the system automatically creates flow_action records for all nodes marked as executed (isExecuted = TRUE) in the flow definition.
- **Flow Access Control**: Implemented comprehensive access control system for flow node execution based on user permissions. The system validates user access rights using the `adminRoleAcs` field in flow nodes against the user's `flowProcessAcs` permissions. When unauthorized users attempt to access restricted nodes, the system displays a "ATENÇÃO: Seu usuário não possui direitos a operar ações neste processo" message and disables all action buttons.
- **IntegrationNode Published Status**: When a manual integrationNode is executed successfully in the Flow Diagram Modal, the system automatically updates `document_editions.status` to "published". Documents with this status remain visible in both Library and document composer with a yellow "Publicado" badge, but are disabled and non-editable. The backend API includes "published" status in library filters, and frontend displays proper status badges and disabled states.
- **EndNode Direct Finish**: When an endNode of type "Direct_finish" is executed via "Confirma Conclusão" button in the Flow Diagram Modal, the system updates `document_editions.status` to "finished" and creates a flow_action record with description "Fluxo de Processo Finalizado". Documents with this status are completely removed from both Library and document composer views as the backend API filters exclude "finished" status from all document listing endpoints.
- **Document Editions Status Schema**: Updated `document_editions.status` field enum to include all necessary status values: "draft", "in_progress", "review", "ready_to_revise", "published", "archived", "done", "to_discart", "discarted", "finished", "ready_to_next", "to_refact", "refact", "editing". This resolves issues where the finalization modal's "Marcar documento para descarte" option couldn't properly set the status to "to_discart" due to database constraints (January 2025).
- **Document Filter Toggle**: Added toggle filter button in "Biblioteca" header allowing users to switch between viewing all documents vs only editable documents (in_progress, editing, refact statuses). Button uses Filter/FilterX icons with blue highlighting when active (January 2025).
- **Reset Button Removal**: Removed "Reset documento" action button from documents "em processo" tab to prevent accidental document history removal and streamline the interface (January 2025).
- **MD Viewer Modal**: Added DocumentMdModal component with same MDX configuration as composer preview for viewing document markdown content in "em processo" tab. Includes toggle between current (md_file) and original (md_file_old) versions, proper null checks, and full MDX rendering support including Mermaid diagrams (January 2025).
- **Mermaid Code Block Detection**: Enhanced convertMarkdownToLexicalNodes function to properly detect and process ```mermaid code blocks when loading md_file_old content into collapsible containers. Mermaid blocks now create structured tables with diagram placeholder and preserved code, while regular code blocks remain as CodeNode. Includes debug logging for conversion tracking (January 2025).
- **Section Refresh Button System**: Implemented refresh buttons for template-loaded collapsible containers allowing users to reload original content from md_file_old. Features DOM-based button injection, view mode detection to persist buttons across editor transitions, and MutationObserver for automatic re-addition after DOM changes. Buttons are compact (24x24px) and appear only on containers not inserted via toolbar (January 2025).
- **Document Editions Foreign Key Constraint**: Changed `documentEditions.startedBy` constraint from CASCADE to RESTRICT to prevent automatic deletion of document editions when users are deleted. This ensures data integrity by requiring explicit handling of document editions before user deletion (January 2025).
- **System Logs Foreign Key Constraint**: Changed `systemLogs.userId` constraint from RESTRICT to CASCADE to automatically remove user logs when users are deleted. This prevents log retention issues while maintaining system cleanup (January 2025).
- **User Status Workflow Enhancement**: Implemented automatic user status management - new users are created with "pending" status and transition to "active" automatically when they complete their first login and mandatory password change. This ensures proper user lifecycle tracking and system access control (January 2025).
- **User Transfer System**: Added comprehensive user dependency transfer functionality allowing administrators to transfer all user-related records (documents, flows, assets, logs, etc.) from one user to another before deletion. Includes intuitive modal interface and validates constraints across 10 database tables (January 2025).
- **PENDING Status Control**: Enhanced user edit modal to strictly control PENDING status - users with PENDING status cannot have their status edited (field is hidden with informational badge), while ACTIVE/INACTIVE users can only toggle between those two states. PENDING status remains exclusively system-controlled for proper user lifecycle management (January 2025).

### Feature Specifications
- **Toolbar-Based Container Editing**: Edit/delete functions for collapsible containers integrated into the Lexical editor toolbar, appearing conditionally.
- **Enhanced Block Spacing**: Quote and code blocks include empty lines for readability.
- **Code Block Line Numbering**: Lexical editor code blocks feature automatic line numbering.
- **Selected Text Conversion**: Quote and code block buttons convert selected text.
- **Disabled Heading Buttons**: H1, H2, H3 buttons in the Lexical editor toolbar are visible but disabled.
- **Conditional Template Accordion**: Template accordion in the document list is conditionally enabled/disabled based on a system parameter.
- **Focus Control**: Automatic focus behaviors are eliminated for user control.
- **Task Status Display**: "Tsk.Status" column with color-coded badges in "Meus Documentos em Processo" table.
- **Document Review Limits**: Review modal enforces limits based on `MAX_ITEMS_PER_REVISOR`.
- **Dynamic Plugin Loading**: Plugins are dynamically discovered and loaded from the database.
- **Repository Path Selection**: Templates can be assigned to specific repository paths.
- **LTH Menus Path Plugin**: A specialized plugin for selecting hierarchical menu paths.
- **JSON Validation**: Plugin editor modal includes in-modal JSON validation.
- **Multiple Document Processing**: Supports batch processing of multiple selected documents.
- **Navigation Customization**: "Home" menu item changed to "Principal"; main navigation menu items reordered.
- **Local File Button Disablement**: "Abrir arquivo .lexical local" button disabled when editing library documents.
- **Cursor Fixes**: Resolved issues with cursor disappearance.
- **Dynamic Height**: Repository tab and main content areas use dynamic flexbox layouts.
- **Datetime Formatting**: Automatic datetime formatting to DD/MM/AAAA for mapped datetime fields.
- **Header Field Action Buttons**: Refresh and unplug buttons appear on header fields with mapping info.
- **Structured JSON for Mappings**: Template mappings use a structured JSON format.
- **Filtered Attachments Panel**: Filters plugins to show only `COMPOSER_ASSET` types.
- **Markdown Output Enhancements**: Generated Markdown includes section separators, bold header field names, and correctly renders tables and inline formatting.

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
- **ws**: WebSocket support