Frontend Feature Tracker

Project Context

This React-based front-end is part of a simple time-tracking MVP application with a back-end API and PostgreSQL database. The core user flow is:
	1.	Start: User presses the “Start” button to begin timing an activity. A new entry is created via POST .
	2.	Stop: User presses the “Stop” button to end timing. The app pauses the timer and opens a metadata form.
	3.	Metadata: User provides a Name (required), Description (optional), and Category (optional). The form submits via POST .
	4.	Save: The completed entry is saved in the database, and the UI resets for a new timing session.

Tech Stack: React 18 + TypeScript, Vite, Tailwind CSS, React Context + Hooks, React Hook Form, Axios (or fetch), ESLint, Prettier.

Use this document to track which front-end features have been implemented versus missing.
