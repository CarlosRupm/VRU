function setupTabGroup(group) {
  const tabs = group.querySelectorAll('[role="tab"]');
  if (!tabs.length) return;

  const activateTab = (selectedTab) => {
    tabs.forEach((tab) => {
      const isActive = tab === selectedTab;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
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

const METRICS = ['placajes', 'placajes_fallados', 'metros', 'tiempo_juego', 'ensayos', 'patadas'];

const state = { matches: [], teamData: { rojo: {}, negro: {} } };

const seedRows = [
  { equipo: 'rojo', jugador: 'Álvaro Ruiz', posicion: 'Ala', placajes: 6, placajes_fallados: 2, metros: 72, tiempo_juego: 78, ensayos: 2, patadas: 1, foto_url: 'https://ui-avatars.com/api/?name=Alvaro+Ruiz&background=cf102d&color=fff' },
  { equipo: 'rojo', jugador: 'Sergio Díaz', posicion: 'Centro', placajes: 4, placajes_fallados: 1, metros: 55, tiempo_juego: 76, ensayos: 1, patadas: 0, foto_url: 'https://ui-avatars.com/api/?name=Sergio+Diaz&background=cf102d&color=fff' },
  { equipo: 'rojo', jugador: 'Pablo León', posicion: 'Tercera línea', placajes: 10, placajes_fallados: 3, metros: 32, tiempo_juego: 80, ensayos: 0, patadas: 0, foto_url: 'https://ui-avatars.com/api/?name=Pablo+Leon&background=cf102d&color=fff' },
  { equipo: 'negro', jugador: 'Mario Nieto', posicion: 'Apertura', placajes: 5, placajes_fallados: 1, metros: 64, tiempo_juego: 79, ensayos: 1, patadas: 5, foto_url: 'https://ui-avatars.com/api/?name=Mario+Nieto&background=101015&color=fff' },
  { equipo: 'negro', jugador: 'Hugo Pérez', posicion: 'Centro', placajes: 6, placajes_fallados: 2, metros: 51, tiempo_juego: 75, ensayos: 1, patadas: 0, foto_url: 'https://ui-avatars.com/api/?name=Hugo+Perez&background=101015&color=fff' },
  { equipo: 'negro', jugador: 'Iván Torres', posicion: 'Flanker', placajes: 11, placajes_fallados: 4, metros: 29, tiempo_juego: 80, ensayos: 0, patadas: 0, foto_url: 'https://ui-avatars.com/api/?name=Ivan+Torres&background=101015&color=fff' },
];

function normalizeTeam(v) {
  const t = String(v || '').toLowerCase();
  if (t.includes('rojo')) return 'rojo';
  if (t.includes('negro')) return 'negro';
  return null;
}

const normalizeHeader = (h) => String(h || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const toNumber = (v) => {
  const n = Number(String(v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function rowValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));
    return row;
  });
}

function ensurePlayer(team, row) {
  const name = row.jugador || 'Jugador sin nombre';
  if (!state.teamData[team][name]) {
    state.teamData[team][name] = {
      posicion: row.posicion || 'Sin posición',
      foto: row.foto_url || '',
      matches: 0,
      totals: { placajes: 0, placajes_fallados: 0, metros: 0, tiempo_juego: 0, ensayos: 0, patadas: 0 },
      history: [],
    };
  }
  return state.teamData[team][name];
}

function ingestRows(rows, matchName) {
  state.matches.push(matchName);
  rows.forEach((row) => {
    const team = normalizeTeam(row.equipo);
    if (!team) return;

    const normalized = {
      jugador: rowValue(row, ['jugador']),
      posicion: rowValue(row, ['posicion']),
      foto_url: rowValue(row, ['foto_url', 'foto url', 'foto']),
      placajes: toNumber(rowValue(row, ['placajes'])),
      placajes_fallados: toNumber(rowValue(row, ['placajes_fallados', 'placajes fallados'])),
      metros: toNumber(rowValue(row, ['metros'])),
      tiempo_juego: toNumber(rowValue(row, ['tiempo_juego', 'tiempo de juego'])),
      ensayos: toNumber(rowValue(row, ['ensayos'])),
      patadas: toNumber(rowValue(row, ['patadas'])),
    };

    const player = ensurePlayer(team, normalized);
    player.posicion = normalized.posicion || player.posicion;
    player.foto = normalized.foto_url || player.foto;
    player.matches += 1;

    METRICS.forEach((metric) => {
      player.totals[metric] += normalized[metric];
    });

    player.history.push({ matchName, ...normalized });
  });
}

function topPlayer(team, metric) {
  const entries = Object.entries(state.teamData[team]);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1].totals[metric] - a[1].totals[metric])[0];
}

function playerPhoto(name, p) {
  return p.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=222&color=fff`;
}

function renderTeamSummary(team) {
  const summary = document.getElementById(`${team}-resumen-stats`);
  const teamStats = document.getElementById(`${team}-team-stats`);
  if (!summary || !teamStats) return;

  const topTackle = topPlayer(team, 'placajes');
  const topTries = topPlayer(team, 'ensayos');
  const topMeters = topPlayer(team, 'metros');
  if (topTackle && topTries && topMeters) {
    summary.innerHTML = `
      <li><span>Más placajes</span><strong>${topTackle[0]} (${topTackle[1].totals.placajes})</strong></li>
      <li><span>Más ensayos</span><strong>${topTries[0]} (${topTries[1].totals.ensayos})</strong></li>
      <li><span>Más metros</span><strong>${topMeters[0]} (${topMeters[1].totals.metros} m)</strong></li>`;
  }

  const players = Object.values(state.teamData[team]);
  const totalEns = players.reduce((a, p) => a + p.totals.ensayos, 0);
  const totalPlac = players.reduce((a, p) => a + p.totals.placajes, 0);
  const totalM = players.reduce((a, p) => a + p.totals.metros, 0);
  teamStats.innerHTML = `
    <li><span>Partidos cargados</span><strong>${state.matches.length}</strong></li>
    <li><span>Ensayos / Placajes</span><strong>${totalEns} / ${totalPlac}</strong></li>
    <li><span>Metros totales</span><strong>${totalM}</strong></li>`;
}

function renderSquad(team) {
  const list = document.getElementById(`${team}-squad-list`);
  if (!list) return;
  list.innerHTML = Object.entries(state.teamData[team])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, p]) => `<li>${name} - ${p.posicion}</li>`)
    .join('');
}

function renderPlayerCards(team) {
  const container = document.getElementById(`${team}-player-grid`);
  if (!container) return;
  const players = Object.entries(state.teamData[team]).sort((a, b) => b[1].totals.placajes - a[1].totals.placajes);
  container.innerHTML = players
    .map(([name, p], idx) => {
      const perMatch = p.history
        .map((m) => `<li><span>${m.matchName}</span><strong>${m.placajes} pla · ${m.metros} m · ${m.ensayos} ens · ${m.patadas} pat</strong></li>`)
        .join('');
      return `
        <details class="player-card" ${idx === 0 ? 'open' : ''}>
          <summary>${name}</summary>
          <div class="player-header">
            <img class="player-photo" src="${playerPhoto(name, p)}" alt="Foto de ${name}" />
            <a class="player-link" href="jugador.html?team=${team}&player=${encodeURIComponent(name)}">Ver ficha completa</a>
          </div>
          <ul class="player-stats">
            <li><span>Posición</span><strong>${p.posicion}</strong></li>
            <li><span>Partidos</span><strong>${p.matches}</strong></li>
            <li><span>Placajes</span><strong>${p.totals.placajes}</strong></li>
            <li><span>Placajes fallados</span><strong>${p.totals.placajes_fallados}</strong></li>
            <li><span>Metros</span><strong>${p.totals.metros}</strong></li>
            <li><span>Tiempo de juego</span><strong>${p.totals.tiempo_juego}</strong></li>
            <li><span>Ensayos</span><strong>${p.totals.ensayos}</strong></li>
            <li><span>Patadas</span><strong>${p.totals.patadas}</strong></li>
          </ul>
          <p class="player-history-title">Detalle por partido</p>
          <ul class="player-stats">${perMatch}</ul>
        </details>`;
    })
    .join('');
}

function buildAnalyticsData(team) {
  const players = Object.values(state.teamData[team]);
  if (!players.length || !state.matches.length) return null;

  const perMatch = state.matches.map((matchName) => {
    const totals = { placajes: 0, placajes_fallados: 0, metros: 0, tiempo_juego: 0, ensayos: 0, patadas: 0 };
    players.forEach((p) => {
      const m = p.history.find((x) => x.matchName === matchName);
      if (!m) return;
      METRICS.forEach((metric) => {
        totals[metric] += m[metric] || 0;
      });
    });
    return totals;
  });

  return {
    Placajes: perMatch.map((m) => m.placajes),
    'Placajes fallados': perMatch.map((m) => m.placajes_fallados),
    Metros: perMatch.map((m) => m.metros),
    'Tiempo juego': perMatch.map((m) => m.tiempo_juego),
    Ensayos: perMatch.map((m) => m.ensayos),
    Patadas: perMatch.map((m) => m.patadas),
  };
}

function renderAnalytics() {
  document.querySelectorAll('.match-analytics').forEach((section) => {
    const team = section.dataset.team;
    const container = section.querySelector('.analytics-grid');
    const stats = buildAnalyticsData(team);
    if (!container || !stats) return;

    container.innerHTML = Object.entries(stats)
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
        const avgY = 100 - (avg / max) * 100;

        return `<article class="analytics-card"><div class="analytics-top"><strong>${name}</strong><span>Media: ${avg.toFixed(
          1,
        )}</span></div><div class="line-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line class="avg-line" x1="0" y1="${avgY}" x2="100" y2="${avgY}"></line><polyline class="line-path" points="${points}"></polyline></svg></div><div class="journey-labels">${labels}</div></article>`;
      })
      .join('');
  });
}

function persistState() {
  localStorage.setItem('vruCsvState', JSON.stringify(state));
}

function renderFromState() {
  ['rojo', 'negro'].forEach((team) => {
    renderTeamSummary(team);
    renderSquad(team);
    renderPlayerCards(team);
  });
  renderAnalytics();
  persistState();
}

async function loadCsvFiles(files) {
  const status = document.getElementById('csv-status');
  const names = [];
  for (const file of files) {
    const rows = parseCsv(await file.text());
    ingestRows(rows, file.name.replace('.csv', ''));
    names.push(file.name);
  }
  if (status) status.textContent = `Archivos cargados: ${names.join(', ')}`;
  renderFromState();
}

async function loadCsvFromUrls(urls) {
  const status = document.getElementById('csv-status');
  const names = [];
  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url) continue;
    const response = await fetch(url);
    if (!response.ok) continue;
    const rows = parseCsv(await response.text());
    const name = (url.split('/').pop() || `partido-${state.matches.length + 1}`).replace('.csv', '');
    ingestRows(rows, name);
    names.push(name);
  }
  if (status) status.textContent = `CSV GitHub cargados: ${names.join(', ') || 'ninguno'}`;
  renderFromState();
}

function bootstrap() {
  document.querySelectorAll('[data-tab-group]').forEach((group) => setupTabGroup(group));
  ingestRows(seedRows, 'partido-demo');
  renderFromState();

  const csvInput = document.getElementById('csv-input');
  if (csvInput) {
    csvInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      await loadCsvFiles(files);
    });
  }

  const loadGithubBtn = document.getElementById('load-github-csv');
  if (loadGithubBtn) {
    loadGithubBtn.addEventListener('click', async () => {
      const urlsText = document.getElementById('csv-urls')?.value || '';
      const urls = urlsText.split('\n').map((u) => u.trim()).filter(Boolean);
      if (!urls.length) return;
      await loadCsvFromUrls(urls);
    });
  }
}

bootstrap();
