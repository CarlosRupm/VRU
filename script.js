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

const state = { matches: [], teamData: { rojo: {}, negro: {} } };

const seedRows = [
  { equipo: 'rojo', jugador: 'Álvaro Ruiz', posicion: 'Ala', puntos: 12, ensayos: 2, placajes: 6, foto_url: 'https://ui-avatars.com/api/?name=Alvaro+Ruiz&background=cf102d&color=fff' },
  { equipo: 'rojo', jugador: 'Sergio Díaz', posicion: 'Centro', puntos: 8, ensayos: 1, placajes: 4, foto_url: 'https://ui-avatars.com/api/?name=Sergio+Diaz&background=cf102d&color=fff' },
  { equipo: 'rojo', jugador: 'Pablo León', posicion: 'Tercera línea', puntos: 4, ensayos: 0, placajes: 10, foto_url: 'https://ui-avatars.com/api/?name=Pablo+Leon&background=cf102d&color=fff' },
  { equipo: 'negro', jugador: 'Mario Nieto', posicion: 'Apertura', puntos: 10, ensayos: 1, placajes: 5, foto_url: 'https://ui-avatars.com/api/?name=Mario+Nieto&background=101015&color=fff' },
  { equipo: 'negro', jugador: 'Hugo Pérez', posicion: 'Centro', puntos: 7, ensayos: 1, placajes: 6, foto_url: 'https://ui-avatars.com/api/?name=Hugo+Perez&background=101015&color=fff' },
  { equipo: 'negro', jugador: 'Iván Torres', posicion: 'Flanker', puntos: 3, ensayos: 0, placajes: 11, foto_url: 'https://ui-avatars.com/api/?name=Ivan+Torres&background=101015&color=fff' },
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
      posicion: row.posicion || 'Sin posición', foto: row.foto_url || '', matches: 0, puntos: 0, ensayos: 0, placajes: 0, history: [],
    };
  }
  return state.teamData[team][name];
}

function ingestRows(rows, matchName) {
  state.matches.push(matchName);
  rows.forEach((row) => {
    const team = normalizeTeam(row.equipo);
    if (!team) return;
    const player = ensurePlayer(team, row);
    const puntos = toNumber(row.puntos);
    const ensayos = toNumber(row.ensayos);
    const placajes = toNumber(row.placajes);
    player.posicion = row.posicion || player.posicion;
    player.foto = row.foto_url || player.foto;
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

function playerPhoto(name, p) {
  return p.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=222&color=fff`;
}

function renderTeamSummary(team) {
  const summary = document.getElementById(`${team}-resumen-stats`);
  const teamStats = document.getElementById(`${team}-team-stats`);
  if (!summary || !teamStats) return;
  const topPoints = topPlayer(team, 'puntos');
  const topTry = topPlayer(team, 'ensayos');
  const topTackle = topPlayer(team, 'placajes');
  if (topPoints && topTry && topTackle) {
    summary.innerHTML = `
      <li><span>Máximo anotador</span><strong>${topPoints[0]} (${topPoints[1].puntos} pts)</strong></li>
      <li><span>Más ensayos</span><strong>${topTry[0]} (${topTry[1].ensayos})</strong></li>
      <li><span>Más placajes</span><strong>${topTackle[0]} (${topTackle[1].placajes})</strong></li>`;
  }
  const players = Object.values(state.teamData[team]);
  const pointsFor = players.reduce((a, p) => a + p.puntos, 0);
  const tries = players.reduce((a, p) => a + p.ensayos, 0);
  const tackles = players.reduce((a, p) => a + p.placajes, 0);
  teamStats.innerHTML = `
    <li><span>Partidos cargados</span><strong>${state.matches.length}</strong></li>
    <li><span>Puntos totales</span><strong>${pointsFor}</strong></li>
    <li><span>Ensayos / Placajes</span><strong>${tries} / ${tackles}</strong></li>`;
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
  const players = Object.entries(state.teamData[team]).sort((a, b) => b[1].puntos - a[1].puntos);
  container.innerHTML = players
    .map(([name, p], idx) => {
      const perMatch = p.history
        .map((m) => `<li><span>${m.matchName}</span><strong>${m.puntos} pts · ${m.ensayos} ens · ${m.placajes} pla</strong></li>`)
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
            <li><span>Puntos</span><strong>${p.puntos}</strong></li>
            <li><span>Ensayos</span><strong>${p.ensayos}</strong></li>
            <li><span>Placajes</span><strong>${p.placajes}</strong></li>
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
    let puntos = 0;
    let ensayos = 0;
    let placajes = 0;
    players.forEach((p) => {
      const m = p.history.find((x) => x.matchName === matchName);
      if (m) {
        puntos += m.puntos;
        ensayos += m.ensayos;
        placajes += m.placajes;
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

        return `<article class="analytics-card"><div class="analytics-top"><strong>${name}</strong><span>Media: ${avg.toFixed(1)}</span></div><div class="line-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline class="line-path" points="${points}"></polyline></svg></div><div class="journey-labels">${labels}</div></article>`;
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
    const text = await response.text();
    const rows = parseCsv(text);
    const name = url.split('/').pop() || `partido-${state.matches.length + 1}`;
    ingestRows(rows, name.replace('.csv', ''));
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
