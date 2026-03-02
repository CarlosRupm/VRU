function setupTabGroup(group) {
  const tabs = group.querySelectorAll('[role="tab"]');
  if (!tabs.length) return;

  const activateTab = (selectedTab) => {
    tabs.forEach((tab) => {
      const isActive = tab === selectedTab;
      const panelId = tab.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);

      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;

      if (panel) {
        panel.hidden = !isActive;
        panel.classList.toggle('active', isActive);
      }
    });
  };

  tabs.forEach((tab) => {
    tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      const tabArray = Array.from(tabs);
      const index = tabArray.indexOf(tab);
      if (event.key === 'ArrowRight') {
        const next = tabArray[(index + 1) % tabArray.length];
        next.focus();
        activateTab(next);
      }
      if (event.key === 'ArrowLeft') {
        const prev = tabArray[(index - 1 + tabArray.length) % tabArray.length];
        prev.focus();
        activateTab(prev);
      }
    });
  });
}

const state = {
  matches: [],
  teamData: {
    rojo: {},
    negro: {},
  },
};

const defaultAnalyticsData = {
  rojo: {
    'Puntos a favor': [18, 17, 26, 20, 24],
    'Puntos en contra': [12, 21, 14, 10, 18],
    Ensayos: [3, 2, 4, 3, 3],
    Placajes: [64, 58, 70, 66, 69],
  },
  negro: {
    'Puntos a favor': [15, 16, 19, 23, 19],
    'Puntos en contra': [13, 22, 19, 17, 21],
    Ensayos: [2, 2, 3, 3, 2],
    Placajes: [61, 63, 67, 65, 64],
  },
};

function normalizeTeam(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v.includes('rojo')) return 'rojo';
  if (v.includes('negro')) return 'negro';
  return null;
}

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toNumber(value) {
  const n = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => normalizeHeader(h));
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || '';
    });
    return row;
  });
}

function ingestRows(rows, matchName) {
  state.matches.push(matchName);

  rows.forEach((row) => {
    const team = normalizeTeam(row.equipo);
    if (!team) return;

    const playerName = row.jugador || 'Jugador sin nombre';
    if (!state.teamData[team][playerName]) {
      state.teamData[team][playerName] = {
        posicion: row.posicion || 'Sin posición',
        matches: 0,
        puntos: 0,
        ensayos: 0,
        placajes: 0,
        history: [],
      };
    }

    const player = state.teamData[team][playerName];
    player.posicion = row.posicion || player.posicion;

    const puntos = toNumber(row.puntos);
    const ensayos = toNumber(row.ensayos);
    const placajes = toNumber(row.placajes);

    player.matches += 1;
    player.puntos += puntos;
    player.ensayos += ensayos;
    player.placajes += placajes;
    player.history.push({ matchName, puntos, ensayos, placajes });
  });
}

function topPlayer(team, metric) {
  const entries = Object.entries(state.teamData[team]);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1][metric] - a[1][metric])[0];
}

function renderTeamSummary(team) {
  const summary = document.getElementById(`${team}-resumen-stats`);
  const teamStats = document.getElementById(`${team}-team-stats`);
  if (!summary || !teamStats) return;

  const topPoints = topPlayer(team, 'puntos');
  const topTry = topPlayer(team, 'ensayos');
  const topTackle = topPlayer(team, 'placajes');

  if (!topPoints || !topTry || !topTackle) return;

  summary.innerHTML = `
    <li><span>Máximo anotador</span><strong>${topPoints[0]} (${topPoints[1].puntos} pts)</strong></li>
    <li><span>Más ensayos</span><strong>${topTry[0]} (${topTry[1].ensayos})</strong></li>
    <li><span>Más placajes</span><strong>${topTackle[0]} (${topTackle[1].placajes})</strong></li>
  `;

  const players = Object.values(state.teamData[team]);
  const pointsFor = players.reduce((acc, p) => acc + p.puntos, 0);
  const tries = players.reduce((acc, p) => acc + p.ensayos, 0);
  const tackles = players.reduce((acc, p) => acc + p.placajes, 0);

  teamStats.innerHTML = `
    <li><span>Partidos cargados</span><strong>${state.matches.length}</strong></li>
    <li><span>Puntos totales</span><strong>${pointsFor}</strong></li>
    <li><span>Ensayos / Placajes</span><strong>${tries} / ${tackles}</strong></li>
  `;
}

function renderSquad(team) {
  const list = document.getElementById(`${team}-squad-list`);
  if (!list) return;

  const players = Object.entries(state.teamData[team]);
  if (!players.length) return;

  list.innerHTML = players
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, p]) => `<li>${name} - ${p.posicion}</li>`)
    .join('');
}

function renderPlayerCards(team) {
  const container = document.getElementById(`${team}-player-grid`);
  if (!container) return;

  const players = Object.entries(state.teamData[team]);
  if (!players.length) return;

  container.innerHTML = players
    .sort((a, b) => b[1].puntos - a[1].puntos)
    .map(([name, p], idx) => {
      const perMatch = p.history
        .map(
          (m) =>
            `<li><span>${m.matchName}</span><strong>${m.puntos} pts · ${m.ensayos} ens · ${m.placajes} pla</strong></li>`,
        )
        .join('');

      return `
        <details class="player-card" ${idx === 0 ? 'open' : ''}>
          <summary>${name}</summary>
          <ul class="player-stats">
            <li><span>Posición</span><strong>${p.posicion}</strong></li>
            <li><span>Partidos</span><strong>${p.matches}</strong></li>
            <li><span>Puntos</span><strong>${p.puntos}</strong></li>
            <li><span>Ensayos</span><strong>${p.ensayos}</strong></li>
            <li><span>Placajes</span><strong>${p.placajes}</strong></li>
          </ul>
          <p class="player-history-title">Detalle por partido</p>
          <ul class="player-stats">${perMatch}</ul>
        </details>
      `;
    })
    .join('');
}

function buildAnalyticsData(team) {
  const players = Object.values(state.teamData[team]);
  if (!players.length || !state.matches.length) return defaultAnalyticsData[team];

  const perMatch = state.matches.map((matchName) => {
    let puntos = 0;
    let ensayos = 0;
    let placajes = 0;

    players.forEach((p) => {
      const found = p.history.find((m) => m.matchName === matchName);
      if (found) {
        puntos += found.puntos;
        ensayos += found.ensayos;
        placajes += found.placajes;
      }
    });

    return { puntos, ensayos, placajes };
  });

  return {
    'Puntos a favor': perMatch.map((m) => m.puntos),
    Ensayos: perMatch.map((m) => m.ensayos),
    Placajes: perMatch.map((m) => m.placajes),
  };
}

function renderAnalytics() {
  document.querySelectorAll('.match-analytics').forEach((section) => {
    const team = section.dataset.team;
    const container = section.querySelector('.analytics-grid');
    const stats = buildAnalyticsData(team);

    if (!container || !stats) return;

    const cards = Object.entries(stats)
      .map(([name, values]) => {
        const max = Math.max(...values, 1);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const labels = values.map((_, i) => `<span>J${i + 1}</span>`).join('');
        const points = values
          .map((value, i) => {
            const x = (i / Math.max(values.length - 1, 1)) * 100;
            const y = 100 - (value / max) * 100;
            return `${x},${y}`;
          })
          .join(' ');

        return `
          <article class="analytics-card">
            <div class="analytics-top">
              <strong>${name}</strong>
              <span>Media: ${avg.toFixed(1)}</span>
            </div>
            <div class="line-chart">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Gráfico de línea ${name}">
                <polyline class="line-path" points="${points}"></polyline>
              </svg>
            </div>
            <div class="journey-labels">${labels}</div>
          </article>
        `;
      })
      .join('');

    container.innerHTML = cards;
  });
}

function renderFromState() {
  ['rojo', 'negro'].forEach((team) => {
    renderTeamSummary(team);
    renderSquad(team);
    renderPlayerCards(team);
  });
  renderAnalytics();
}

async function loadCsvFiles(files) {
  const status = document.getElementById('csv-status');
  const parsedNames = [];

  for (const file of files) {
    const text = await file.text();
    const rows = parseCsv(text);
    ingestRows(rows, file.name.replace('.csv', ''));
    parsedNames.push(file.name);
  }

  if (status) {
    status.textContent = `Archivos cargados: ${parsedNames.join(', ')}`;
  }

  renderFromState();
}

document.querySelectorAll('[data-tab-group]').forEach((group) => {
  setupTabGroup(group);
});

const csvInput = document.getElementById('csv-input');
if (csvInput) {
  csvInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    await loadCsvFiles(files);
  });
}

renderAnalytics();
