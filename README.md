SHT: Smart Habit Tracker
Elevate your daily habits with gamification and AI-powered insights.

About the Project
A window app that helps users build and maintain good habits by tracking daily activities, providing motivational gamification elements, and using AI to offer personalized insights and suggestions.

Key Features
Habit Tracking Dashboard
Users can add, edit, and delete habits they want to build.
Visual calendar or progress bars to show streaks and completion rates.sssssssss
Gamificationsss
Earn points, badges, or rewards for completing habits consistently.
Levels or challenges to keep users engaged.s
Friendly competition with friends or community leaderboards.

Tech Stack
┌─────────────────────────────────┐
│        Electron Shell           │  ← wraps everything into a .exe
│  ┌───────────────────────────┐  │
│  │     React UI (Renderer)   │  │  ← all your visual components
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │   Electron Main Process   │  │  ← talks to the database
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │   SQLite DB (local file)  │  │  ← stores all data on disk
│  └───────────────────────────┘  │
└─────────────────────────────────┘
