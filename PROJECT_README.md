# Behavioral Operating System (BOS)

A category-defining, AI-driven goal achievement web application engineered for behavior change, action completion, retention, and habit formation.

## 🎯 Project Overview

The Behavioral Operating System is built around a defensible moat:

**Better Actions → More Completion Data → Better Adaptation → Better Actions**

Every design and implementation decision contributes to getting users from intention to consistent execution, minimizing friction and maximizing psychological leverage.

## 🧠 Core Philosophy

Rooted in cutting-edge behavioral science:
- **Fogg's Behavior Model** (B=MAP)
- **James Clear's Atomic Habits** (Environment Design, Never Miss Twice)
- **Nir Eyal's Hooked Model** (Triggers, Action, Variable Reward, Investment)

## 🚀 Technology Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **AI Integration**: NVIDIA NIM models (Nemotron, Kimik2.6/GLM)
- **Hosting**: Vercel
- **Storage**: Supabase Storage

## ✨ Features Implemented

### ✅ Core User Flows (V1)

1. **Landing Page** (`/`)
   - Atmospheric landing with brand introduction
   - Get Started and Sign In CTAs
   - High-contrast typography

2. **Authentication** (`/auth/login`, `/auth/signup`)
   - Clean login interface
   - User registration flow
   - Secure authentication (ready for Supabase integration)

3. **Onboarding** (`/onboarding`)
   - Goal entry with instant win action
   - AI-generated micro-action
   - One-tap completion with celebration
   - Seamless transition to main app

4. **Dashboard** (`/app`)
   - Today's action display
   - Progress metrics and streak tracking
   - Quick access to all app features
   - Session success rate

5. **Action Selection** (`/app/actions`)
   - Multiple AI-generated micro-action options
   - Recommended action highlighting
   - Contextual metadata (time, effort)
   - User choice architecture

6. **Focus Mode** (`/app/focus`)
   - Prominent micro-action display
   - One-tap "DONE" button
   - Optional feedback collection
   - Distraction-free execution

7. **Adaptive Check-In** (`/app/check-in`)
   - Mood selection interface
   - Confidence level slider
   - Qualitative feedback input
   - Behavioral data collection

8. **Behavior Insights** (`/app/insights`)
   - Pattern recognition insights
   - Progress tracking dashboard
   - Motivational nudges
   - Actionable suggestions

9. **Real-World Outcomes** (`/app/outcomes`)
   - Outcome logging interface
   - Impact tracking (positive/neutral/challenging)
   - Historical outcome view
   - Real-world result correlation

10. **Settings** (`/settings`)
    - Profile management
    - Notification preferences
    - Data & privacy controls
    - Account management

### 🎨 Design System

Implemented the **High-End Future OS** aesthetic from Stitch Kinetic Behavioral OS:

- **Color Palette**: Monochrome with high contrast
- **Typography**: Inter (primary) + JetBrains Mono (labels)
- **Layout**: 640px max-width central column
- **Animations**: Breathing effects, smooth transitions
- **Components**: Glassmorphism, tonal layers, technical readouts

## 🔧 Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- NVIDIA NIM API access

### Installation

1. **Clone and navigate to the project**
```bash
cd behavioral-os
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
NVIDIA_NIM_ENDPOINT=your_nvidia_nim_endpoint
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
behavioral-os/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx             # Landing page
│   │   ├── auth/
│   │   │   ├── login/          # Login page
│   │   │   └── signup/         # Registration page
│   │   ├── onboarding/         # New user onboarding
│   │   │   ├── goal-entry.tsx  # Goal input
│   │   │   └── instant-win.tsx # First action
│   │   ├── app/                # Main application
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── actions/        # Action selection
│   │   │   ├── focus/          # Active focus mode
│   │   │   ├── check-in/       # Adaptive feedback
│   │   │   ├── insights/       # Behavior insights
│   │   │   └── outcomes/       # Real-world outcomes
│   │   └── settings/           # User settings
│   ├── components/              # React components
│   │   ├── landing.tsx         # Landing page component
│   │   ├── auth/
│   │   │   ├── login.tsx       # Login form
│   │   │   └── signup.tsx      # Signup form
│   │   ├── onboarding/
│   │   │   ├── onboarding.tsx  # Onboarding container
│   │   │   ├── goal-entry.tsx  # Goal input
│   │   │   └── instant-win.tsx # First action
│   │   ├── app/
│   │   │   ├── dashboard.tsx   # Main dashboard
│   │   │   ├── actions.tsx     # Action selection
│   │   │   ├── focus-mode.tsx  # Focus mode
│   │   │   ├── check-in.tsx    # Check-in form
│   │   │   ├── insights.tsx    # Insights display
│   │   │   └── outcomes.tsx    # Outcomes tracker
│   │   └── settings.tsx        # Settings page
│   ├── lib/                     # Utilities and integrations
│   │   ├── ai/
│   │   │   └── nvidia-nim.ts   # NVIDIA NIM AI service
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser client
│   │   │   └── server.ts       # Server client
│   │   └── utils.ts            # Utility functions
│   ├── types/                   # TypeScript definitions
│   │   └── index.ts
│   └── app/
│       ├── globals.css          # Design system & Tailwind v4
│       └── layout.tsx           # Root layout
├── public/                      # Static assets
├── .env.example                 # Environment template
├── .env.template                # Environment template
├── setup-env.ps1               # Environment setup script
└── ENV_SETUP.md                # Setup instructions
```

## 🤖 AI Integration (Ready for Implementation)

The NVIDIA NIM service is structured and ready for integration:

### Nemotron 4B - Action Quality & Choice Architecture
- Generate instant win actions
- Create contextual micro-action options
- Refine actions based on user input

### Kimik2.6 / GLM 5.1 - Adaptation Engine
- Analyze user feedback
- Generate personalized insights
- Calibrate next actions dynamically
- Provide motivational nudges

### Nemotron 4B / 8B - Data Processing
- Categorize barriers and facilitators
- Score confidence and sentiment
- Assess actionability

## 🗄️ Database Schema (Pending Implementation)

The following tables need to be created in Supabase:

```sql
-- Users (handled by Supabase Auth)
-- Goals
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Micro-actions
CREATE TABLE micro_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id),
  user_id UUID REFERENCES auth.users,
  title TEXT NOT NULL,
  description TEXT,
  if_then_plan TEXT NOT NULL,
  difficulty_score INTEGER,
  estimated_time_minutes INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Action completions
CREATE TABLE action_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID REFERENCES micro_actions(id),
  user_id UUID REFERENCES auth.users,
  completed_at TIMESTAMP DEFAULT NOW(),
  confidence_score INTEGER,
  effort_rating INTEGER,
  emotional_state TEXT,
  barriers TEXT,
  facilitators TEXT
);

-- BOS insights
CREATE TABLE bos_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  actionable_suggestion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);
```

## 🔐 Authentication (Pending Implementation)

Supabase Auth integration is structured but needs:
- Auth context setup
- Protected route middleware
- User session management
- Account creation flow

## 🚀 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## 📊 Current Status

### ✅ Completed
- [x] Next.js project setup with Tailwind CSS v4
- [x] Design system implementation (colors, typography, components)
- [x] Goal entry interface
- [x] Instant win action flow
- [x] Action selection interface
- [x] Action execution with feedback
- [x] BOS insights dashboard
- [x] NVIDIA NIM service structure
- [x] Supabase client configuration
- [x] TypeScript type definitions
- [x] Development server running

### 🔨 In Progress / Pending
- [ ] Supabase database setup
- [ ] Authentication flow implementation
- [ ] NVIDIA NIM API integration
- [ ] API route creation
- [ ] Real-time state management
- [ ] Progress persistence
- [ ] Error handling
- [ ] Testing suite
- [ ] Production deployment

## 🎯 Next Steps

1. **Set up Supabase project** and configure database
2. **Implement authentication** with Supabase Auth
3. **Integrate NVIDIA NIM** models for AI-powered features
4. **Create API routes** for data persistence
5. **Add state management** for real-time updates
6. **Implement testing** and error handling
7. **Deploy to production** on Vercel

## 📝 Notes

- The design system strictly follows the Stitch Kinetic Behavioral OS specifications
- All AI calls are structured but currently use simulated responses
- The app is fully functional as a prototype with mock data
- Environmental variables need to be configured for full functionality
- The 5-step behavioral loop is implemented in the UI flow

## 🙏 Acknowledgments

Built based on the comprehensive specifications from:
- Devin Build Prompt V1 Behavioral OS
- Stitch Kinetic Behavioral OS design system
- Behavioral science principles (Fogg, Clear, Eyal)

## 📄 License

Private project - All rights reserved
