# Manifesting Motivation AI

An AI-powered full-stack web application for goal setting, motivation tracking, personal development, and emotional well-being. Users can set goals, maintain journals, receive AI-generated motivation, track progress with visual analytics, engage in gamification, and use voice input for accessibility.

## Philosophy

**A motivation app must NEVER make the user feel like they failed.** It must always find a way to say "you moved forward today." This is our competitive advantage over ChatGPT — the app is **always on the user's side**. Every step, every reflection, every effort moves the user closer to their goal.

## Features

### 🎯 Adaptive Goals System (New)
- **Personalized Roadmaps**: AI creates step-by-step goals adapted to user's time constraints and learning style
- **Intake Interview**: Smart questionnaire asking daily time available (15 mins - 2+ hours), learning style (videos, reading, practice, mix), and knowledge level
- **Realistic Step Sizing**: Steps automatically adjust based on available daily time
- **Learning Proof System**: Friendly verification that celebrates every step without rejection
- **Skip Option**: Users can skip reflections and still get XP — no shame in moving forward
- **Warm Encouragement**: AI coach provides specific, positive feedback on every completed step
- **XP Rewards**: +15 XP for reflections, +10 XP for skips, +100 bonus for completing all steps
- **Micro-task Breakdown**: If struggling, AI breaks steps into 3 tiny 5-10 min tasks

### Core Functionality
- **User Authentication**: Secure registration and login with JWT tokens
- **Persona Selection**: Choose from different motivational personas (e.g., student, professional, fitness, creative, general)
- **Goal Management**: Create, track, and complete goals with streak counting
- **Journaling**: Daily reflection entries with mood tracking and AI insights
- **AI Motivation Sessions**: Interactive conversations with AI for motivation and guidance
- **Daily Quotes**: Curated inspirational quotes by category
- **Progress Analytics**: Visual charts showing goal completion and emotion trends
- **Voice Input**: Hands-free interaction using Web Speech API for accessibility
- **Weekly Summaries**: Comprehensive progress reports
- **Daily Check-ins**: Mood tracking with AI-powered responses
- **Gamification System**: XP, levels, badges, and achievements
- **AI Memory**: Personalized responses based on user history
- **Goal Predictor**: AI-powered success likelihood predictions
- **Content Safety**: Automatic filtering of inappropriate content
- **Admin Dashboard**: Analytics and user management for administrators

### Technical Features
- **Responsive Design**: Mobile-friendly React interface
- **Real-time Updates**: Dynamic dashboard with live data
- **Data Visualization**: Interactive charts using Recharts
- **RESTful API**: Well-structured backend endpoints
- **Database Persistence**: SQLite with SQLAlchemy ORM
- **Sentiment Analysis**: Emotion detection using VADER
- **AI Integration**: Groq-powered conversational AI (llama-3.3-70b-versatile model)

## Tech Stack

### Frontend
- **React 19**: Modern JavaScript library for building user interfaces
- **JavaScript (ES6+)**: Core programming language
- **CSS3**: Styling and responsive design
- **Axios**: HTTP client for API communication
- **Recharts**: Chart library for data visualization
- **React Hot Toast**: Notification system
- **Web Speech API**: Voice input functionality
- **Create React App**: Build tooling and development server

### Backend
- **Flask**: Lightweight Python web framework
- **SQLAlchemy**: Database ORM for data modeling
- **SQLite**: File-based database for development
- **Flask-JWT-Extended**: JSON Web Token authentication
- **Flask-CORS**: Cross-origin resource sharing
- **python-dotenv**: Environment variable management

### Database Schema
- **Users**: User accounts with persona preferences, gamification data (XP, level, badges)
- **Goals**: Goal tracking with completion status, roadmap (JSON steps), and interview preferences
- **Goal Steps**: Individual step tracking (completed status, user answer, AI feedback, score)
- **Journal Entries**: Daily reflections with mood analysis and AI insights
- **Motivation Sessions**: AI conversation history with emotion scores
- **Daily Quotes**: Inspirational content database
- **Check-ins**: Daily mood tracking with AI responses
- **AI Memory**: Personalized user context for AI interactions

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn
- A Groq API key (sign up at [groq.com](https://groq.com))

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Set up environment variables:
   Create a `.env` file in the backend directory with:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   SECRET_KEY=your_secret_key_here
   JWT_SECRET_KEY=your_jwt_secret_key_here
   DATABASE_URL=sqlite:///motivation.db
   ```

6. Start the Flask server:
   ```bash
   python app.py
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile (protected)

### Goals
- `GET /api/goals` - Get user's goals
- `POST /api/goals` - Create new goal
- `PATCH /api/goals/<id>/complete` - Mark goal as complete
- `DELETE /api/goals/<id>` - Delete goal

### Adaptive Goals (AI-Powered Personalized Roadmaps)
- `POST /api/adaptive/interview` - Create personalized roadmap (accepts daily_time, learning_style, current_level)
- `POST /api/adaptive/prove/<goal_id>/<step_index>` - Submit step completion proof (always passes, gives XP and encouragement)
  - **Request**: `{ user_id, answer, skipped }`
  - **Response**: `{ passed: true, feedback, xp_gained, next_step, goal_completed, message }`
  - **Feature**: Never rejects. User can skip (+10 XP) or write reflection (+15 XP with AI encouragement)
- `POST /api/adaptive/struggle/<goal_id>/<step_index>` - Get micro-task breakdown when struggling
- `GET /api/goals/<id>/steps` - Get step completion status

### Journal
- `GET /api/journal` - Get journal entries
- `POST /api/journal` - Create journal entry
- `PUT /api/journal/<id>` - Update entry
- `DELETE /api/journal/<id>` - Delete entry

### Motivation
- `POST /api/motivation/chat` - AI motivation session
- `GET /api/motivation/history` - Get session history

### Quotes
- `GET /api/quotes` - Get daily quotes
- `GET /api/quotes/<category>` - Get quotes by category

### Check-ins
- `POST /api/checkin` - Submit daily mood check-in
- `GET /api/checkin` - Get user's check-in history

### Gamification
- `GET /api/gamification/stats` - Get user's XP, level, and badges
- `POST /api/gamification/award` - Award XP for actions

### AI Memory
- `GET /api/memory` - Get user's AI memory context
- `POST /api/memory` - Update AI memory

### Goal Predictor
- `POST /api/predictor/predict` - Predict goal success likelihood

### Admin
- `GET /api/admin/stats` - Get system statistics (admin only)

## Project Structure

```
manifesting-motivation-ai/
├── backend/
│   ├── app.py                    # Main Flask application
│   ├── config.py                 # Configuration settings
│   ├── models.py                 # Database models
│   ├── requirements.txt          # Python dependencies
│   ├── fix_all.py                # Database utilities
│   ├── upgrade_db.py             # Schema upgrades
│   └── routes/
│       ├── adaptive_goals.py     # AI-powered adaptive goal roadmaps (NEW)
│       ├── admin.py              # Admin dashboard endpoints
│       ├── auth.py               # Authentication endpoints
│       ├── checkin.py            # Daily check-in functionality
│       ├── gamification.py       # XP and badge system
│       ├── goals.py              # Basic goal management
│       ├── journal.py            # Journal functionality
│       ├── memory.py             # AI memory management
│       ├── motivation.py         # AI motivation chat
│       ├── predictor.py          # Goal prediction
│       ├── quotes.py             # Quote management
│       └── safety.py             # Content safety filtering
├── frontend/
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   └── src/
│       ├── components/
│       │   ├── ConfirmDialog.jsx
│       │   ├── EmptyState.jsx
│       │   ├── GoalCard.jsx
│       │   ├── IntakeInterview.jsx     # NEW: Interview quiz component
│       │   ├── PersonaPicker.jsx
│       │   ├── ProgressChart.jsx
│       │   ├── Sidebar.jsx
│       │   ├── Skeleton.jsx
│       │   ├── Toast.jsx
│       │   └── VoiceInput.jsx
│       ├── pages/
│       │   ├── AdminDashboard.jsx
│       │   ├── AIMemory.jsx
│       │   ├── Auth.jsx
│       │   ├── CheckIn.jsx
│       │   ├── Dashboard.jsx
│       │   ├── EmotionTrends.jsx
│       │   ├── Gamification.jsx
│       │   ├── GoalPredictor.jsx
│       │   ├── Goals.jsx                # UPDATED: Proof UI now friendly
│       │   ├── History.jsx
│       │   ├── Journal.jsx
│       │   ├── PrivacyConsole.jsx
│       │   ├── VoiceSettings.jsx
│       │   └── WeeklySummary.jsx
│       ├── App.js
│       ├── App.css
│       ├── index.js
│       └── index.css
└── README.md
```

## Usage

### Standard Workflow
1. **Registration/Login**: Create an account or sign in
2. **Persona Selection**: Choose your motivational persona
3. **Goal Setting**: Add and track your goals
4. **Daily Journaling**: Write reflections and track mood
5. **AI Motivation**: Chat with AI for personalized motivation
6. **Progress Tracking**: View charts and analytics
7. **Voice Input**: Use voice commands for hands-free interaction
8. **Daily Check-ins**: Share your mood and get AI responses
9. **Gamification**: Earn XP, level up, and unlock badges
10. **AI Memory**: Benefit from personalized AI interactions
11. **Goal Prediction**: Get insights on goal success likelihood

### Adaptive Goals Workflow (New)
1. **Create Goal**: Set a goal title and category
2. **Take Interview**: Answer 3 quick questions:
   - Daily time available? (15 mins, 30 mins, 1 hour, 2+ hours)
   - Learning style? (videos, reading, practice, mix)
   - Knowledge level? (beginner, intermediate, advanced)
3. **AI Generates Roadmap**: Get 3-5 personalized steps matching your constraints
4. **Complete Steps**: For each step:
   - **Option A**: Write a reflection → Get AI encouragement + 15 XP
   - **Option B**: Skip → Get default encouragement + 10 XP
   - **Both options advance**: No rejection, just forward progress
5. **Struggling?**: Click "I am Struggling" → Get 3 mini 5-10 min tasks
6. **Complete All**: Get +100 bonus XP when all steps are done
7. **Success**: Step turns green ✓, progress bar fills, celebration!

## Development

### Running Tests
```bash
# Frontend tests
cd frontend
npm test

# Backend tests (if implemented)
cd backend
python -m pytest
```

### Building for Production
```bash
# Frontend build
cd frontend
npm run build

# Backend deployment
# Configure production database in config.py
# Use a WSGI server like Gunicorn
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## The Friendly Proof System

### Why It's Different
Traditional learning apps reject users: "Your answer is incomplete. Try again." This kills motivation. 

Manifesting Motivation AI **always says yes**. Every attempt moves you forward.

### How It Works
When a user completes a step, they have **two options**:

**Option 1: Write a Reflection** (+15 XP)
- "What did you learn or practice?"
- AI reads it and responds with warm, specific encouragement
- Example AI response: "That's a great insight about indentation! It's actually Python's superpower for readability."

**Option 2: Skip** (+10 XP)
- "I'm done with this step"
- Instant encouragement: "Step marked done! Every step forward counts. Keep going!"
- Same XP almost as reflecting (only 5 less)

### The Result
Users feel:
- ✓ Progress (step turns green immediately)
- ✓ Rewarded (XP shows effort was valued)
- ✓ Safe (no judgment, no rejection)
- ✓ Motivated (comeback tomorrow for more)

### Code Implementation
Backend (`/adaptive/prove/<goal_id>/<step_index>`):
```python
# ALWAYS pass — either with reflection or skipped
if skipped or not user_answer:
    feedback = f"Step marked done! Every step forward counts. Keep going!"
    xp_gain  = 10
else:
    # AI gives encouraging, never rejecting feedback
    feedback = client.chat.completions.create(...)  # Always positive
    xp_gain  = 15
# Mark step complete — ALWAYS
db.execute("UPDATE goal_steps SET completed=1, ...")
```

Frontend (`Goals.jsx`):
```jsx
<button onClick={() => submitProof(i)}>
  {submitting ? "Saving..." : "Done! +15 XP"}
</button>
<button onClick={() => {
  setUserAnswer("skipped");
  submitProof(i);
}}>
  Skip +10 XP
</button>
```

This is the **competitive advantage** over ChatGPT or Duolingo: Manifesting Motivation AI is **always on your side**.

## License

This project is licensed under the MIT License.

## Future Enhancements

- Mobile app development
- Advanced AI models for better motivation
- Social features for community support
- Integration with wearable devices
- Multi-language support
- Advanced analytics and insights

## Troubleshooting

### Common Backend Issues

**Virtual Environment Activation Fails**
- Ensure you're using the correct command for your OS
- Windows PowerShell: `venv\Scripts\activate`
- Windows Command Prompt: `venv\Scripts\activate.bat`
- macOS/Linux: `source venv/bin/activate`
- If activation still fails, try: `python -m venv venv` again or check Python installation

**Missing API Key**
- Ensure you have a valid Groq API key in your `.env` file
- Sign up at [groq.com](https://groq.com) if you don't have one
- Restart the backend server after adding the key

**Flask Server Won't Start**
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check if port 5000 is available
- Verify you're in the backend directory
- Try: `python app.py` or `flask run`

**Database Connection Issues**
- The app uses SQLite, so no separate database setup is needed
- Database file `motivation.db` will be created automatically in the backend directory
- If issues persist, delete `motivation.db` and restart the server

### Common Frontend Issues

**npm install Fails**
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules` (Windows: `rd /s /q node_modules`)
- Reinstall: `npm install`

**npm start Fails**
- Ensure Node.js version is 16+
- Check if port 3000 is available
- Try clearing cache and reinstalling dependencies
- If using Windows, ensure you're not running as administrator unless necessary

**CORS Errors**
- Backend must be running on port 5000
- Frontend expects API at `http://localhost:5000/api`
- Check Flask-CORS is properly configured in backend

### General Issues

**Port Conflicts**
- Backend: Change port in `app.py` (line with `app.run(debug=True, port=5000)`)
- Frontend: Create React App will automatically use next available port, or set `PORT=3001 npm start`

**Python Version Issues**
- Ensure Python 3.8+ is installed and in PATH
- Use `python --version` to check
- If multiple Python versions, use `python3` instead of `python`

**Voice Input Not Working**
- Voice input requires a modern browser with microphone support (Chrome recommended)
- Ensure microphone permissions are granted
- Check browser console for Web Speech API errors

### Getting Help
- Check terminal output for specific error messages
- Verify all prerequisites are installed
- Ensure you're in the correct directory for each command
- Try restarting your terminal/command prompt
