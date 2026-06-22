/* =============================================
   partners.js — Партнерська система
   ============================================= */

const Partners = {
  render() {
    const partners = Storage.getPartners();
    const tbody = document.getElementById('tbody-partners');
    const searchVal = document.getElementById('partners-search').value.toLowerCase();

    const filtered = partners.filter(p =>
      p.name.toLowerCase().includes(searchVal) ||
      (p.services || '').toLowerCase().includes(searchVal)
    );

    if (!filtered.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty-state"><span>Немає партнерів</span><small>Додайте партнера або прив'яжіть до проєкту</small></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const stats = Calc.partnerStats(p.id);
      return `
        <tr>
          <td><strong>${Utils.escHtml(p.name)}</strong></td>
          <td>${Utils.escHtml(p.services || '—')}</td>
          <td>${stats.clientsCount}</td>
          <td>${Utils.formatMoney(stats.totalDeals)}</td>
          <td>${Utils.formatMoney(stats.totalCommission)}</td>
          <td>${Utils.formatMoney(stats.paidToPartner)}</td>
          <td style="color:${stats.partnerDebt > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'}">${Utils.formatMoney(stats.partnerDebt)}</td>
          <td style="color:var(--accent-green)">${Utils.formatMoney(stats.ourIncome)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-icon btn-icon--edit" title="Редагувати" onclick="Partners.openEdit('${p.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/></svg>
              </button>
              <button class="btn-icon btn-icon--danger" title="Видалити" onclick="Partners.delete('${p.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2"/><path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  populateSelect(selectId, selectedId = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    const partners = Storage.getPartners();
    select.innerHTML = '<option value="">— без партнера —</option>' +
      partners.map(p => `<option value="${p.id}"${p.id === selectedId ? ' selected' : ''}>${Utils.escHtml(p.name)}</option>`).join('');
  },

  openCreate() {
    document.getElementById('partner-id').value = '';
    document.getElementById('partner-name').value = '';
    document.getElementById('partner-services').value = '';
    document.getElementById('partner-paid').value = '';
    document.getElementById('modal-partner-title').textContent = 'Новий партнер';
    openModal('modal-partner');
  },

  openEdit(id) {
    const p = Storage.getPartners().find(x => x.id === id);
    if (!p) return;
    document.getElementById('partner-id').value = p.id;
    document.getElementById('partner-name').value = p.name;
    document.getElementById('partner-services').value = p.services || '';
    document.getElementById('partner-paid').value = p.paidToPartner || '';
    document.getElementById('modal-partner-title').textContent = 'Редагувати партнера';
    openModal('modal-partner');
  },

  save() {
    const id = document.getElementById('partner-id').value;
    const name = document.getElementById('partner-name').value.trim();
    const services = document.getElementById('partner-services').value.trim();
    const paidToPartner = Number(document.getElementById('partner-paid').value) || 0;

    if (!name) { showToast('Введіть назву партнера', 'error'); return; }

    const partners = Storage.getPartners();

    if (id) {
      const idx = partners.findIndex(p => p.id === id);
      if (idx >= 0) {
        partners[idx] = { ...partners[idx], name, services, paidToPartner };
        showToast('Партнера оновлено');
      }
    } else {
      partners.push({ id: Storage.generateId(), name, services, paidToPartner });
      showToast('Партнера додано');
    }

    Storage.savePartners(partners);
    closeModal('modal-partner');
    this.render();
    updateBadges();
    Projects.populatePartnerSelect();
    Dashboard.render();
  },

  delete(id) {
    showConfirm('Видалити партнера?', 'Партнер буде видалений. Проєкти залишаться без прив\'язки.', () => {
      Storage.savePartners(Storage.getPartners().filter(p => p.id !== id));
      this.render();
      updateBadges();
      Projects.populatePartnerSelect();
      showToast('Партнера видалено');
    });
  },
};

document.getElementById('btn-add-partner').addEventListener('click', () => Partners.openCreate());
document.getElementById('btn-save-partner').addEventListener('click', () => Partners.save());
document.getElementById('partners-search').addEventListener('input', () => Partners.render());
