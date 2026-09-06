(function () {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const DAYS_SHOWN = 14;
  let isSignupMode = false;
  let currentUser = null;

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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

  function calcStreak(doneDates) {
    let streak = 0;
    const d = new Date();
    const set = new Set(doneDates);
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (set.has(iso)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // ===== AUTH UI =====
  function showAuthGate(show) {
    document.getElementById('authGate').style.display = show ? 'flex' : 'none';
    document.getElementById('appContent').style.display = show ? 'none' : 'block';
    document.getElementById('navHabits').style.display = show ? 'none' : 'inline';
    document.getElementById('logoutLink').style.display = show ? 'none' : 'inline';
  }

  function setAuthError(msg) {
    document.getElementById('authError').textContent = msg || '';
  }

  function updateAuthModeUI() {
    document.getElementById('authTitle').textContent = isSignupMode ? 'Ҳисоби нав созед' : 'Ба ҳисоби худ дароед';
    document.getElementById('authSubmitBtn').textContent = isSignupMode ? 'Сабти ном' : 'Даромадан';
    document.getElementById('authToggle').textContent = isSignupMode
      ? 'Ҳисоб дорам — даромадан'
      : 'Ҳисоб надорам — сабти ном кардан';
  }

  // ===== DATA LOADING & RENDERING =====
  async function loadAndRender() {
    const list = document.getElementById('habitList');
    const empty = document.getElementById('emptyState');

    const { data: habits, error: habitsErr } = await supabase
      .from('habits')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (habitsErr) {
      list.innerHTML = `<p class="auth-error">Хатогӣ дар боркунии одатҳо: ${escapeHtml(habitsErr.message)}</p>`;
      return;
    }

    if (!habits || habits.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    const { data: completions } = await supabase
      .from('habit_completions')
      .select('habit_id, done_date');

    const doneMap = {};
    (completions || []).forEach((c) => {
      if (!doneMap[c.habit_id]) doneMap[c.habit_id] = [];
      doneMap[c.habit_id].push(c.done_date);
    });

    const dates = lastNDates(DAYS_SHOWN);
    const today = todayISO();

    list.innerHTML = habits.map((habit) => {
      const doneDates = doneMap[habit.id] || [];
      const streak = calcStreak(doneDates);
      const daysHtml = dates.map((iso) => {
        const done = doneDates.includes(iso);
        const isToday = iso === today;
        return `<button class="day-cell ${done ? 'done' : ''} ${isToday ? 'today' : ''}" data-habit="${habit.id}" data-date="${iso}" data-done="${done}" title="${iso}"></button>`;
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

  async function addHabit(name) {
    await supabase.from('habits').insert({ name: name, user_id: currentUser.id });
    loadAndRender();
  }

  async function toggleDay(habitId, dateIso, isDone) {
    if (isDone) {
      await supabase.from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('done_date', dateIso);
    } else {
      await supabase.from('habit_completions')
        .insert({ habit_id: habitId, done_date: dateIso, user_id: currentUser.id });
    }
    loadAndRender();
  }

  async function deleteHabit(habitId) {
    await supabase.from('habits').delete().eq('id', habitId);
    loadAndRender();
  }

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', () => {
    renderTodayLabel();
    renderHeroGrid();

    document.getElementById('authToggle').addEventListener('click', () => {
      isSignupMode = !isSignupMode;
      setAuthError('');
      updateAuthModeUI();
    });

    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      setAuthError('');
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;

      if (isSignupMode) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) { setAuthError(error.message); return; }
        setAuthError('Ҳисоб сохта шуд. Агар email-и тасдиқ фиристода шуда бошад, онро санҷед, сипас дароед.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setAuthError(error.message); return; }
      }
    });

    document.getElementById('logoutLink').addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
    });

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
        toggleDay(dayBtn.dataset.habit, dayBtn.dataset.date, dayBtn.dataset.done === 'true');
        return;
      }
      const delBtn = e.target.closest('[data-delete]');
      if (delBtn) {
        deleteHabit(delBtn.dataset.delete);
      }
    });

    // Track auth state — this drives which screen is shown
    supabase.auth.onAuthStateChange((event, session) => {
      currentUser = session ? session.user : null;
      if (currentUser) {
        showAuthGate(false);
        loadAndRender();
      } else {
        showAuthGate(true);
      }
    });

    updateAuthModeUI();
  });
})();
