# TaskDefog 🌫️→☀️

Stop drowning in your to-do list. Extract your top 3 daily priorities from chaos.

TaskDefog uses Google's Gemini AI to categorize and prioritize messy task lists.

## Features
- AI-powered task prioritization
- Automatic categorization (Today | This Week | Can Wait)
- Beautiful dark mode UI with confetti celebrations

## Tech Stack
- Node.js + Express.js
- Google Gemini API
- Vanilla JavaScript

## Getting Started

### Prerequisites
- Node.js (v16+)
- Google Gemini API key (free at makersuite.google.com)

### Installation

1. Clone: `git clone https://github.com/harikaetikela/taskdefog.git`
2. Install: `npm install`
3. Create `.env` with: `GEMINI_API_KEY=your_key_here`
4. Run: `npm start`
5. Open: `http://localhost:3000`

## How It Works
1. Paste your messy task list
2. Frontend sends to Express backend
3. Backend calls Gemini API
4. Get back: Top 3 priorities + organized buckets
5. Celebration animation 🎉

## Project Structure taskdefog/
├── index.js # Express + Gemini
├── package.json # Dependencies
├── .env # API key (not in git)
├── .gitignore # Ignore node_modules, .env
└── public/
├── index.html # Frontend
├── style.css # Styling
└── script.js # Animations & logic## Why This Matters
- **AI Integration:** Shows LLM/Gemini API experience (job market wants this)
- **Full-Stack:** Express backend + vanilla JS frontend
- **Shipping Speed:** Built in 5 hours using AI tools effectively
- **Real Problem:** Solves actual procrastination pain

## Future Features
- User authentication
- Task history
- Pomodoro integration
- Export to PDF/CSV

## License
MIT

## Contact
- GitHub: @harikaetikela
- LinkedIn: linkedin.com/in/harikaetikela13
