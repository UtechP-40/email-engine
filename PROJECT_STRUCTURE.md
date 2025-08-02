# Project Folder Structure

## Root Directory
```
productly/backend/
├── .env                          # Environment variables
├── .env.local                    # Local environment overrides
├── .eslintrc.json               # ESLint configuration
├── .gitignore                   # Git ignore rules
├── next.config.mjs              # Next.js configuration
├── package.json                 # Dependencies and scripts
├── package-lock.json            # Locked dependency versions
├── postcss.config.mjs           # PostCSS configuration
├── tailwind.config.mjs          # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── vitest.config.js             # Vitest testing configuration
├── next-env.d.ts                # Next.js TypeScript declarations
├── components.json              # UI components configuration
└── README.md                    # Project documentation
```

## Application Structure
```
├── app/                         # Next.js 13+ app directory
│   ├── favicon.ico             # Application favicon
│   ├── fonts/                  # Custom fonts
│   └── globals.css             # Global styles
│
├── pages/                      # Next.js pages (legacy structure)
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── campaigns/         # Campaign CRUD operations
│   │   │   ├── index.js       # List/Create campaigns
│   │   │   ├── [id].js        # Get/Update/Delete specific campaign
│   │   │   └── [id]/          # Campaign-specific operations
│   │   ├── analytics/         # Analytics endpoints
│   │   ├── events/            # Event tracking endpoints
│   │   ├── socket.js          # Socket.IO server setup
│   │   └── test-email.js      # Email testing endpoint
│   │
│   ├── index.jsx              # Main application page
│   ├── globals.css            # Page-level global styles
│   ├── _app.js                # Next.js app wrapper
│   ├── _document.jsx          # Custom document structure
│   ├── campaign-demo.jsx      # Campaign demonstration page
│   ├── complete-demo.jsx      # Complete demo page
│   ├── email-test.jsx         # Email testing page
│   └── test-campaign.jsx      # Campaign testing page
│
├── components/                 # React components
│   ├── ui/                    # Reusable UI components
│   ├── auth/                  # Authentication components
│   ├── campaign/              # Campaign-related components
│   │   ├── campaign-builder.jsx
│   │   ├── enhanced-campaign-builder.jsx
│   │   ├── campaign-list.jsx
│   │   └── campaign-simulator.jsx
│   └── analytics/             # Analytics components
│
├── lib/                       # Utility libraries and services
│   ├── auth.js               # Authentication utilities
│   ├── db.js                 # Database connection and utilities
│   ├── email.js              # Email service functions
│   ├── email-config.js       # Email configuration
│   ├── email-service.js      # Email service implementation
│   ├── email-testing.js      # Email testing utilities
│   ├── nodemailer-service.js # Nodemailer integration
│   ├── queue.js              # Queue management
│   ├── queues/               # Queue implementations
│   ├── campaign-engine.js    # Campaign execution engine
│   ├── socket-client.js      # Socket.IO client utilities
│   ├── utils.ts              # General utilities
│   ├── validation.js         # Data validation functions
│   └── __tests__/            # Unit tests
│
├── scripts/                   # Utility scripts
│   ├── setup-database.js     # Database initialization
│   ├── test-email-config.js  # Email configuration testing
│   └── process-scheduled-tasks.js # Task processing
│
├── .kiro/                     # Kiro IDE configuration
│   └── specs/                 # Feature specifications
│       ├── database-connectivity-setup/
│       ├── email-automation-testing/
│       ├── nextjs-socketio-integration-fix/
│       ├── tailwind-debug-fix/
│       └── campaign-node-persistence-fix/
│
├── .next/                     # Next.js build output (generated)
├── .vscode/                   # VS Code configuration
└── node_modules/              # Dependencies (generated)
```

## Key Directories Explained

### `/pages/api/` - Backend API Routes
- RESTful API endpoints following Next.js API routes pattern
- Authentication, campaigns, analytics, and real-time features

### `/lib/` - Core Business Logic
- Database operations, email services, campaign engine
- Reusable utilities and validation functions

### `/components/` - Frontend Components
- Organized by feature (auth, campaign, analytics, ui)
- Reusable UI components using shadcn/ui

### `/scripts/` - Automation Scripts
- Database setup, email testing, background task processing
- Development and maintenance utilities

### `/.kiro/specs/` - Feature Specifications
- Structured development plans and requirements
- Implementation tasks and design documents