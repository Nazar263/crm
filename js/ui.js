/* =============================================
   ui.js — Utils, modals, navigation, toasts
   ============================================= */

const Utils = {
  formatMoney(n) {
    const num = Number(n) || 0;
    return '₴' + num.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },
  formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  today() {
    return new Date().toISOString().split('T')[0];
  },
  daysBetween(start, end) {
    const s = new Date(start), e = new Date(end);
    return Math.round((e - s) / 86400000);
  },
  escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  getMonthKey(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },
  getMonthLabel(key) {
    if (!key) return '';
    const [y, m] = key.split('-');
    const months = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
  },
};

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || '✓'}</span><span>${Utils.escHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

let _confirmCallback = null;
function showConfirm(title, text, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;
  _confirmCallback = cb;
  openModal('modal-confirm');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function statusBadge(status) {
  const map = {
    'В роботі': 'badge--blue',
    'На паузі': 'badge--orange',
    'На перевірці': 'badge--purple',
  };
  return `<span class="badge ${map[status] || 'badge--gray'}">${Utils.escHtml(status)}</span>`;
}

function typeBadge(type) {
  const map = {
    'Landing Page': 'badge--teal',
    'Корпоративний сайт': 'badge--blue',
    'Інтернет-магазин': 'badge--green',
    'Дизайн': 'badge--pink',
    'Інше': 'badge--gray',
  };
  return `<span class="badge ${map[type] || 'badge--gray'}">${Utils.escHtml(type)}</span>`;
}

function sourceBadge(source) {
  const map = {
    Telegram: 'badge--blue', Instagram: 'badge--pink', YouTube: 'badge--orange',
    'Реклама': 'badge--purple', 'Сайт': 'badge--teal', 'Сарафанне радіо': 'badge--green', 'Інше': 'badge--gray',
  };
  return `<span class="badge ${map[source] || 'badge--gray'}">${Utils.escHtml(source || 'Інше')}</span>`;
}

function financeTypeBadge(type) {
  return type === 'income'
    ? '<span class="badge badge--green">Дохід</span>'
    : '<span class="badge badge--orange">Витрата</span>';
}

function financeStatusBadge(status) {
  return status === 'done'
    ? '<span class="badge badge--green">Виконано</span>'
    : '<span class="badge badge--purple">Заплановано</span>';
}

function debtTypeBadge(type) {
  return type === 'owed_to_me'
    ? '<span class="badge badge--green">Борг мені</span>'
    : '<span class="badge badge--orange">Мій борг</span>';
}

const pages = {
  dashboard: 'page-dashboard',
  projects: 'page-projects',
  clients: 'page-clients',
  specialists: 'page-specialists',
  partners: 'page-partners',
  finance: 'page-finance',
  debts: 'page-debts',
  savings: 'page-savings',
};

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(pages[page]);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  if (page === 'dashboard') Dashboard.render();
  if (page === 'projects') Projects.renderAll();
  if (page === 'clients') Clients.render();
  if (page === 'specialists') Specialists.render();
  if (page === 'partners') Partners.render();
  if (page === 'finance') Finance.render();
  if (page === 'debts') Debts.render();
  if (page === 'savings') Savings.render();

  closeSidebar();
}

function updateBadges() {
  document.getElementById('nav-badge-projects').textContent = Storage.getProjects().length;
  document.getElementById('nav-badge-clients').textContent = Storage.getClients().length;
  document.getElementById('nav-badge-specialists').textContent = Storage.getSpecialists().length;
  document.getElementById('nav-badge-partners').textContent = Storage.getPartners().length;
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

function refreshAll() {
  updateBadges();
  Dashboard.render();
  if (document.getElementById('page-projects').classList.contains('active')) Projects.renderAll();
  if (document.getElementById('page-clients').classList.contains('active')) Clients.render();
  if (document.getElementById('page-specialists').classList.contains('active')) Specialists.render();
  if (document.getElementById('page-partners').classList.contains('active')) Partners.render();
  if (document.getElementById('page-finance').classList.contains('active')) Finance.render();
  if (document.getElementById('page-debts').classList.contains('active')) Debts.render();
  if (document.getElementById('page-savings').classList.contains('active')) Savings.render();
}

document.getElementById('btn-confirm-action').addEventListener('click', () => {
  if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
  closeModal('modal-confirm');
});

document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => closeModal(el.dataset.close));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

document.getElementById('burger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
});
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
