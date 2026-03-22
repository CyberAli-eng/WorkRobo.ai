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
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (primary), Supabase for auth
- **Auth**: Supabase Auth (Google OAuth + Email/Password)
- **Email**: Resend API
- **AI**: Gemini 3 Flash

### Modules
1. **The Synapse** - Visual workflow builder using ReactFlow
2. **The Sentry** - Web monitoring and change detection
3. **The Pulse** - Email campaigns and contact management
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
- Real-time workflow updates
- High-scale email capabilities

## What's Been Implemented (Jan 2026)

### Landing Page ✅
- Animated hero with CSS-based 3D robo-core visualization
- Feature cards for all four modules
- Statistics section
- CTA sections with smooth animations
- Responsive navigation

### Authentication ✅
- Login/Signup forms with email/password
- Google OAuth integration via Supabase
- Protected route guards
- Session management

### Dashboard ✅
- Stats overview cards
- Quick action buttons
- Activity feed placeholder
- Dark glassmorphism theme

### Synapse (Visual Builder) ✅
- ReactFlow-based canvas
- Custom Neural Link node types
- Node palette with 6 node types
- Save/load workflow functionality
- Connection handling

### Sentry (Web Monitoring) ✅
- Add monitoring targets
- Manual check trigger
- Change detection
- Delete targets

### Pulse (Messaging) ✅
- Contact list management
- Add contacts to lists
- Campaign creation
- Send campaign functionality

### Hive (WorkRobos) ✅
- Create WorkRobo agents
- Trigger type selection
- Activate/deactivate agents
- Delete agents

### Settings ✅
- Profile section
- Preferences toggles
- API key management placeholder

## Prioritized Backlog

### P0 (Critical)
- ~~Core navigation and routing~~
- ~~Authentication flow~~
- ~~Basic CRUD for all modules~~

### P1 (High Priority)
- Real-time workflow execution
- Actual web scraping with Playwright
- Email template builder
- Scheduled task execution

### P2 (Medium Priority)
- Three.js 3D visualization (fix compatibility)
- Workflow versioning
- Contact import/export
- Analytics dashboard

### P3 (Nice to Have)
- Webhook endpoints for WorkRobos
- Multi-user workspaces
- Custom node creation
- API rate limiting

## Next Tasks
1. Enable Google OAuth in Supabase dashboard
2. Add real-time workflow execution
3. Implement actual web scraping
4. Build email template editor
5. Add scheduled tasks with Celery/Redis
