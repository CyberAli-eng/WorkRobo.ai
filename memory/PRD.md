# WorkRobo.ai - Product Requirements Document

## Original Problem Statement
Build an "All-in-One Autonomous Automation & Engagement Engine" SaaS platform called WorkRobo.ai, integrating capabilities of:
- n8n: Visual node-based workflow orchestration
- Huginn/Beehive: Autonomous agents with if-this-then-that logic
- Kibitzr: Web scraping and change detection
- Listmonk: High-scale messaging and subscriber management

## Architecture

### Tech Stack
- **Frontend**: React with Framer Motion animations, Tailwind CSS
- **Backend**: FastAPI (Python) v2.0.0
- **Database**: MongoDB (primary), Supabase for auth
- **Auth**: Supabase Auth (Google OAuth + Email/Password)
- **Email**: Resend API
- **AI**: Gemini 3 Flash (gemini-2.0-flash model)
- **Scraping**: Playwright with stealth mode

### Modules
1. **The Synapse** - Visual workflow builder using ReactFlow
2. **The Sentry** - Web monitoring and change detection with Playwright
3. **The Pulse** - Email campaigns and contact management via Resend
4. **The Hive** - Autonomous WorkRobo agents

### Custom Terminology
- Nodes → "Neural Links"
- Workflows → "Robo-Streams"
- Agents → "WorkRobos"

## User Personas
- **Developers**: Building custom automation workflows
- **Marketers**: Running email campaigns at scale
- **Growth Hackers**: Monitoring competitors and market changes
- **Automation Enthusiasts**: Creating no-code automations

## Core Requirements (Static)
- Deep dark purple/black theme (#0A0A0A base)
- Glassmorphism UI with purple glow accents
- Authentication via Supabase (Google + Email)
- Real-time workflow updates via WebSocket
- High-scale email capabilities

## What's Been Implemented

### Phase 1 (Jan 2026) ✅
- Landing Page with animated CSS 3D hero
- Authentication (Supabase)
- Dashboard with stats
- Basic CRUD for all modules
- UI/UX foundation

### Phase 2 (Jan 2026) ✅
- **Execution Engine v2.0.0**
  - StealthScraper using Playwright with bot detection bypass
  - WorkflowExecutor for parsing ReactFlow JSON
  - Gemini AI integration for data analysis
  - Real Resend email integration
  - WebSocket manager for real-time updates

- **New API Endpoints**
  - `/api/ping` - Engine health check
  - `/api/execute/smart-scrape` - Stealth web scraping
  - `/api/execute/ai-process` - Gemini AI processing
  - `/api/execute/send-email` - Send emails with templates
  - `/api/execute/stream/{id}` - Execute workflow
  - `/ws` - WebSocket for real-time updates

- **Enhanced Builder Page**
  - 8 Node types (Trigger, Sentry, AI, Email, Delay, Code, Database, Condition)
  - Node configuration dialogs
  - Execute button with real-time status
  - WebSocket integration for live node updates
  - Execution logs sidebar

## Prioritized Backlog

### P0 (Critical) ✅
- ~~Core navigation and routing~~
- ~~Authentication flow~~
- ~~Basic CRUD for all modules~~
- ~~Execution engine~~
- ~~Real-time updates~~

### P1 (High Priority)
- Scheduled task execution (cron-based)
- Workflow templates marketplace
- Advanced scraping options (pagination, login)
- Email template visual builder

### P2 (Medium Priority)
- Three.js 3D visualization
- Workflow versioning
- Contact import/export CSV
- Analytics dashboard with charts

### P3 (Nice to Have)
- Public webhook endpoints
- Multi-user workspaces
- Custom node SDK
- API rate limiting dashboard

## Next Tasks
1. Enable Google OAuth in Supabase dashboard
2. Add scheduled execution (cron jobs)
3. Create workflow template gallery
4. Build visual email template editor
5. Add workflow versioning/history
