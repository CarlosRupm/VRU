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

// Activa el comportamiento para las pestañas principales y las anidadas.
document.querySelectorAll('[data-tab-group]').forEach((group) => {
  setupTabGroup(group);
});
