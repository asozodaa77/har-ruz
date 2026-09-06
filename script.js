(function () {
  const STORAGE_KEY = 'harruz_habits_v1';
  const DAYS_SHOWN = 14;

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function lastNDates(n) {
    const dates = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }

  function loadHabits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHabits(habits) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }

  function calcStreak(habit) {
    let streak = 0;
    const d = new Date();
    // count backwards from today while marked done
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (habit.done.includes(iso)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function renderTodayLabel() {
    const el = document.getElementById('todayLabel');
    if (!el) return;
    const months = ['январ','феврал','март','апрел','май','июн','июл','август','сентябр','октябр','ноябр','декабр'];
    const d = new Date();
    el.textContent = d.getDate() + ' ' + months[d.getMonth()];
  }

  function renderHeroGrid() {
    const el = document.getElementById('heroGrid');
    if (!el) return;
    let html = '';
    for (let i = 0; i < 40; i++) {
      const active = Math.random() > 0.55;
      html += `<div class="cell" style="background:${active ? 'var(--pine)' : 'var(--off-cell)'}; opacity:${active ? (0.5 + Math.random() * 0.5).toFixed(2) : 1}"></div>`;
    }
    el.innerHTML = html;
  }

  function render() {
    const habits = loadHabits();
    const list = document.getElementById('habitList');
    const empty = document.getElementById('emptyState');

    if (habits.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    const dates = lastNDates(DAYS_SHOWN);
    const today = todayISO();

    list.innerHTML = habits.map((habit) => {
      const streak = calcStreak(habit);
      const daysHtml = dates.map((iso) => {
        const done = habit.done.includes(iso);
        const isToday = iso === today;
        return `<button class="day-cell ${done ? 'done' : ''} ${isToday ? 'today' : ''}" data-habit="${habit.id}" data-date="${iso}" title="${iso}"></button>`;
      }).join('');

      return `
        <div class="habit-card">
          <div class="habit-info">
            <div class="habit-name">${escapeHtml(habit.name)}</div>
            <div class="habit-streak">${streak > 0 ? streak + ' рӯз паиҳам' : 'ҳанӯз сар нашуда'}</div>
          </div>
          <div class="habit-days">${daysHtml}</div>
          <button class="habit-delete" data-delete="${habit.id}">Нест кардан</button>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function addHabit(name) {
    const habits = loadHabits();
    habits.push({
      id: 'h' + Date.now(),
      name: name,
      done: [],
    });
    saveHabits(habits);
    render();
  }

  function toggleDay(habitId, dateIso) {
    const habits = loadHabits();
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const idx = habit.done.indexOf(dateIso);
    if (idx >= 0) {
      habit.done.splice(idx, 1);
    } else {
      habit.done.push(dateIso);
    }
    saveHabits(habits);
    render();
  }

  function deleteHabit(habitId) {
    const habits = loadHabits().filter((h) => h.id !== habitId);
    saveHabits(habits);
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderTodayLabel();
    renderHeroGrid();
    render();

    document.getElementById('addForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('habitInput');
      const name = input.value.trim();
      if (!name) return;
      addHabit(name);
      input.value = '';
    });

    document.getElementById('habitList').addEventListener('click', (e) => {
      const dayBtn = e.target.closest('[data-habit]');
      if (dayBtn) {
        toggleDay(dayBtn.dataset.habit, dayBtn.dataset.date);
        return;
      }
      const delBtn = e.target.closest('[data-delete]');
      if (delBtn) {
        deleteHabit(delBtn.dataset.delete);
      }
    });
  });
})();
