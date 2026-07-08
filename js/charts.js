/* =============================================
   charts.js — Chart.js visualizations
   ============================================= */

const Charts = {
  instances: {},

  destroy(key) {
    if (this.instances[key]) {
      this.instances[key].destroy();
      this.instances[key] = null;
    }
  },

  chartDefaults() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555a70', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555a70', font: { size: 10 } } },
      },
    };
  },

  last12Months() {
    const monthsData = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsData[key] = { income: 0, count: 0, financeIn: 0, financeOut: 0, partnerIncome: 0, partnerPaid: 0 };
    }
    return monthsData;
  },

  renderProjects(projects) {
    const monthsData = this.last12Months();
    projects.forEach(p => {
      const projectDate = Calc.projectEndDate(p) || (p.completedAt ? new Date(p.completedAt).toISOString().split('T')[0] : p.createdAt?.split('T')[0] || '');
      const key = Utils.getMonthKey(projectDate);
      if (key && monthsData[key]) {
        const paidAmount = Calc.project(p).paidAmount;
        monthsData[key].count += 1;
        if (paidAmount > 0) {
          monthsData[key].income += paidAmount;
        }
      }
    });

    const labels = Object.keys(monthsData).map(k => Utils.getMonthLabel(k));
    const closedBudgets = Object.values(monthsData).map(d => d.income);
    const counts = Object.values(monthsData).map(d => d.count);
    const defaults = this.chartDefaults();

    this.destroy('income');
    const ctxI = document.getElementById('chart-income').getContext('2d');
    const gradI = ctxI.createLinearGradient(0, 0, 0, 200);
    gradI.addColorStop(0, 'rgba(79, 156, 249, 0.4)');
    gradI.addColorStop(1, 'rgba(79, 156, 249, 0)');
    this.instances.income = new Chart(ctxI, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: closedBudgets,
          borderColor: '#4f9cf9',
          backgroundColor: gradI,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#4f9cf9',
          pointRadius: 3,
        }],
      },
      options: {
        ...defaults,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Отримано: ${Utils.formatMoney(ctx.parsed.y)}`,
            },
          },
        },
      },
    });

    this.destroy('projects');
    const ctxP = document.getElementById('chart-projects').getContext('2d');
    this.instances.projects = new Chart(ctxP, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: 'rgba(167, 139, 250, 0.5)',
          borderColor: '#a78bfa',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: defaults,
    });
  },

  renderAgencyIncome() {
    const monthsData = this.last12Months();
    const transactions = Storage.getTransactions();
    const projectIdsWithHistory = new Set();

    // Sum project-related profit transactions first (these are authoritative)
    transactions.forEach(t => {
      if (t.source !== 'project_profit_taken') return;
      const key = Utils.getMonthKey(t.date || t.plannedDate);
      if (!key || !monthsData[key]) return;
      const amount = Number(t.amount) || 0;
      monthsData[key].income += t.type === 'expense' ? -amount : amount;
      if (t.projectId) projectIdsWithHistory.add(t.projectId);
    });

    // Cutoff: projects completed before this date should be shown by their completion month
    const cutoff = new Date('2026-07-01');
    const projects = [...Storage.getProjects(), ...Storage.getCompleted()];
    projects.forEach(p => {
      const profitTaken = Number(p.profitTaken) || 0;
      if (!profitTaken) return;

      // If we already have transactions for this project, skip (transactions are authoritative)
      if (projectIdsWithHistory.has(p.id)) return;

      const endDateStr = Calc.projectEndDate(p);
      const endDate = endDateStr ? new Date(endDateStr) : null;

      // If project was completed before cutoff, attribute its taken profit to completion month
      if (endDate && endDate < cutoff) {
        const key = Utils.getMonthKey(endDateStr);
        if (key && monthsData[key]) monthsData[key].income += profitTaken;
      }
      // Otherwise: do not attribute historic sums here — recent/active changes should be
      // recorded as `project_profit_taken` transactions (created on save) so they'll
      // appear in the month when the change happened.
    });

    const labels = Object.keys(monthsData).map(k => Utils.getMonthLabel(k));
    const income = Object.values(monthsData).map(d => d.income);
    const currentMonthKey = Utils.getMonthKey(Utils.today());
    const currentMonthIncome = monthsData[currentMonthKey]?.income || 0;
    const labelEl = document.getElementById('agency-income-current-month');
    if (labelEl) labelEl.textContent = Utils.formatMoney(currentMonthIncome);
    const defaults = this.chartDefaults();

    this.destroy('agencyIncome');
    const ctx = document.getElementById('chart-agency-income').getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');

    this.instances.agencyIncome = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: income,
          borderColor: '#facc15',
          backgroundColor: grad,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#facc15',
          pointRadius: 3,
        }],
      },
      options: {
        ...defaults,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Дохід: ${Utils.formatMoney(ctx.parsed.y)}`,
            },
          },
        },
      },
    });
  },

  renderFinance(transactions) {
    const monthsData = this.last12Months();
    transactions.forEach(t => {
      const key = Utils.getMonthKey(t.date || t.plannedDate);
      if (key && monthsData[key]) {
        if (t.type === 'income') monthsData[key].financeIn += Calc.bankAmountToUah(t.amount, t.bank);
        else if (t.type === 'expense') monthsData[key].financeOut += Calc.bankAmountToUah(t.amount, t.bank);
      }
    });

    const labels = Object.keys(monthsData).map(k => Utils.getMonthLabel(k));
    const defaults = this.chartDefaults();

    this.destroy('finance');
    const ctx = document.getElementById('chart-finance').getContext('2d');
    this.instances.finance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Доходи', data: Object.values(monthsData).map(d => d.financeIn), backgroundColor: 'rgba(52, 211, 153, 0.5)', borderColor: '#34d399', borderWidth: 1, borderRadius: 4 },
          { label: 'Витрати', data: Object.values(monthsData).map(d => d.financeOut), backgroundColor: 'rgba(251, 146, 60, 0.5)', borderColor: '#fb923c', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        ...defaults,
        plugins: { legend: { display: true, labels: { color: '#8b90a7', font: { size: 10 } } } },
      },
    });
  },

  renderMonthlyIncome(canvasId, instanceKey, transactions) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    const monthsData = this.last12Months();
    transactions.forEach(t => {
      const key = Utils.getMonthKey(t.date || t.plannedDate);
      // Only include manual finance incomes here — ignore project-created transactions
      const isProjectSource = t.source && String(t.source).startsWith('project_');
      if (t.type === 'income' && !isProjectSource && key && monthsData[key]) {
        monthsData[key].financeIn += Calc.bankAmountToUah(t.amount, t.bank);
      }
    });

    const labels = Object.keys(monthsData).map(k => Utils.getMonthLabel(k));
    const income = Object.values(monthsData).map(d => d.financeIn);
    const defaults = this.chartDefaults();

    this.destroy(instanceKey);
    const ctx = el.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(45, 212, 191, 0.42)');
    grad.addColorStop(1, 'rgba(45, 212, 191, 0)');

    this.instances[instanceKey] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: income,
          borderColor: '#2dd4bf',
          backgroundColor: grad,
          borderWidth: 2,
          tension: 0.36,
          fill: true,
          pointBackgroundColor: '#2dd4bf',
          pointRadius: 3,
        }],
      },
      options: {
        ...defaults,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Дохід: ${Utils.formatMoney(ctx.parsed.y)}`,
            },
          },
        },
      },
    });
  },

  renderBankBalances(canvasId, instanceKey) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    const balances = Calc.bankBalances();
    const labels = Banks.list.map(b => b.label);
    const data = Banks.list.map(b => balances[b.id] || 0);
    const defaults = this.chartDefaults();

    this.destroy(instanceKey);
    const ctx = el.getContext('2d');
    this.instances[instanceKey] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Баланс',
          data,
          backgroundColor: Banks.list.map(b => b.chartColor),
          borderColor: Banks.list.map(b => b.borderColor),
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        ...defaults,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${Utils.formatMoney(ctx.parsed.y)}`,
            },
          },
        },
      },
    });
  },

  renderDebts(canvasId, instanceKey) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    const debts = Calc.personalDebtSummary();
    const defaults = this.chartDefaults();

    this.destroy(instanceKey);
    const ctx = el.getContext('2d');
    this.instances[instanceKey] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Борг мені', 'Мої борги'],
        datasets: [{
          data: [debts.owedToMe, debts.myDebts],
          backgroundColor: ['rgba(52, 211, 153, 0.6)', 'rgba(251, 146, 60, 0.6)'],
          borderColor: ['#34d399', '#fb923c'],
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: defaults,
    });
  },

  renderSavings(canvasId, instanceKey) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    const items = Storage.getSavings();
    const defaults = this.chartDefaults();

    if (!items.length) {
      this.destroy(instanceKey);
      const ctx = el.getContext('2d');
      this.instances[instanceKey] = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Немає даних'], datasets: [{ data: [0], backgroundColor: 'rgba(85, 90, 112, 0.3)' }] },
        options: defaults,
      });
      return;
    }

    const labels = items.map(s => s.name || s.bank || 'Ціль');
    const saved = items.map(s => Number(s.amount) || 0);
    const remaining = items.map(s => Math.max(0, (Number(s.goal) || 0) - (Number(s.amount) || 0)));

    this.destroy(instanceKey);
    const ctx = el.getContext('2d');
    this.instances[instanceKey] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Наразі', data: saved, backgroundColor: 'rgba(52, 211, 153, 0.6)', borderColor: '#34d399', borderWidth: 1, borderRadius: 4 },
          { label: 'Залишилось', data: remaining, backgroundColor: 'rgba(85, 90, 112, 0.4)', borderColor: '#555a70', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        ...defaults,
        plugins: { legend: { display: true, labels: { color: '#8b90a7', font: { size: 10 } } } },
        scales: {
          ...defaults.scales,
          x: { ...defaults.scales.x, stacked: true },
          y: { ...defaults.scales.y, stacked: true },
        },
      },
    });
  },

  renderSavingsSummary(canvasId, instanceKey) {
    const el = document.getElementById(canvasId);
    if (!el) return;

    const summary = Calc.savingsSummary();
    const saved = summary.totalSaved;
    const remaining = Math.max(0, summary.totalGoal - summary.totalSaved);
    const defaults = this.chartDefaults();

    this.destroy(instanceKey);
    const ctx = el.getContext('2d');
    this.instances[instanceKey] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Всього'],
        datasets: [
          { label: 'Наразі', data: [saved], backgroundColor: 'rgba(250, 204, 21, 0.6)', borderColor: '#facc15', borderWidth: 1, borderRadius: 4 },
          { label: 'Залишилось', data: [remaining], backgroundColor: 'rgba(85, 90, 112, 0.4)', borderColor: '#555a70', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        ...defaults,
        plugins: { legend: { display: true, labels: { color: '#8b90a7', font: { size: 10 } } } },
        scales: {
          ...defaults.scales,
          x: { ...defaults.scales.x, stacked: true },
          y: { ...defaults.scales.y, stacked: true },
        },
      },
    });
  },

  renderSources() {
    const sourcesMap = {};
    Storage.getClients().forEach(c => {
      const s = c.source || 'Інше';
      sourcesMap[s] = (sourcesMap[s] || 0) + 1;
    });

    const sourceColors = {
      Telegram: '#4f9cf9', Instagram: '#f472b6', YouTube: '#fb923c',
      'Реклама': '#a78bfa', 'Сайт': '#2dd4bf', 'Сарафанне радіо': '#34d399', 'Інше': '#555a70',
    };

    this.destroy('sources');
    const ctxS = document.getElementById('chart-sources').getContext('2d');
    let srcLabels = Object.keys(sourcesMap);
    let srcData = Object.values(sourcesMap);
    if (!srcLabels.length) { srcLabels = ['Немає даних']; srcData = [1]; }

    this.instances.sources = new Chart(ctxS, {
      type: 'doughnut',
      data: {
        labels: srcLabels,
        datasets: [{
          data: srcData,
          backgroundColor: srcLabels.map(l => sourceColors[l] || '#555a70'),
          borderColor: '#10131f',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: '#8b90a7', font: { size: 10 }, padding: 10, boxWidth: 10 },
          },
        },
      },
    });
  },

  renderAll() {
    const completedProjects = Storage.getCompleted();
    const transactions = Storage.getTransactions();
    this.renderProjects(completedProjects);
    this.renderFinance(transactions);
    this.renderBankBalances('chart-banks', 'banks');
    this.renderSavings('chart-savings-goals', 'savingsGoals');
    this.renderSavingsSummary('chart-savings-summary', 'savingsSummary');
    this.renderSources();
  },
};
