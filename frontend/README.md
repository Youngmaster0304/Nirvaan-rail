# SIH26027 Frontend — AI Block Planning Portal

## Quick Start
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## Design Philosophy
Styled as an official Indian Railways administrative portal. The UI borrows layout structures similar to NTES and CRIS applications for high user familiarity. The focus is on providing a dense, information-rich view for planners, without unnecessary aesthetic bloat.

## Pages
1. **Dashboard**: High-level metrics, active blocks, and alerts.
2. **Task Inbox**: Filterable list of all maintenance tasks.
3. **AI Prioritization**: View prioritized tasks with SHAP explanations.
4. **Block Generation**: Multi-department optimization interface.
5. **Corridor Map**: Network topology view using Leaflet.js.
6. **Conflict Resolution**: Intervene in cross-department conflicts.
7. **Audit Logs**: Track approvals, overrides, and system events.
8. **Settings**: User preferences and AI threshold configs.
9. **Reports**: Generate PDF exports of planned blocks.
10. **Help & Guidelines**: Quick references for Railway Board rules.
11. **Login**: Authenticated entry portal.

## Components
- **TaskCard**: Summary view of a maintenance task.
- **ShapBarChart**: Visual explanation of AI score using Recharts.
- **TopologyGraph**: Node-edge view of the sections.
- **BlockGantt**: Gantt chart for block schedules.
- **StatWidget**: Number and trend indicator.
- *...and 12 more generic UI components.*

## Tech Stack
- **Framework**: React 18 + TypeScript (built with Vite)
- **Styling**: TailwindCSS (custom government portal theme)
- **Data Viz**: Recharts, Leaflet.js for maps
- **State**: Zustand for local/global UI state, TanStack Query for server state
- **I18n**: react-i18next supporting English and Hindi

## Integration with Backend
The frontend expects the backend to run on `localhost:8000`. API calls are managed via Axios, wrapped by TanStack Query for caching and re-fetching.
