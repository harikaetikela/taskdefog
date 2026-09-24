# TaskDefog 🌫️→☀️

**AI-powered task prioritization tool that turns a chaotic to-do list into a focused daily plan.**

TaskDefog uses Google's Gemini API to analyze unstructured task lists and automatically surface the top 3 priorities for the day, while organizing the rest into actionable buckets — reducing the cognitive load of deciding what to work on next.

## Features

* **AI-powered prioritization** — Paste a messy list of tasks; Gemini analyzes and structures them into a clear daily plan.
* **Smart categorization** — Tasks are automatically sorted into **Top 3 Today**, **Quick Wins (<10 min)**, **This Week**, and **Can Wait**.
* **Per-task Pomodoro timers** — Built-in focus timers with preset (15/25/45/60 min) and custom durations, plus pause/resume/skip controls and audio completion alerts.
* **Reality check banner** — Flags when a task list is overloaded (>7 tasks) and nudges realistic daily expectations.
* **Progress visualization** — Optional animated progress tracking with flower growth or race-to-finish modes.
* **Markdown export** — Copy the full daily plan (priorities, quick wins, weekly tasks, summary) to the clipboard as formatted Markdown.
* **Dark mode UI**

## Tech Stack

* **Backend:** Node.js, Express.js
* **AI:** Google Gemini API
* **Frontend:** Vanilla JavaScript, HTML, CSS

## Getting Started

### Prerequisites

* Node.js (v16+)
* Google Gemini API key

### Installation

```bash
git clone https://github.com/harikaetikela/taskdefog.git
cd taskdefog
npm install
```

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_key_here
```

Run the application:

```bash
npm start
```

Open http://localhost:3000 in your browser.

## How It Works

1. User pastes a raw, unstructured task list into the interface.
2. The frontend sends the input to the Express backend.
3. The backend calls the Gemini API with a structured prompt requesting a JSON response.
4. Gemini returns prioritized and categorized tasks (**Top 3**, **Quick Wins**, **This Week**, and **Can Wait**).
5. The frontend renders the plan, with optional Pomodoro timers per task and progress visualization.

## Project Structure

```text
taskdefog/
├── index.js              # Express server + Gemini API integration
├── package.json          # Dependencies and scripts
├── .env                  # API key (not committed)
├── .gitignore
└── public/
    ├── index.html        # Frontend markup
    ├── style.css         # Styling
    └── script.js         # Timer logic, UI rendering, and animations
```

## Roadmap

* User authentication
* Task history / persistence across sessions
* Export to PDF/CSV
* Public deployment

## Why This Project

Built to address a real productivity problem — decision paralysis when facing a large, unstructured task list — using an AI-assisted development workflow (Google AI Studio, Antigravity) to move from concept to a working prototype.

## License

MIT

## Contact

* GitHub: [@harikaetikela](https://github.com/harikaetikela)
* LinkedIn: [linkedin.com/in/harikaetikela13](https://linkedin.com/in/harikaetikela13)
