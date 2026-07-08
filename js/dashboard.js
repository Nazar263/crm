/* =============================================
   dashboard.js — Dynamic analytics dashboard
   ============================================= */

const Dashboard = {
  render() {
    const stats = Calc.dashboardStats();

    const counters = [
      ['stat-total-budget', stats.totalBudget],
      ['stat-net-profit', stats.netProfit],
      ['stat-avg-check', stats.avgCheck],
      ['stat-client-debts', stats.clientDebts],
      ['stat-specialist-debts', stats.specialistDebts],
      ['stat-month-income', stats.monthIncome],
      ['stat-savings', stats.savingsTotal],
      ['stat-balance', stats.balance],
      ['stat-debt-owed', stats.owedToMe],
      ['stat-my-debts', stats.myDebts],
    ];

    counters.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) Utils.animateCounter(el, val, 700);
    });

    document.getElementById('stat-active-projects').textContent = stats.activeCount;
    document.getElementById('stat-completed-projects').textContent = stats.completedCount;
    document.getElementById('stat-total-clients').textContent = stats.clientsCount;
    document.getElementById('stat-total-specialists').textContent = stats.specialistsCount;
    document.getElementById('stat-total-partners').textContent = stats.partnersCount;

    document.getElementById('dashboard-date').textContent =
      new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    Charts.renderAll();

    document.querySelectorAll('#stats-grid .stat-card').forEach((card, i) => {
      card.classList.remove('anim-stagger');
      void card.offsetWidth;
      card.style.animationDelay = `${i * 40}ms`;
      card.classList.add('anim-stagger');
    });
  },
};

function init() {
  updateBadges();
  Dashboard.render();
  Projects.renderAll();

  document.getElementById('card-month-income')?.addEventListener('click', () => {
    Charts.renderAgencyIncome();
    openModal('modal-agency-income');
  });
}

init();
