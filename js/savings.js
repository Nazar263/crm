/* =============================================
   savings.js — Відкладення (ручний облік)
   ============================================= */

const Savings = {
  render() {
    this.renderSummary();
    Charts.renderSavings('chart-savings-page', 'savingsPage');
    this.renderTable();
  },

  renderSummary() {
    const s = Calc.savingsSummary();
    document.getElementById('savings-total').textContent = Utils.formatMoney(s.totalSaved);
    document.getElementById('savings-goal').textContent = Utils.formatMoney(s.totalGoal);
    document.getElementById('savings-progress').textContent = s.progress + '%';
  },

  getFiltered() {
    const search = document.getElementById('savings-search').value.toLowerCase();

    return Storage.getSavings()
      .filter(s => {
        const bankLabel = Banks.label(Banks.normalize(s.bank) || s.bank).toLowerCase();
        return (s.name || '').toLowerCase().includes(search) || bankLabel.includes(search);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  renderTable() {
    const tbody = document.getElementById('tbody-savings');
    const filtered = this.getFiltered();

    if (!filtered.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state"><span>Немає відкладень</span><small>Додайте ціль і суму на рахунку</small></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((s, i) => {
      const pct = Calc.savingsProgress(s.amount, s.goal);
      const label = s.name || Banks.label(s.bank) || '—';
      return `
        <tr class="anim-row" style="animation-delay:${i * 30}ms">
          <td>${Utils.escHtml(label)}</td>
          <td>${bankBadge(s.bank)}</td>
          <td style="color:var(--accent-green);font-weight:600">${Utils.formatMoney(s.amount)}</td>
          <td>${Utils.formatMoney(s.goal)}</td>
          <td>
            <div class="progress-cell">
              <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
              <span class="progress-label">${pct}%</span>
            </div>
          </td>
          <td>${Utils.formatDate(s.date)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-icon btn-icon--edit" title="Редагувати" onclick="Savings.openEdit('${s.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/></svg>
              </button>
              <button class="btn-icon btn-icon--danger" title="Видалити" onclick="Savings.delete('${s.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2"/><path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  openCreate() {
    document.getElementById('saving-id').value = '';
    document.getElementById('saving-name').value = '';
    Banks.populateSelect('saving-bank');
    document.getElementById('saving-amount').value = '';
    document.getElementById('saving-goal').value = '';
    document.getElementById('saving-date').value = Utils.today();
    document.getElementById('modal-saving-title').textContent = 'Нове відкладення';
    openModal('modal-saving');
  },

  openEdit(id) {
    const s = Storage.getSavings().find(x => x.id === id);
    if (!s) return;
    document.getElementById('saving-id').value = s.id;
    document.getElementById('saving-name').value = s.name || '';
    Banks.populateSelect('saving-bank', s.bank || '');
    document.getElementById('saving-amount').value = s.amount || '';
    document.getElementById('saving-goal').value = s.goal || '';
    document.getElementById('saving-date').value = s.date || '';
    document.getElementById('modal-saving-title').textContent = 'Редагувати відкладення';
    openModal('modal-saving');
  },

  save() {
    const id = document.getElementById('saving-id').value;
    const name = document.getElementById('saving-name').value.trim();
    const bank = document.getElementById('saving-bank').value;
    const amount = Number(document.getElementById('saving-amount').value) || 0;
    const goal = Number(document.getElementById('saving-goal').value) || 0;
    const date = document.getElementById('saving-date').value;

    if (!bank) { showToast('Оберіть банк', 'error'); return; }
    if (!goal) { showToast('Введіть цільову суму', 'error'); return; }

    const savings = Storage.getSavings();
    const raw = { name, bank, amount, goal, date };

    if (id) {
      const idx = savings.findIndex(s => s.id === id);
      if (idx >= 0) {
        savings[idx] = { ...savings[idx], ...raw };
        showToast('Запис оновлено');
      }
    } else {
      savings.push({ id: Storage.generateId(), ...raw });
      showToast('Відкладення додано');
    }

    Storage.saveSavings(savings);
    closeModal('modal-saving');
    this.render();
  },

  delete(id) {
    showConfirm('Видалити відкладення?', 'Запис буде видалено безповоротно.', () => {
      Storage.saveSavings(Storage.getSavings().filter(s => s.id !== id));
      this.render();
      showToast('Запис видалено');
    });
  },
};

document.getElementById('btn-add-saving').addEventListener('click', () => Savings.openCreate());
document.getElementById('btn-save-saving').addEventListener('click', () => Savings.save());
document.getElementById('savings-search').addEventListener('input', () => Savings.renderTable());
