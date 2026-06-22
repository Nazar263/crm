/* =============================================
   dashboard.js — Dynamic analytics dashboard
   ============================================= */

const Dashboard = {
  render() {
    const stats = Calc.dashboardStats();

    document.getElementById('stat-total-budget').textContent = Utils.formatMoney(stats.totalBudget);
    document.getElementById('stat-net-profit').textContent = Utils.formatMoney(stats.netProfit);
    document.getElementById('stat-active-projects').textContent = stats.activeCount;
    document.getElementById('stat-completed-projects').textContent = stats.completedCount;
    document.getElementById('stat-avg-check').textContent = Utils.formatMoney(stats.avgCheck);
    document.getElementById('stat-total-clients').textContent = stats.clientsCount;
    document.getElementById('stat-total-specialists').textContent = stats.specialistsCount;
    document.getElementById('stat-total-partners').textContent = stats.partnersCount;
    document.getElementById('stat-client-debts').textContent = Utils.formatMoney(stats.clientDebts);
    document.getElementById('stat-specialist-debts').textContent = Utils.formatMoney(stats.specialistDebts);
    document.getElementById('stat-month-income').textContent = Utils.formatMoney(stats.monthIncome);
    document.getElementById('stat-savings').textContent = Utils.formatMoney(stats.savingsTotal);
    document.getElementById('stat-balance').textContent = Utils.formatMoney(stats.balance);
    document.getElementById('stat-debt-owed').textContent = Utils.formatMoney(stats.owedToMe);
    document.getElementById('stat-my-debts').textContent = Utils.formatMoney(stats.myDebts);

    document.getElementById('dashboard-date').textContent =
      new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    Charts.renderAll();
  },
};

function init() {
  updateBadges();
  Dashboard.render();
  Projects.renderAll();
}

init();
