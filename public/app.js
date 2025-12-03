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
let selectedExercise = null;

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
  weekForm: document.getElementById('week-form'),
  logModal: document.getElementById('log-modal'),
  logModalTitle: document.getElementById('log-modal-title'),
  logForm: document.getElementById('log-form'),
  logSets: document.getElementById('log-sets'),
  logReps: document.getElementById('log-reps'),
  milesThisWeek: document.getElementById('miles-this-week'),
  milesToday: document.getElementById('miles-today'),
  todayLog: document.getElementById('today-log'),
  cardioInput: document.getElementById('cardio-input')
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

  document.getElementById('reset-week').addEventListener('click', () => {
    if (confirm('Reset this week? Progress and logs will clear.')) {
      state.completedWorkouts = 0;
      state.exercises = {};
      state.workoutsByDate = {};
      state.cardioByDate = {};
      persistState();
      renderExercises();
      updateUI();
    }
  });

  document.getElementById('clear-exercises').addEventListener('click', () => {
    const today = getTodayKey();
    delete state.workoutsByDate[today];
    state.exercises = {};
    state.completedWorkouts = getWeeklyWorkoutCount();
    persistState();
    renderExercises();
    updateUI();
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

  document.getElementById('cancel-log').addEventListener('click', closeLogModal);
  elements.logForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!selectedExercise) return;
    const sets = parseInt(elements.logSets.value, 10);
    const reps = parseInt(elements.logReps.value, 10);
    if (!Number.isFinite(sets) || sets <= 0) return;
    if (!Number.isFinite(reps) || reps <= 0) return;
    logExercise(selectedExercise, sets, reps);
    closeLogModal();
  });

  document.getElementById('log-cardio').addEventListener('click', () => {
    const miles = parseFloat(elements.cardioInput.value);
    if (!Number.isFinite(miles) || miles <= 0) return;
    const today = getTodayKey();
    const current = state.cardioByDate[today] || 0;
    state.cardioByDate[today] = +(current + miles).toFixed(2);
    elements.cardioInput.value = '';
    persistState();
    updateUI();
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
        exercises: parsed.exercises || {},
        workoutsByDate: parsed.workoutsByDate || {},
        cardioByDate: parsed.cardioByDate || {}
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
    exercises: {},
    workoutsByDate: {},
    cardioByDate: {}
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

function getTodayKey() {
  const d = new Date();
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
        completed: getWeeklyWorkoutCount(),
        weight: state.currentWeight,
        miles: getWeeklyMiles()
      });
    }
    state.currentWeekStart = todayStart;
    state.completedWorkouts = 0;
    state.exercises = {};
    state.workoutsByDate = {};
    state.cardioByDate = {};
    persistState();
    return true;
  }
  return false;
}

function renderExercises() {
  elements.exerciseGrid.innerHTML = '';
  const today = getTodayKey();
  const todaysEntries = state.workoutsByDate[today] || [];
  DEFAULT_EXERCISES.forEach(ex => {
    const isLoggedToday = todaysEntries.some(entry => entry.exerciseId === ex.id);
    const card = document.createElement('div');
    card.className = `exercise${isLoggedToday ? ' active' : ''}`;
    card.innerHTML = `
      <span class="icon">${ex.icon}</span>
      <span class="name">${ex.name}</span>
      <span class="toggle"></span>
    `;
    card.addEventListener('click', () => {
      selectedExercise = ex;
      openLogModal(ex.name);
    });
    elements.exerciseGrid.appendChild(card);
  });
}

function updateUI() {
  const weekRange = formatRange(state.currentWeekStart);
  elements.weekRange.textContent = weekRange;
  elements.weightPill.textContent = state.currentWeight ? `Weight: ${state.currentWeight} lbs` : 'Weight: —';

  state.completedWorkouts = getWeeklyWorkoutCount();
  elements.completed.textContent = state.completedWorkouts;
  elements.goal.textContent = state.weeklyGoal || 0;

  const percent = state.weeklyGoal ? Math.min((state.completedWorkouts / state.weeklyGoal) * 100, 120) : 0;
  elements.progress.style.width = `${percent}%`;

  elements.milesThisWeek.textContent = getWeeklyMiles().toFixed(2);
  elements.milesToday.textContent = (state.cardioByDate[getTodayKey()] || 0).toFixed(2);

  renderTodayLog();
  renderHistory();
  renderExercises();
}

function renderTodayLog() {
  const today = getTodayKey();
  const exercises = state.workoutsByDate[today] || [];
  const cardio = state.cardioByDate[today] || 0;

  elements.todayLog.innerHTML = '';

  const exerciseList = document.createElement('div');
  exerciseList.className = 'log-list';
  exerciseList.innerHTML = `<h4>Strength</h4>`;
  if (exercises.length === 0) {
    exerciseList.innerHTML += `<p class="muted">No sets logged yet.</p>`;
  } else {
    exercises.forEach(entry => {
      const def = DEFAULT_EXERCISES.find(ex => ex.id === entry.exerciseId);
      const item = document.createElement('div');
      item.className = 'log-item';
      item.textContent = `${def ? def.name : entry.exerciseId}: ${entry.sets} x ${entry.reps}`;
      exerciseList.appendChild(item);
    });
  }

  const cardioList = document.createElement('div');
  cardioList.className = 'log-list';
  cardioList.innerHTML = `<h4>Cardio</h4>`;
  if (!cardio) {
    cardioList.innerHTML += `<p class="muted">No miles logged yet.</p>`;
  } else {
    cardioList.innerHTML += `<div class="log-item">${cardio} miles</div>`;
  }

  elements.todayLog.appendChild(exerciseList);
  elements.todayLog.appendChild(cardioList);
}

function renderHistory() {
  elements.historyRows.innerHTML = '';
  const combined = [
    {
      weekStart: state.currentWeekStart,
      weekEnd: formatRange(state.currentWeekStart),
      completed: getWeeklyWorkoutCount(),
      goal: state.weeklyGoal,
      weight: state.currentWeight,
      miles: getWeeklyMiles(),
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
      <span>${entry.miles ? entry.miles.toFixed(2) : '0.00'}</span>
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

function openLogModal(name) {
  elements.logModalTitle.textContent = `Log ${name}`;
  elements.logSets.value = '';
  elements.logReps.value = '';
  elements.logModal.classList.add('show');
  elements.logSets.focus();
}

function closeLogModal() {
  elements.logModal.classList.remove('show');
  selectedExercise = null;
}

function logExercise(exercise, sets, reps) {
  const today = getTodayKey();
  if (!state.workoutsByDate[today]) {
    state.workoutsByDate[today] = [];
  }
  state.workoutsByDate[today].push({ exerciseId: exercise.id, sets, reps });
  state.exercises[exercise.id] = true;
  state.completedWorkouts = getWeeklyWorkoutCount();
  persistState();
  updateUI();
}

function getWeeklyWorkoutCount() {
  const weekStart = state.currentWeekStart;
  let total = 0;
  Object.entries(state.workoutsByDate).forEach(([dateStr, entries]) => {
    if (getWeekStartString(dateStr) === weekStart) {
      total += entries.length;
    }
  });
  return total;
}

function getWeeklyMiles() {
  const weekStart = state.currentWeekStart;
  let total = 0;
  Object.entries(state.cardioByDate).forEach(([dateStr, miles]) => {
    if (getWeekStartString(dateStr) === weekStart) {
      total += miles;
    }
  });
  return total;
}

function exposeTrendAPI() {
  window.trendAPI = {
    getSeries: () => {
      const points = [
        ...state.history.map(item => ({
          weekStart: item.weekStart,
          label: item.weekEnd || formatRange(item.weekStart),
          weight: item.weight,
          completionRate: item.goal ? item.completed / item.goal : 0,
          miles: item.miles || 0
        })),
        {
          weekStart: state.currentWeekStart,
          label: formatRange(state.currentWeekStart),
          weight: state.currentWeight,
          completionRate: state.weeklyGoal ? getWeeklyWorkoutCount() / state.weeklyGoal : 0,
          miles: getWeeklyMiles()
        }
      ];
      return points.filter(p => p.weight || p.completionRate || p.miles);
    }
  };
}
