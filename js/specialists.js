/* =============================================
   specialists.js — Фахівці
   ============================================= */

const Specialists = {
  render() {
    const devs = Storage.getSpecialists();
    const grid = document.getElementById('specialists-grid');
    const searchVal = document.getElementById('specialists-search').value.toLowerCase();

    const filtered = devs.filter(d =>
      d.name.toLowerCase().includes(searchVal) ||
      (d.specialization || '').toLowerCase().includes(searchVal)
    );

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state-card">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <span>Немає фахівців</span>
          <small>Натисніть «Новий фахівець», щоб додати</small>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(d => {
      const stats = Calc.specialistStats(d.id);
      const initials = d.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      return `
        <div class="developer-card">
          <div class="dev-card-header">
            <div class="dev-avatar">${initials}</div>
            <div>
              <div class="dev-name">${Utils.escHtml(d.name)}</div>
              <div class="dev-spec">${Utils.escHtml(d.specialization || '—')}</div>
            </div>
          </div>
          ${d.telegram ? `<div class="dev-contact">${Utils.escHtml(d.telegram)}</div>` : ''}
          <div class="dev-stats dev-stats--4">
            <div class="dev-stat">
              <div class="dev-stat-label">Активних</div>
              <div class="dev-stat-value" style="color:${stats.activeCount > 0 ? 'var(--accent-blue)' : 'var(--text-primary)'}">${stats.activeCount}</div>
            </div>
            <div class="dev-stat">
              <div class="dev-stat-label">Завершено</div>
              <div class="dev-stat-value">${stats.count}</div>
            </div>
            <div class="dev-stat">
              <div class="dev-stat-label">Виплачено</div>
              <div class="dev-stat-value">${Utils.formatMoney(stats.totalPaid)}</div>
            </div>
            <div class="dev-stat">
              <div class="dev-stat-label">Борг</div>
              <div class="dev-stat-value" style="color:${stats.debt > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'}">${Utils.formatMoney(stats.debt)}</div>
            </div>
          </div>
          <div class="dev-card-actions">
            <button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="Specialists.openEdit('${d.id}')">Редагувати</button>
            <button class="btn-icon btn-icon--danger" onclick="Specialists.delete('${d.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2"/><path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');
  },

  openCreate() {
    document.getElementById('specialist-id').value = '';
    document.getElementById('specialist-name').value = '';
    document.getElementById('specialist-specialization').value = '';
    document.getElementById('specialist-telegram').value = '';
    document.getElementById('modal-specialist-title').textContent = 'Новий фахівець';
    openModal('modal-specialist');
  },

  openEdit(id) {
    const d = Storage.getSpecialists().find(x => x.id === id);
    if (!d) return;
    document.getElementById('specialist-id').value = d.id;
    document.getElementById('specialist-name').value = d.name;
    document.getElementById('specialist-specialization').value = d.specialization || '';
    document.getElementById('specialist-telegram').value = d.telegram || '';
    document.getElementById('modal-specialist-title').textContent = 'Редагувати фахівця';
    openModal('modal-specialist');
  },

  save() {
    const id = document.getElementById('specialist-id').value;
    const name = document.getElementById('specialist-name').value.trim();
    const spec = document.getElementById('specialist-specialization').value.trim();
    if (!name) { showToast('Введіть ім\'я фахівця', 'error'); return; }
    if (!spec) { showToast('Введіть спеціалізацію', 'error'); return; }

    const devs = Storage.getSpecialists();
    const telegram = document.getElementById('specialist-telegram').value.trim();

    if (id) {
      const idx = devs.findIndex(d => d.id === id);
      if (idx >= 0) {
        devs[idx] = { ...devs[idx], name, specialization: spec, telegram };
        showToast('Фахівця оновлено');
      }
    } else {
      devs.push({ id: Storage.generateId(), name, specialization: spec, telegram });
      showToast('Фахівця додано');
    }

    Storage.saveSpecialists(devs);
    closeModal('modal-specialist');
    this.render();
    updateBadges();
    Projects.populateSpecialistSelect();
  },

  delete(id) {
    showConfirm('Видалити фахівця?', 'Фахівця буде видалено. Проєкти залишаться.', () => {
      Storage.saveSpecialists(Storage.getSpecialists().filter(d => d.id !== id));
      this.render();
      updateBadges();
      Projects.populateSpecialistSelect();
      showToast('Фахівця видалено');
    });
  },
};

document.getElementById('btn-add-specialist').addEventListener('click', () => Specialists.openCreate());
document.getElementById('btn-save-specialist').addEventListener('click', () => Specialists.save());
document.getElementById('specialists-search').addEventListener('input', () => Specialists.render());
