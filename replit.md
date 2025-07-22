# EVO-MindBits Composer (CPx)

## Overview

EVO-MindBits Composer is an integrated technical and business documentation platform with AI assistance. It's an advanced business workflow synchronization platform that enables intelligent document management and collaborative editing through cutting-edge technologies.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates (January 21, 2025)

✓ Complete design system color scheme implementation
✓ Applied authentic color specifications from documentation
✓ Updated all UI components (buttons, badges, tables, forms)
✓ Implemented context-specific colors (RBx-purple, OCx-green, CPx-teal, IA-purple)
✓ Applied translucent backgrounds in dark mode for visual depth
✓ Standardized table headers with #292C33 background
✓ Enhanced theme consistency across entire application
✓ Fixed login page colors with specific values (#1F2937 left panel, #0E4F82 right panel)
✓ Corrected modal colors to use #0F1729 for Dialog, AlertDialog, and login Card components
✓ Applied complete login page color scheme:
  - Right panel #0E4F82 (both light and dark themes)
  - Light theme: left panel standard gray, card white, button #224C72, right panel text #ACC3DD, circular markers #ACC3DD
  - Dark theme: left panel #1F2937, card #0F1729, inputs #0F1729, button #1E3A8A, right panel text #ACC3E3, circular markers #ACC3E3
✓ Applied color #111827 to header, footer, and sidebar menu panel (dark theme only)
✓ Applied color #1F2937 to main content area background (dark theme only)
✓ Applied color #1F2937 to selected sidebar menu items in dark mode
✓ Applied color #6B7280 to header text "EVO-MindBits Composer" in dark mode
✓ Applied color #1F2937 to administration page container background in dark mode
✓ Applied color #1F2937 to administration page header background in dark mode
✓ Applied color #1F2937 to administration tabs background in dark mode
✓ Applied color #111827 to main user table container background in dark mode
✓ Applied color #111827 to user search/new user container in dark mode
✓ Applied color #0F172A to main administration page background and all table containers/bodies in dark mode
✓ Applied color #1E293B to container cards, tabs, and search header in dark mode
✓ Applied color #111827 to all table headers background in dark mode
✓ Applied color #1E40AF to active/selected tabs in dark mode
✓ Implemented CSS targeting specific to admin page only using [data-page="admin"] selector
✓ Removed aggressive CSS rules that affected header, footer, and sidebar
✓ Applied color #1F2937 to main content container div in administration page (dark mode only)
✓ Applied color #0F172A to user search and new user container section
✓ Applied color #1F2937 to administration page header with title "Administração"
✓ Ensured CSS overrides apply only to dark mode, preserving light theme original colors
✓ Applied color #1F2937 to main container div (outermost div in admin page)
✓ Applied color #F9FAFB to inner content div (space-y-6) in light mode, #1F2937 in dark mode
✓ Increased text contrast in user table cells for dark mode (gray-100, gray-300)
✓ Applied color #0F172A to dropdown menus background in dark mode
✓ Enhanced dropdown menu items contrast and hover states for dark mode
✓ Applied color #0F172A to user avatar dropdown menu in header (dark mode only)
✓ Applied dark theme colors to user status badges (green, yellow, gray with transparency)
✓ Applied color #1E40AF to primary buttons in dark mode (same as active tabs)
✓ Applied color #1E40AF to all modal buttons in dark mode (NewUserModal, CreateDocumentModal)
✓ Applied color #0F172A to modal select triggers and dropdown content in dark mode only
✓ Applied icon and adjusted title text color to #6B7280 in dark mode only
✓ Reduced title font size from text-3xl to text-2xl in both themes
✓ Preserved original light theme colors unchanged across entire application
✓ Complete modal tables dark mode implementation:
  - Applied #1F2937 to table headers with inline JavaScript for maximum specificity
  - Applied #0F172A to table cells with white translucent separators
  - Standardized visual pattern across all modal tables
  - Applied dark mode colors to select triggers in Assets Map and Agendamento tabs
  - Enhanced form field icons with proper contrast (Clock icon for time, Calendar for frequency)
✓ Fixed time picker styling in dark mode:
  - Applied darker dropdown colors (#000000, #1A1A1A for hover)
  - White internal icon using filter: brightness(0) invert(1)
  - Consistent dark theme across all time picker states
✓ Corrected "Editar Mapeamento" modal select triggers from incorrect #09090B to standard #0F172A:
  - Fixed "Coluna Monday" and "Campo na aplicação" select colors
  - Applied maximum CSS specificity to override problematic inherited styles
  - Ensured all form select elements in modal follow dark mode standards
✓ Applied global dark mode standards to ALL select elements across entire application:
  - Replaced all bg-background classes with explicit dark mode colors
  - Created comprehensive CSS rules for select elements in dark mode
  - Ensured consistent #0F172A background for all select triggers
  - Applied to forms, modals, and all application areas
✓ Fixed service integration icons for dark theme consistency:
  - Adjusted Settings icon title to text-blue-600 dark:text-blue-400
  - Fixed Monday.com CalendarDays icon and background (blue-600 dark:blue-400, bg-blue-100 dark:bg-blue-900/30)
  - Corrected GitHub icon colors (purple-600 dark:purple-400, bg-purple-100 dark:bg-purple-900/30)
  - Updated OpenAI Lightbulb icon (green-600 dark:green-400, bg-green-100 dark:bg-green-900/30)
  - Enhanced Play button icon for execution (green-600 dark:green-400)
✓ Fixed logs system tab colors to use #111827 instead of #09090B:
  - Applied #111827 to filter area background (bg-gray-50 dark:bg-[#111827])
  - Corrected table container background to #111827
  - Fixed table header sticky background to #111827
  - Updated parameters preview pre element to use #111827 background
  - Applied comprehensive CSS rules for logs tab consistency in dark mode

## System Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript with modern responsive interface
- **Backend**: Node.js + Express with robust REST APIs
- **Database**: PostgreSQL with Drizzle ORM for maximum performance
- **Editor**: Lexical Framework for professional rich text editing
- **UI Components**: Shadcn/ui with Radix UI primitives and Tailwind CSS
- **File System**: Local file handling with base64 encoding for asset management

### Architecture Decision Rationale
The system uses a monorepo structure with shared TypeScript schemas to maintain type safety across frontend and backend. The choice of Lexical over simpler editors provides extensibility for complex document structures needed in business workflows.

## Key Components

### 1. Lexical Rich Text Editor
- **Purpose**: Professional document editing with advanced formatting capabilities
- **Features**: 
  - Custom nodes for images, tables, collapsible sections
  - Bidirectional Markdown conversion
  - Multiple export formats (Lexical JSON, Markdown)
  - Plugin architecture for extensibility
- **Implementation**: Custom nodes extend base Lexical functionality with business-specific requirements

### 2. Monday.com Integration Engine
- **Purpose**: Synchronize business workflows with external project management
- **Features**:
  - Flexible column mapping between Monday and CPx fields
  - Scheduled job execution (daily/weekly/monthly)
  - Automatic file processing with base64 conversion
  - Retry logic with intelligent failure handling
- **Architecture**: Job manager handles cron-based scheduling with persistent job state

### 3. Asset Management System
- **Purpose**: Centralized file and resource management
- **Components**:
  - Global Assets: System-wide accessible resources
  - Document Artifacts: Document-specific attachments
  - Automatic metadata extraction and processing
- **Storage Strategy**: Local uploads with base64 encoding for database storage, supporting both blob URLs and HTTPS references

### 4. GitHub Repository Integration
- **Purpose**: Version control integration for documentation workflows
- **Features**:
  - Interactive repository tree navigation
  - Structure synchronization between remote and local repositories
  - Hierarchical folder and file mapping
- **Implementation**: REST API endpoints for repository exploration with real-time sync status

### 5. Plugin System
- **Purpose**: Extensible functionality for specialized business needs
- **Types**:
  - Data sources (external system connections)
  - AI agents (intelligent automation)
  - Charts and visualizations
  - Formatters and utilities
- **Architecture**: Modal-based plugin loading with data exchange capabilities

### 6. Template Engine
- **Purpose**: Standardized document structures for business processes
- **Types**:
  - Struct templates: Define document organization
  - Output templates: Control final document formatting
- **Implementation**: JSON-based structure definitions with flexible mapping capabilities

## Data Flow

### Document Creation Flow
1. User selects template type (struct/output)
2. Template structure loads into Lexical editor
3. Real-time content synchronization with backend
4. Automatic asset processing and storage
5. Version tracking through document editions

### Monday.com Sync Flow
1. Job manager triggers based on cron schedule
2. API authentication with stored credentials
3. Board data retrieval with column filtering
4. Automatic asset download and base64 conversion
5. Document creation/update with mapped fields
6. Comprehensive logging for audit trails

### Asset Processing Flow
1. File upload through browser APIs
2. MIME type validation and metadata extraction
3. Base64 encoding for database storage
4. Reference creation for editor integration
5. Categorization through tag system

## External Dependencies

### Core Infrastructure
- **@neondatabase/serverless**: PostgreSQL connection management
- **drizzle-orm**: Type-safe database operations
- **express**: REST API server framework
- **passport**: Authentication middleware

### Frontend Dependencies
- **@lexical/react**: Rich text editor framework
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight client-side routing

### Business Integrations
- **Monday.com API**: Project management synchronization
- **GitHub API**: Repository integration
- **OpenAI API**: AI-powered content assistance (planned)

### File Processing
- **multer**: File upload handling
- **node-cron**: Job scheduling
- **ws**: WebSocket support for Neon database

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js with TypeScript compilation
- **Build Tool**: Vite for frontend bundling
- **Database**: PostgreSQL via Neon serverless
- **File Storage**: Local filesystem with uploads directory

### Production Considerations
- **Backend**: Express server with esbuild bundling
- **Frontend**: Static build served through Express
- **Database**: Persistent PostgreSQL with connection pooling
- **Assets**: Local file storage with backup strategies
- **Monitoring**: System logs with structured event tracking

### Environment Configuration
- Database URL configuration through environment variables
- API keys stored securely for external service integration
- Session management with both memory and PostgreSQL stores
- CORS and security middleware for production deployment

The system is designed for incremental deployment with the ability to add Postgres later while maintaining compatibility with the existing Drizzle ORM schema definitions.