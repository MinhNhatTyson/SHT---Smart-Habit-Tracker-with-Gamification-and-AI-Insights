# SHT: Smart Habit Tracker
*Elevate your daily habits with gamification and AI-powered insights.*

## About the Project
A Windows app that helps users build and maintain good habits by tracking daily activities, providing motivational gamification elements, and using AI to offer personalized insights and suggestions.

## Key Features
- **Habit Tracking Dashboard**
  - Users can add, edit, and delete habits they want to build.
  - Visual calendar or progress bars to show streaks and completion rates.

- **Gamification**
  - Earn points, badges, or rewards for completing habits consistently.
  - Levels or challenges to keep users engaged.
  - Friendly competition with friends or community leaderboards.
- **AI-Powered Insights**
  - Analyze user data to identify patterns (e.g., best time of day for certain habits).
  - Suggest habit adjustments or new habits based on user goals and progress.
  - Provide motivational messages or reminders tailored to user behavior.


## Tech Stack

```
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
```
