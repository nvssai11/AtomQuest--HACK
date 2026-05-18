import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { api } from '../api';
import { Card, LoadingSpinner, EmptyState } from '../components/primitives';
import { Link } from 'react-router-dom';

const formatAuditAction = (entry) => {
  const labels = {
    FIELD_UPDATED: `updated ${entry.field} on a goal`,
    GOAL_UNLOCKED: 'unlocked a goal for revision',
  };
  return labels[entry.action] || entry.action;
};

const formatTimestamp = (iso) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString();
};

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;
  
  // Data States
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [goalsData, setGoalsData] = useState(null);
  const [goalsLoading, setGoalsLoading] = useState(true);
  
  // Interactive Local States
  const [mood, setMood] = useState('');
  const [moodResponse, setMoodResponse] = useState('');
  const [todoInput, setTodoInput] = useState('');
  const [todoList, setTodoList] = useState([]);

  // Live Time Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  const getGreetingQuote = (greet) => {
    switch (greet) {
      case 'Good Morning':
        return "Rise and shine! Let's align our goal sheet, set target weightages, and prepare for a highly productive quarter ahead. ☀️";
      case 'Good Afternoon':
        return "Hope your day is proceeding smoothly. Take a moment to review your goals progress, update check-ins, and keep driving excellence. 🚀";
      case 'Good Evening':
        return "Wrap up your tasks efficiently! Celebrate today's small wins and make sure your team goals are perfectly aligned. 🌟";
      default:
        return "Rest well! Clear minds lead to successful goal definitions and breakthrough strategic initiatives. 🌙";
    }
  };

  // Emojis for Mood widget
  const MOODS = [
    { emoji: '🚀', label: 'Energized', phrase: 'Fantastic! Put that dynamic energy into smashing those enterprise sales targets today! ⚡' },
    { emoji: '🧠', label: 'Focused', phrase: 'Superb! Deep focus leads to breakthrough ideas and pristine goal alignments. 🧠' },
    { emoji: '🎯', label: 'Balanced', phrase: 'Wonderful! Balanced mindset is key to consistent performance and high quality. ⚖️' },
    { emoji: '☕', label: 'Tired', phrase: 'Take a small break or grab a warm cup. Pace yourself, sustainable success is a marathon! ☕' },
    { emoji: '😟', label: 'Stressed', phrase: 'Take a deep breath. You are doing great. Connect with manager John if you need support today! 🤝' },
  ];

  const handleMoodSelect = (m) => {
    setMood(m.label);
    setMoodResponse(m.phrase);
    if (user?.id) {
      localStorage.setItem(`atomquest_mood_${user.id}`, m.label);
      localStorage.setItem(`atomquest_mood_phrase_${user.id}`, m.phrase);
    }
  };

  // Todo / Actions planner handlers
  const handleAddTodo = (e) => {
    if (e) e.preventDefault();
    if (!todoInput.trim()) return;
    const newTodo = {
      id: `todo-${Date.now()}`,
      text: todoInput.trim(),
      completed: false,
    };
    const updated = [...todoList, newTodo];
    setTodoList(updated);
    setTodoInput('');
    if (user?.id) {
      localStorage.setItem(`atomquest_todos_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleToggleTodo = (id) => {
    const updated = todoList.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTodoList(updated);
    if (user?.id) {
      localStorage.setItem(`atomquest_todos_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleDeleteTodo = (id) => {
    const updated = todoList.filter((t) => t.id !== id);
    setTodoList(updated);
    if (user?.id) {
      localStorage.setItem(`atomquest_todos_${user.id}`, JSON.stringify(updated));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [activityData, cycleData] = await Promise.all([
          api.get('/audit/recent?limit=8'),
          api.get('/cycle/current')
        ]);
        setActivity(activityData || []);
        setCycleInfo(cycleData);
      } catch (err) {
        console.error('Failed to load dashboard main stats', err);
        setActivity([]);
        setCycleInfo({ activePhase: 'Q1', year: 2025 });
      } finally {
        setActivityLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Load Goals to calculate Circular Progress Ring
    const loadGoals = async () => {
      try {
        if (role !== 'admin') {
          const gData = await api.get('/goals/me');
          setGoalsData(gData);
        }
      } catch (err) {
        console.error('Failed to load user goals for progress stats', err);
      } finally {
        setGoalsLoading(false);
      }
    };
    loadGoals();

    // Load mood from localStorage
    const savedMood = localStorage.getItem(`atomquest_mood_${user.id}`);
    const savedPhrase = localStorage.getItem(`atomquest_mood_phrase_${user.id}`);
    if (savedMood) {
      setMood(savedMood);
      setMoodResponse(savedPhrase || '');
    }

    // Load todos from localStorage or initialize defaults
    const savedTodos = localStorage.getItem(`atomquest_todos_${user.id}`);
    if (savedTodos) {
      setTodoList(JSON.parse(savedTodos));
    } else {
      let defaults = [];
      if (role === 'employee') {
        defaults = [
          { id: 't1', text: 'Align individual goal sheet weightages (Min 10% each)', completed: false },
          { id: 't2', text: 'Achieve total goal weightage of exactly 100%', completed: false },
          { id: 't3', text: 'Submit Goal Sheet for Manager review', completed: false },
          { id: 't4', text: 'Update actual achievement for Q1 check-in window', completed: false },
        ];
      } else if (role === 'manager') {
        defaults = [
          { id: 'm1', text: 'Check approval queue for direct reports\' goal sheets', completed: false },
          { id: 'm2', text: 'Push departmental Sales KPIs to target employees', completed: false },
          { id: 'm3', text: 'Provide qualitative feedback on Q1 team check-ins', completed: false },
        ];
      } else if (role === 'admin') {
        defaults = [
          { id: 'a1', text: 'Export CSV compliance reports for performance cycle', completed: false },
          { id: 'a2', text: 'Monitor auto-escalated submission delays', completed: false },
          { id: 'a3', text: 'Verify active phase and configuration constraints', completed: false },
        ];
      }
      setTodoList(defaults);
      localStorage.setItem(`atomquest_todos_${user.id}`, JSON.stringify(defaults));
    }
  }, [user, role]);

  const greetingText = getGreeting();

  // Compute stats for Circular SVG progress ring
  const totalGoals = goalsData?.goals?.length || 0;
  const sheetStatus = goalsData?.sheet?.status || 'draft';
  const totalWeightage = goalsData?.goals?.reduce((sum, g) => sum + g.weightage, 0) || 0;
  
  // Calculate average progress ring value dynamically
  let goalProgressPercent = 0;
  if (role === 'admin') {
    goalProgressPercent = 100; // Admins have everything configured
  } else {
    // Progress calculation based on goal sheet alignment & status
    if (totalGoals > 0) {
      if (sheetStatus === 'draft') goalProgressPercent = 25;
      else if (sheetStatus === 'submitted') goalProgressPercent = 50;
      else if (sheetStatus === 'approved') goalProgressPercent = 75;
      else if (sheetStatus === 'returned') goalProgressPercent = 35;
      
      // If check-ins are populated, increase progress towards 100%
      if (sheetStatus === 'approved' && totalWeightage === 100) {
        goalProgressPercent = 85;
      }
    }
  }

  // Circular progress dimensions
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalProgressPercent / 100) * circumference;

  // Connected timeline steps calculation
  const timelineSteps = [
    { key: 'goal-setting', label: 'Goal Setting' },
    { key: 'Q1', label: 'Q1 Check-in' },
    { key: 'Q2', label: 'Q2 Check-in' },
    { key: 'Q3', label: 'Q3 Check-in' },
    { key: 'Q4', label: 'Q4 Check-in' },
  ];
  
  const currentActivePhase = cycleInfo?.activePhase || 'Q1';
  let activeStepIndex = timelineSteps.findIndex(s => s.key === currentActivePhase);
  if (activeStepIndex === -1) activeStepIndex = 1; // Default fallback to Q1

  // Gamified Accolade Badges checklist
  const badgesList = [
    {
      id: 'b-pioneer',
      emoji: '🎯',
      name: 'Goal Pioneer',
      desc: 'Create and submit your first goal sheet',
      isUnlocked: role === 'admin' || sheetStatus === 'submitted' || sheetStatus === 'approved',
    },
    {
      id: 'b-perfect',
      emoji: '⚡',
      name: 'Perfect 100',
      desc: 'Achieve exactly 100% weightage on goal sheet',
      isUnlocked: role === 'admin' || (role === 'manager' && totalWeightage === 100) || (role === 'employee' && totalWeightage === 100),
    },
    {
      id: 'b-aligned',
      emoji: '🤝',
      name: 'Team Player',
      desc: 'Linked with a shared departmental KPI target',
      isUnlocked: role === 'admin' || role === 'manager' || goalsData?.goals?.some(g => g.isShared),
    },
    {
      id: 'b-star',
      emoji: '🌟',
      name: 'Superstar',
      desc: 'Have approved goals or active audits recorded',
      isUnlocked: role === 'admin' || sheetStatus === 'approved' || activity?.some(a => a.performedBy === user?.id),
    },
  ];

  return (
    <Layout>
      {/* Time-Aware Premium Greeting Banner */}
      <div className="premium-greeting-card mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="greeting-time-chip">
            Performance Sync Portal
          </div>
          <span className="text-xs opacity-80 font-semibold uppercase tracking-wider">
            🕒 {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <h1 className="premium-greeting-title">
          {greetingText}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="premium-greeting-subtitle">
          {getGreetingQuote(greetingText)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Dynamic Interactive Daily Mood Tracker Widget */}
        <div className="mood-widget flex flex-col justify-between">
          <div>
            <h3 className="text-text-primary font-bold text-sm uppercase tracking-wider mb-1">Energy Tracker</h3>
            <p className="text-xs text-text-secondary">How is your focus and daily workflow today?</p>
            <div className="mood-grid">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => handleMoodSelect(m)}
                  className={`mood-button ${mood === m.label ? 'active' : ''}`}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          {moodResponse ? (
            <div className="mood-response-card">
              <span>💡</span>
              <p className="m-0 leading-tight font-medium text-xs">{moodResponse}</p>
            </div>
          ) : (
            <div className="text-xs text-text-secondary italic text-center py-3 border border-dashed border-border-color rounded-xl mt-4">
              Select an option above to log daily energy pulse.
            </div>
          )}
        </div>

        {/* Circular SVG Goals Progress Widget */}
        <div className="circular-progress-wrap">
          <h3 className="text-text-primary font-bold text-sm uppercase tracking-wider mb-4 w-full text-left">Goal Achievement Sync</h3>
          <div className="relative flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg width="150" height="150" className="progress-ring-glow">
              <circle
                stroke="var(--border-color)"
                fill="transparent"
                strokeWidth="8"
                r={radius}
                cx="75"
                cy="75"
              />
              <circle
                className="progress-ring-circle"
                stroke="url(#blueGradient)"
                fill="transparent"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={radius}
                cx="75"
                cy="75"
              />
              <defs>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--brand-500)" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-extrabold text-text-primary">{goalProgressPercent}%</span>
              <p className="text-[10px] text-text-secondary uppercase tracking-widest m-0 font-bold">Progress</p>
            </div>
          </div>
          
          <div className="chart-legend-container">
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: 'var(--brand-500)' }}></span>
              <span>Goals Created</span>
              <span className="chart-legend-value">{role === 'admin' ? 'Active' : totalGoals}</span>
            </div>
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: '#10b981' }}></span>
              <span>Sheet Status</span>
              <span className="chart-legend-value uppercase font-bold" style={{ fontSize: '9px' }}>{role === 'admin' ? 'System' : sheetStatus}</span>
            </div>
          </div>
        </div>

        {/* Connected Performance Timeline Widget */}
        <div className="timeline-widget flex flex-col justify-between">
          <div>
            <h3 className="text-text-primary font-bold text-sm uppercase tracking-wider mb-1">Performance Timeline</h3>
            <p className="text-xs text-text-secondary">Current cycle phase progression map.</p>
          </div>

          <div className="timeline-flex-row">
            <div className="timeline-connector-bar">
              <div 
                className="timeline-connector-bar-progress" 
                style={{ width: `${(activeStepIndex / (timelineSteps.length - 1)) * 100}%` }}
              ></div>
            </div>
            {timelineSteps.map((step, idx) => {
              const isCompleted = idx < activeStepIndex;
              const isActive = idx === activeStepIndex;
              let stepClass = 'upcoming';
              if (isCompleted) stepClass = 'completed';
              if (isActive) stepClass = 'active';

              return (
                <div key={step.key} className={`timeline-node-step ${stepClass}`} title={`${step.label} (${stepClass})`}>
                  <div className="timeline-node-dot">
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className="timeline-node-label">{step.label.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-bg-primary border border-border-color rounded-xl p-3 text-xs flex items-center gap-2">
            <span>📅</span>
            <span className="font-semibold text-text-secondary">
              Active Target Phase: <span className="text-brand-600 font-bold">{cycleInfo?.activePhase || 'Q1'} Check-In window</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Interactive Quick Actions Panel */}
        <div className="quick-action-card">
          <h3 className="text-text-primary font-bold text-sm uppercase tracking-wider mb-4">Quick Links</h3>
          <div className="quick-actions-grid">
            {role === 'employee' && (
              <>
                <Link to="/goals" className="quick-action-item">
                  <div className="quick-action-icon">🎯</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">My Goals</h4>
                    <span className="quick-action-desc">Edit sheet</span>
                  </div>
                </Link>
                <Link to="/checkin" className="quick-action-item">
                  <div className="quick-action-icon">📝</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">Check-In</h4>
                    <span className="quick-action-desc">Log Q1 stats</span>
                  </div>
                </Link>
              </>
            )}
            
            {role === 'manager' && (
              <>
                <Link to="/goals" className="quick-action-item">
                  <div className="quick-action-icon">🎯</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">My Goals</h4>
                    <span className="quick-action-desc">Edit sheet</span>
                  </div>
                </Link>
                <Link to="/approvals" className="quick-action-item">
                  <div className="quick-action-icon">⏳</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">Approvals</h4>
                    <span className="quick-action-desc">Review queue</span>
                  </div>
                </Link>
                <Link to="/team-checkin" className="quick-action-item">
                  <div className="quick-action-icon">👥</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">Team Check</h4>
                    <span className="quick-action-desc">Assess Q1</span>
                  </div>
                </Link>
              </>
            )}

            {role === 'admin' && (
              <>
                <Link to="/admin" className="quick-action-item">
                  <div className="quick-action-icon">⚙️</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">Admin Panel</h4>
                    <span className="quick-action-desc">Cycle settings</span>
                  </div>
                </Link>
                <Link to="/goals" className="quick-action-item">
                  <div className="quick-action-icon">🎯</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">Shared Goals</h4>
                    <span className="quick-action-desc">Manage KPIs</span>
                  </div>
                </Link>
                <Link to="/reports" className="quick-action-item">
                  <div className="quick-action-icon">📋</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">Reports</h4>
                    <span className="quick-action-desc">CSV exports</span>
                  </div>
                </Link>
                <Link to="/analytics" className="quick-action-item">
                  <div className="quick-action-icon">📈</div>
                  <div className="quick-action-info">
                    <h4 className="quick-action-title">Analytics</h4>
                    <span className="quick-action-desc">Graphs & metrics</span>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Gamified Accolades & Badges Widget */}
        <div className="badges-widget">
          <h3 className="text-text-primary font-bold text-sm uppercase tracking-wider mb-1">Growth & Accolades</h3>
          <p className="text-xs text-text-secondary">Earn enterprise achievement awards through portal compliance.</p>
          <div className="badges-grid">
            {badgesList.map((badge) => (
              <div 
                key={badge.id} 
                className={`badge-item-card ${badge.isUnlocked ? 'unlocked' : 'locked'}`}
                title={badge.isUnlocked ? `Unlocked: ${badge.desc}` : `Locked: ${badge.desc}`}
              >
                {!badge.isUnlocked && <span className="badge-lock-indicator">🔒</span>}
                <div className="badge-icon-badge">
                  {badge.emoji}
                </div>
                <h4 className="badge-card-name">{badge.name}</h4>
                <p className="badge-card-desc">{badge.isUnlocked ? 'Completed' : 'Setup required'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Action Planner / To-Do Checklist Widget */}
        <div className="todo-widget">
          <h3 className="text-text-primary font-bold text-sm uppercase tracking-wider mb-1">Action Planner</h3>
          <p className="text-xs text-text-secondary">Personal tracking checklists for quarterly cycle deadlines.</p>
          <form onSubmit={handleAddTodo} className="todo-input-wrap">
            <input
              type="text"
              className="todo-input-field"
              placeholder="Add next checklist action item..."
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
            />
            <button type="submit" className="todo-add-button">
              + Add
            </button>
          </form>

          <div className="todo-items-list">
            {todoList.length === 0 ? (
              <p className="text-xs text-text-secondary italic text-center py-4">No pending action tasks. Well done!</p>
            ) : (
              todoList.map((todo) => (
                <div key={todo.id} className={`todo-item-row ${todo.completed ? 'completed' : ''}`}>
                  <input
                    type="checkbox"
                    className="todo-item-checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo.id)}
                  />
                  <span className="todo-item-text">{todo.text}</span>
                  <button
                    type="button"
                    className="todo-item-delete"
                    onClick={() => handleDeleteTodo(todo.id)}
                    title="Delete item"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Audit Activity card */}
      <Card className="border-t-4 border-t-brand-500">
        <h2 className="text-xl font-bold mb-4">Recent Corporate Audit Trail</h2>
        {activityLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : activity.length === 0 ? (
          <EmptyState 
            title="No recent activity" 
            description="Audit events and recent actions will appear here." 
            icon="📭" 
          />
        ) : (
          <div className="activity-timeline">
            {activity.map((entry) => (
              <div
                key={entry.id}
                className="activity-item-premium"
              >
                <div className="activity-avatar">
                  {entry.performedByName?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {entry.performedByName} {formatAuditAction(entry)}
                  </p>
                  {entry.reason && (
                    <p className="text-sm text-text-secondary mt-1">{entry.reason}</p>
                  )}
                  <span className="text-xs text-text-secondary mt-2 block">
                    🕒 {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default Dashboard;
