// Inicializa cualquier grupo de pestañas que tenga data-tab-group.
function setupTabGroup(group) {
  const tabs = group.querySelectorAll('[role="tab"]');

  if (!tabs.length) {
    return;
  }

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

const analyticsData = {
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

function renderAnalytics() {
  document.querySelectorAll('.match-analytics').forEach((section) => {
    const team = section.dataset.team;
    const container = section.querySelector('.analytics-grid');
    const stats = analyticsData[team];

    if (!container || !stats) return;

    const cards = Object.entries(stats)
      .map(([name, values]) => {
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const labels = values.map((_, i) => `<span>J${i + 1}</span>`).join('');
        const points = values
          .map((value, i) => {
            const x = (i / (values.length - 1)) * 100;
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

// Activa el comportamiento para las pestañas principales y las anidadas.
document.querySelectorAll('[data-tab-group]').forEach((group) => {
  setupTabGroup(group);
});

renderAnalytics();
