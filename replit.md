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
✓ Applied global fix for ALL divs with color #09090B in dark mode:
  - Fixed MarkdownPreview component pre elements (bg-gray-900 to dark:bg-[#111827])
  - Added comprehensive CSS rules to prevent #09090B from appearing anywhere
  - Applied global override for any element using #09090B or rgb(9,9,11) colors
  - Fixed potential Tailwind classes (bg-gray-900, bg-slate-900, bg-zinc-900, bg-neutral-900)
  - Added safeguards for computed styles and inline style attributes
  - Applied maximum specificity overrides for all modal and admin page elements
✓ Restructured Templates page layout to match Administration page (January 22, 2025):
  - Moved title to dedicated header div above tabs (same pattern as admin page)
  - Applied header styling: #1F2937 background, #6B7280 title color, FileCode icon
  - Structured layout: container → space-y-6 div → header div → tabs
  - Applied same tab styling with #1E40AF active states
✓ Applied same color scheme pattern to Templates page:
  - Applied data-page="templates" attribute for CSS targeting
  - Background colors: #1F2937 (main), #1E293B (cards), #0F172A (individual cards)
  - Header colors: #111827 with #374151 borders
  - Active tabs: #1E40AF with white text
  - Modal dialogs: #0F1729 background
  - Form elements: #0F172A with #374151 borders
  - Text colors: #E5E7EB (primary), #9CA3AF (secondary), #6B7280 (titles)
  - Icon colors: adjusted for dark theme (#60A5FA blue, #A78BFA purple, #F87171 red)
  - Consistent with administration page styling pattern
✓ Applied global #1E40AF standard for all active tabs in dark mode:
  - Created global CSS rule for [data-radix-tabs-trigger][data-state="active"]
  - Ensured consistent #1E40AF background across entire application
  - Applied white text color for proper contrast
  - Standardized hover states for active tabs
  - Added maximum specificity overrides to prevent #09090B from appearing
✓ Applied global cards color scheme for dark mode (January 22, 2025):
  - Updated CSS --card variable to #1E293B for main cards
  - Applied #1E293B background to all standard cards
  - Headers: #111827 with #374151 borders
  - Individual/nested cards: #0F172A for better hierarchy
  - Grid and modal cards: #0F172A with proper borders
  - Text colors: #E5E7EB (titles), #9CA3AF (descriptions)
  - Overrode shadcn/ui conflicting classes (bg-card, bg-background)
  - Consistent card styling across entire application
✓ Fixed template modal button container for dark mode:
  - Applied #0F172A background to button footer area (updated per request)
  - Removed white background from button container
  - Applied #374151 border color to top border
  - Enhanced button colors: #1E40AF (primary), transparent outline with #6B7280 borders
  - Updated JSX classes and CSS overrides for maximum specificity
✓ Applied dark theme to accordion cards in template mapping tab:
  - Main accordion triggers: #1E293B background with #374151 borders
  - Nested section triggers: consistent #1E293B background 
  - Accordion content areas: #0F172A background for hierarchy
  - Tables: #0F172A headers, rows, and borders (replaced #374151 completely)
  - Fixed JSX classes: replaced dark:hover:bg-[#374151] with dark:hover:bg-[#1E293B] in CollapsibleTrigger components
  - Fixed JSX border classes: replaced dark:border-gray-600 with dark:border-[#0F172A] in all Collapsible components
  - Added comprehensive CSS overrides for any remaining #374151 border colors
  - Applied nuclear CSS approach: override ALL border colors in modal with #0F172A
  - Targeted CSS variables and computed styles that might generate #374151 (gray-600)
  - Added inline style overrides for any hardcoded #374151 or rgb(55, 65, 81) values
  - Implemented JavaScript force override: scans computed styles for rgb(55, 65, 81) and replaces with #0F172A
  - Added modalRef and useEffect to run color override after render and accordion state changes
  - Text colors: #E5E7EB (primary), #9CA3AF (secondary), blue accent adjusted for dark mode
  - Select triggers: #0F172A background with proper contrast
  - Icons: adjusted chevron colors for dark theme visibility
  - Campo and Mapeamento areas: #0F172A background for complete dark theme consistency
✓ Applied #1F2937 specifically to Templates page containers (January 22, 2025):
  - Reverted global changes to preserve other pages' design
  - Applied #1F2937 only to Templates page via [data-page="templates"] selectors
  - Container hierarchy: .container, .space-y-6 > div:first-child, .space-y-4 > .card
  - Modal and accordion containers in Templates page
  - Better visual hierarchy within Templates page only

✓ ReactFlow grid implementation COMPLETED successfully (January 22, 2025):
  - Successfully implemented grid toggle button with Grid3X3 icon and state management
  - Fixed ReactFlow CSS import ('reactflow/dist/style.css') required for proper styling
  - SOLVED: Background component re-rendering issue using MutationObserver pattern
  - Grid component uses MutationObserver to watch document.documentElement class changes
  - Applied key={`${currentTheme}-${gridColor}`} to force Background re-render on theme change
  - Final working grid: white dots (#ffffff) in dark mode, black dots (#000000) in light mode
  - Grid settings: gap=16, size=1, BackgroundVariant.Dots
  - Technical solution: useState + useEffect with MutationObserver for real-time theme detection
  - Status: FULLY FUNCTIONAL across both light and dark themes

✓ Page title consistency implemented across all pages (January 22, 2025):
  - Applied same title pattern to Fluxos and Documentos pages as Admin, Templates, and Composer pages
  - Standard header: rounded container with p-6 padding and bg-gray-50 dark:bg-[#0F172A]
  - Standard title styling: text-2xl font-bold tracking-tight text-gray-900 dark:text-[#6B7280]
  - Added appropriate icons: Workflow (Fluxos), FileText (Documentos) with blue color scheme
  - Consistent gap-3 spacing between icon and text across all pages
  - Unified visual hierarchy and dark mode color scheme
  - Applied same tab styling pattern with grid layout and #1E40AF active states
  - Consistent data-page attributes for CSS targeting
  - Applied #0F172A to tabs container and title header in Documentos page for dark mode consistency
✓ Added header div with buttons in Incluidos tab (January 22, 2025):
  - Created dedicated header div within IncluirDocumentosTab component with #0F172A background
  - Moved "Atualizar" and "Incluir Documento" buttons from main page header to tab header
  - Applied consistent button styling with dark mode colors (#1E40AF for primary button)
  - Header focused on button functionality with proper spacing and alignment
  - Buttons maintain full functionality with proper toast notifications and modal triggers
✓ Applied dark theme to Integrados tab filters and tables (January 22, 2025):
  - Updated filters container with #0F172A background and #374151 borders
  - Applied dark mode colors to all select triggers and content (#0F172A, #374151)
  - Updated label text colors to gray-200 for proper contrast
  - Applied #111827 to table headers with gray-200 text
  - Enhanced table cells with dark mode borders and text colors
  - Updated badge colors for origin tags (Monday: blue-900/30, others: purple-900/30)
  - Applied dark theme to loading text and empty state messages
✓ Implemented table row alternating colors for documentos page (January 22, 2025):
  - Added CSS rules for alternating row colors: #0F172A (odd) and #1F2937 (even)
  - Applied to dark mode only with [data-page="documentos"] selector
  - Ensured cells inherit the row background colors for consistency
  - Used !important flags to override default styling
✓ Applied black color to table headers in light mode for documentos page (January 23, 2025):
  - Created specific CSS rules for light mode only using :not(.dark *) selectors
  - Applied color: #000000 to thead th, .table-header, and th elements
  - Used [data-page="documentos"] selector to limit scope to documentos page only
  - Added double specificity protection with html:not(.dark) to prevent dark mode interference
✓ Implemented table row alternating colors for LIGHT mode in documentos page (January 23, 2025):
  - Added CSS rules for alternating row colors: #FFFFFF (odd) and #F9FAFB (even) for light mode
  - Applied to light mode only with html:not(.dark) and :not(.dark *) selectors
  - Ensured cells inherit the row background colors for consistency
  - Added double protection to prevent interference with dark mode theming
  - Used [data-page="documentos"] selector to limit scope to documentos page only
✓ Applied dark theme to sync badges in FileExplorer component (January 23, 2025):
  - Added dark background colors to sync status badges: bg-green-50 dark:bg-green-900/30, bg-red-50 dark:bg-red-900/30, bg-yellow-50 dark:bg-yellow-900/30
  - Enhanced all sync status badges (synced, unsynced, github-only, local-only) with proper dark mode backgrounds
  - Maintained existing text and border colors while adding background support for better visibility
✓ Improved contrast for sync badges in dark mode (January 23, 2025):
  - Enhanced dark mode colors for better visibility: bg-green-100 dark:bg-green-800/50, bg-red-100 dark:bg-red-800/50, bg-yellow-100 dark:bg-yellow-800/50
  - Strengthened text colors: text-green-700 dark:text-green-300, text-red-700 dark:text-red-300, text-yellow-700 dark:text-yellow-300
  - Improved border colors: border-green-300 dark:border-green-600, border-red-300 dark:border-red-600, border-yellow-300 dark:border-yellow-600
  - Applied /50 opacity instead of /30 for more prominent background visibility in dark mode
✓ Applied consistent badge styling matching integrado badges pattern (January 23, 2025):
  - Standardized sync badges to match admin page and documentos table styling pattern
  - Applied exact same colors as integrado badges: dark:bg-green-800/30, dark:bg-red-800/30, dark:bg-yellow-900/30
  - Consistent text colors: dark:text-green-300, dark:text-red-300, dark:text-yellow-400
  - Standardized border colors: dark:border-green-600, dark:border-red-600, dark:border-yellow-600
✓ Fixed sync badges to match exact Monday/origem badge pattern (January 23, 2025):
  - Applied precise Monday badge colors: bg-green-100 dark:bg-green-900/30, bg-red-100 dark:bg-red-900/30, bg-yellow-100 dark:bg-yellow-900/30
  - Matched exact text pattern: text-green-800 dark:text-green-400, text-red-800 dark:text-red-400, text-yellow-800 dark:text-yellow-400
  - Consistent border styling: border-green-300 dark:border-green-600, border-red-300 dark:border-red-600, border-yellow-300 dark:border-yellow-600
  - Forced workflow restart to ensure changes are applied
✓ Applied direct div styling matching Monday badges exactly (January 23, 2025):
  - Removed Badge component and used direct div with Monday badge styling
  - Applied exact same classes: bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded text-xs font-medium
  - Ensured consistent visual appearance with Monday origin badges
  - Force touched file to trigger rebuild and cache refresh
✓ Added test badge to debug visibility issue (January 23, 2025):
  - Added hardcoded green badge "TESTE" to FileExplorer
  - Testing if badges are visible in the Repositório tab
  - Debugging sync badge display issue
✓ Fixed sync badge in DocumentosTable for Integrados tab (January 23, 2025):
  - Located sync badge in DocumentosTable.tsx line 252-260 that shows when documento.assetsSynced is true
  - Converted Badge component to direct div with Monday badge styling pattern
  - Applied exact same classes: bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded text-xs font-medium
  - Badge appears in Anexos column of integrados tab when assets are synced
✓ Applied #111827 background to integrados table container in dark mode (January 23, 2025):
  - Added dark:bg-[#111827] to table container div for consistent dark theme
  - Applied to DocumentosTable.tsx for integrados tab specifically
  - Ensures table container matches dark mode color scheme (updated from #0F1729)
✓ Applied dark mode to "Iniciar Documentação" modal (January 23, 2025):
  - Applied #0F1729 background to DialogContent in dark mode
  - Updated Labels with dark:text-gray-200 for proper contrast
  - Applied #0F172A to SelectTrigger and SelectContent with #374151 borders
  - Updated card backgrounds: amber-900/30, green-900/30, blue-900/30 for alert cards
  - Enhanced text colors with dark theme variants (amber-400, green-400, blue-400)
  - Applied #1E40AF button colors to match application standards
  - Fixed document details card with #1E293B background and #374151 borders
  - Updated document info text colors: gray-100 (title), gray-300 (details), gray-200 (labels)
✓ Applied dark mode to ViewDocumentModal "Descrição" field (January 23, 2025):
  - Fixed description field background to #1E293B in dark mode
  - Added #374151 borders for consistency with application standards
  - Updated description text to gray-300 for proper contrast
  - Applied #0F1729 background to DialogContent for complete dark mode consistency
  - Enhanced label text color to gray-400 in dark mode
✓ Applied dark mode to General Fields tab in ViewDocumentModal (January 23, 2025):
  - Updated field cards with #1E293B background and #374151 borders
  - Applied #0F172A to value containers for better hierarchy
  - Enhanced text colors: gray-200 (field names), gray-300 (values), gray-400 (labels)
  - Fixed "Campos Gerais" title to gray-200 in dark mode
  - Updated Badge with dark theme colors (#374151 background, #6B7280 border)
  - Applied dark mode to empty state container with proper contrast
✓ Applied dark theme to Anexos tab div and table in ViewDocumentModal (January 23, 2025):
  - Updated "Anexos (Assets) na Origem" title to gray-200 in dark mode
  - Applied #1E293B background and #374151 borders to all containers and empty states
  - Updated table headers with #111827 background and gray-200 text
  - Applied gray-300 text to all table cells for proper contrast
  - Enhanced type indicators (Imagem: green-400, Arquivo: gray-400) for dark mode
  - Updated error state containers with red-900/30 background and red-400 text
  - Applied dark:border-[#374151] to table rows for consistent theming
  - Applied specific CSS rules for table headers (#111827) and table rows (#0F172A) in dark mode only
  - Used highly specific selectors to ensure changes apply only to ViewDocumentModal anexos tab
  - Protected light theme from any interference with dark mode specific styling
  - Added JavaScript-based color application via useEffect for maximum compatibility
  - Fixed React hooks error by moving useEffect before early return condition
  - Maintained hook order consistency across component renders
✓ Applied ultra-specific table colors for ViewDocumentModal anexos tab (January 23, 2025):
  - Table headers: #111827 background (dark mode only)
  - Table cells: #0F172A background (dark mode only)
  - Maximum CSS specificity using [data-radix-dialog-overlay] selectors
  - Enhanced JavaScript application with modal-specific targeting
  - Complete light theme protection with explicit :not(.dark) rules
  - Component isolation - no propagation to other system components
  - Enhanced element targeting including .table-fixed class coverage
✓ Applied #111827 colors to "em-processo" and "concluidos" tabs table headers and containers (January 23, 2025):
  - Updated DocumentosTable.tsx to apply #111827 to both "em-processo" and "concluidos" tabs
  - Added conditional styling for table containers with dark:bg-[#111827]
  - Applied sticky header styling with proper borders and text colors
  - Ensured consistent dark mode theming across process and completed document tabs

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