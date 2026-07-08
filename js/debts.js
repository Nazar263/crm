/* =============================================
   debts.js — Ручний облік боргів (окремо від проєктів)
   ============================================= */

const Debts = {
  render() {
    this.renderSummary();
    Charts.renderDebts('chart-debts-page', 'debtsPage');
    this.renderTable();
  },

  renderSummary() {
    const s = Calc.personalDebtSummary();
    document.getElementById('debts-owed').textContent = Utils.formatMoney(s.owedToMe);
    document.getElementById('debts-mine').textContent = Utils.formatMoney(s.myDebts);
  },

  getFiltered() {
    const search = document.getElementById('debts-search').value.toLowerCase();
    const typeFilter = document.getElementById('debts-filter-type').value;

    return Storage.getPersonalDebts()
      .filter(d => {
        const matchSearch = (d.person || '').toLowerCase().includes(search) ||
          (d.note || '').toLowerCase().includes(search);
        const matchType = !typeFilter || d.type === typeFilter;
        return matchSearch && matchType;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  renderTable() {
    const tbody = document.getElementById('tbody-debts');
    const filtered = this.getFiltered();

    if (!filtered.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><div class="empty-state"><span>Немає записів</span><small>Додайте борг мені або свій борг</small></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((d, i) => {
      const color = d.type === 'owed_to_me' ? 'var(--accent-green)' : 'var(--accent-orange)';
      return `
        <tr class="anim-row" style="animation-delay:${i * 30}ms">
          <td>${debtTypeBadge(d.type)}</td>
          <td>${Utils.escHtml(d.person || '—')}</td>
          <td style="color:${color};font-weight:600">${Utils.formatMoney(d.amount)}</td>
          <td>${Utils.escHtml(d.note || '—')}</td>
          <td>${Utils.formatDate(d.date)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-icon btn-icon--edit" title="Редагувати" onclick="Debts.openEdit('${d.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/></svg>
              </button>
              <button class="btn-icon btn-icon--danger" title="Видалити" onclick="Debts.delete('${d.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2"/><path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  openCreate(type = 'owed_to_me') {
    document.getElementById('debt-id').value = '';
    document.getElementById('debt-type').value = type;
    document.getElementById('debt-person').value = '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-note').value = '';
    document.getElementById('debt-date').value = Utils.today();
    document.getElementById('modal-debt-title').textContent =
      type === 'owed_to_me' ? 'Новий борг мені' : 'Новий мій борг';
    openModal('modal-debt');
  },

  openEdit(id) {
    const d = Storage.getPersonalDebts().find(x => x.id === id);
    if (!d) return;
    document.getElementById('debt-id').value = d.id;
    document.getElementById('debt-type').value = d.type;
    document.getElementById('debt-person').value = d.person || '';
    document.getElementById('debt-amount').value = d.amount || '';
    document.getElementById('debt-note').value = d.note || '';
    document.getElementById('debt-date').value = d.date || '';
    document.getElementById('modal-debt-title').textContent = 'Редагувати борг';
    openModal('modal-debt');
  },

  save() {
    const id = document.getElementById('debt-id').value;
    const type = document.getElementById('debt-type').value;
    const person = document.getElementById('debt-person').value.trim();
    const amount = Number(document.getElementById('debt-amount').value) || 0;
    const note = document.getElementById('debt-note').value.trim();
    const date = document.getElementById('debt-date').value;

    if (!person) { showToast('Введіть ім\'я або опис', 'error'); return; }
    if (!amount) { showToast('Введіть суму', 'error'); return; }

    const debts = Storage.getPersonalDebts();
    const raw = { type, person, amount, note, date };

    if (id) {
      const idx = debts.findIndex(d => d.id === id);
      if (idx >= 0) {
        debts[idx] = { ...debts[idx], ...raw };
        showToast('Запис оновлено');
      }
    } else {
      debts.push({ id: Storage.generateId(), ...raw });
      showToast('Запис додано');
    }

    Storage.savePersonalDebts(debts);
    closeModal('modal-debt');
    this.render();
    Dashboard.render();
  },

  delete(id) {
    showConfirm('Видалити запис?', 'Запис буде видалено безповоротно.', () => {
      Storage.savePersonalDebts(Storage.getPersonalDebts().filter(d => d.id !== id));
      this.render();
      Dashboard.render();
      showToast('Запис видалено');
    });
  },
};

document.getElementById('btn-add-owed').addEventListener('click', () => Debts.openCreate('owed_to_me'));
document.getElementById('btn-add-my-debt').addEventListener('click', () => Debts.openCreate('my_debt'));
document.getElementById('btn-save-debt').addEventListener('click', () => Debts.save());
document.getElementById('debts-search').addEventListener('input', () => Debts.renderTable());
document.getElementById('debts-filter-type').addEventListener('change', () => Debts.renderTable());
