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
- **Header Field Management**: Uses template mapping for automatic population, with action buttons for dynamic updates.
- **Edit Protection**: Restricts editing to specified container areas within the Lexical editor.
- **Markdown Conversion**: Advanced system for converting Lexical content to/from Markdown, preserving formatting and handling complex elements.
- **System Parameters Management**: Centralized configuration via a `system_params` table.
- **Specialty-User Association**: Manages user expertise associations for access and workflow assignments.
- **Dynamic Flow Filtering**: Uses an `application_filter` JSON criteria for documentation modals to dynamically display flows based on document field values.
- **Flow Actions Tracking**: The `flow_actions` table tracks individual actions within document flow executions for auditing and progress monitoring.

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