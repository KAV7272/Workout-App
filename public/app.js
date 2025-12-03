const STORAGE_KEY = 'workoutAppState';
const DEFAULT_EXERCISES = [
  { id: 'pushups', name: 'Push-ups', icon: '💪' },
  { id: 'squats', name: 'Air Squats', icon: '🏋️' },
  { id: 'lunges', name: 'Lunges', icon: '🦵' },
  { id: 'plank', name: 'Plank', icon: '🛡️' },
  { id: 'burpees', name: 'Burpees', icon: '⚡' },
  { id: 'crunches', name: 'Crunches', icon: '📦' }
];

let state = loadState();
const elements = {
  weekRange: document.getElementById('week-range'),
  weightPill: document.getElementById('weight-pill'),
  completed: document.getElementById('completed-count'),
  goal: document.getElementById('goal-count'),
  progress: document.getElementById('progress-bar'),
  exerciseGrid: document.getElementById('exercise-grid'),
  historyRows: document.getElementById('history-rows'),
  modal: document.getElementById('modal'),
  goalInput: document.getElementById('goal-input'),
  weightInput: document.getElementById('weight-input'),
  weekForm: document.getElementById('week-form')
};

init();

function init() {
  const rolled = rollWeekIfNeeded();
  bindEvents();
  renderExercises();
  updateUI();
  if (rolled || !state.weeklyGoal || !state.currentWeight) {
    openModal();
  }
  exposeTrendAPI();
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab, tab));
  });

  document.getElementById('log-workout').addEventListener('click', () => {
    state.completedWorkouts += 1;
    persistState();
    updateUI();
  });

  document.getElementById('reset-week').addEventListener('click', () => {
    if (confirm('Reset this week? Progress and toggles will clear.')) {
      state.completedWorkouts = 0;
      state.exercises = {};
      persistState();
      renderExercises();
      updateUI();
    }
  });

  document.getElementById('clear-exercises').addEventListener('click', () => {
    state.exercises = {};
    persistState();
    renderExercises();
  });

  document.getElementById('open-settings').addEventListener('click', openModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  elements.weekForm.addEventListener('submit', event => {
    event.preventDefault();
    const goalValue = parseInt(elements.goalInput.value, 10);
    const weightValue = parseFloat(elements.weightInput.value);
    if (!Number.isFinite(goalValue) || goalValue <= 0) return;
    if (!Number.isFinite(weightValue) || weightValue <= 0) return;

    state.weeklyGoal = goalValue;
    state.currentWeight = weightValue;
    persistState();
    updateUI();
    closeModal();
  });
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const weekStart = getWeekStartString(new Date());
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        weeklyGoal: parsed.weeklyGoal || 3,
        currentWeight: parsed.currentWeight || null,
        completedWorkouts: parsed.completedWorkouts || 0,
        currentWeekStart: parsed.currentWeekStart || weekStart,
        history: parsed.history || [],
        exercises: parsed.exercises || {}
      };
    } catch (e) {
      console.error('Failed to parse state', e);
    }
  }
  return {
    weeklyGoal: 3,
    currentWeight: null,
    completedWorkouts: 0,
    currentWeekStart: weekStart,
    history: [],
    exercises: {}
  };
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getWeekStartString(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatRange(startStr) {
  const start = new Date(startStr);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function rollWeekIfNeeded() {
  const todayStart = getWeekStartString(new Date());
  if (state.currentWeekStart !== todayStart) {
    if (state.currentWeekStart) {
      state.history.unshift({
        weekStart: state.currentWeekStart,
        weekEnd: formatRange(state.currentWeekStart),
        goal: state.weeklyGoal,
        completed: state.completedWorkouts,
        weight: state.currentWeight
      });
    }
    state.currentWeekStart = todayStart;
    state.completedWorkouts = 0;
    state.exercises = {};
    persistState();
    return true;
  }
  return false;
}

function renderExercises() {
  elements.exerciseGrid.innerHTML = '';
  DEFAULT_EXERCISES.forEach(ex => {
    const active = Boolean(state.exercises[ex.id]);
    const card = document.createElement('div');
    card.className = `exercise${active ? ' active' : ''}`;
    card.innerHTML = `
      <span class="icon">${ex.icon}</span>
      <span class="name">${ex.name}</span>
      <span class="toggle"></span>
    `;
    card.addEventListener('click', () => {
      state.exercises[ex.id] = !active;
      persistState();
      renderExercises();
    });
    elements.exerciseGrid.appendChild(card);
  });
}

function updateUI() {
  const weekRange = formatRange(state.currentWeekStart);
  elements.weekRange.textContent = weekRange;
  elements.weightPill.textContent = state.currentWeight ? `Weight: ${state.currentWeight} lbs` : 'Weight: —';
  elements.completed.textContent = state.completedWorkouts;
  elements.goal.textContent = state.weeklyGoal || 0;

  const percent = state.weeklyGoal ? Math.min((state.completedWorkouts / state.weeklyGoal) * 100, 120) : 0;
  elements.progress.style.width = `${percent}%`;

  renderHistory();
}

function renderHistory() {
  elements.historyRows.innerHTML = '';
  const combined = [
    {
      weekStart: state.currentWeekStart,
      weekEnd: formatRange(state.currentWeekStart),
      completed: state.completedWorkouts,
      goal: state.weeklyGoal,
      weight: state.currentWeight,
      current: true
    },
    ...state.history
  ];

  combined.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <span>${entry.weekEnd || formatRange(entry.weekStart)}</span>
      <span>${entry.completed} / ${entry.goal}</span>
      <span>${entry.weight ? `${entry.weight} lbs` : '—'}</span>
    `;
    if (entry.current) row.classList.add('current-row');
    elements.historyRows.appendChild(row);
  });
}

function switchTab(panelId, tabEl) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  tabEl.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

function openModal() {
  elements.goalInput.value = state.weeklyGoal || 3;
  elements.weightInput.value = state.currentWeight || '';
  elements.modal.classList.add('show');
}

function closeModal() {
  elements.modal.classList.remove('show');
}

function exposeTrendAPI() {
  window.trendAPI = {
    getSeries: () => {
      const points = [
        ...state.history.map(item => ({
          weekStart: item.weekStart,
          label: item.weekEnd || formatRange(item.weekStart),
          weight: item.weight,
          completionRate: item.goal ? item.completed / item.goal : 0
        })),
        {
          weekStart: state.currentWeekStart,
          label: formatRange(state.currentWeekStart),
          weight: state.currentWeight,
          completionRate: state.weeklyGoal ? state.completedWorkouts / state.weeklyGoal : 0
        }
      ];
      return points.filter(p => p.weight || p.completionRate);
    }
  };
}
