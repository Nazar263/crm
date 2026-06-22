/* =============================================
   storage.js — LocalStorage (raw data only)
   ============================================= */

const Storage = {
  KEYS: {
    projectsActive: 'projects_active',
    projectsCompleted: 'projects_completed',
    clients: 'clients',
    specialists: 'specialists',
    partners: 'partners',
    transactions: 'transactions',
    personalDebts: 'personal_debts',
    savings: 'savings',
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  getProjects() { return this.get(this.KEYS.projectsActive); },
  getCompleted() { return this.get(this.KEYS.projectsCompleted); },
  getClients() { return this.get(this.KEYS.clients); },
  getSpecialists() { return this.get(this.KEYS.specialists); },
  getPartners() { return this.get(this.KEYS.partners); },
  getTransactions() { return this.get(this.KEYS.transactions); },
  getPersonalDebts() { return this.get(this.KEYS.personalDebts); },
  getSavings() { return this.get(this.KEYS.savings); },

  saveProjects(d) { this.set(this.KEYS.projectsActive, d); },
  saveCompleted(d) { this.set(this.KEYS.projectsCompleted, d); },
  saveClients(d) { this.set(this.KEYS.clients, d); },
  saveSpecialists(d) { this.set(this.KEYS.specialists, d); },
  savePartners(d) { this.set(this.KEYS.partners, d); },
  saveTransactions(d) { this.set(this.KEYS.transactions, d); },
  savePersonalDebts(d) { this.set(this.KEYS.personalDebts, d); },
  saveSavings(d) { this.set(this.KEYS.savings, d); },

  getAllProjects() {
    return [...this.getProjects(), ...this.getCompleted()];
  },

  /** Strip computed fields & migrate legacy v1.0 data */
  migrate() {
    const stripProject = (p) => {
      const raw = { ...p };
      delete raw.myIncome;
      delete raw.projectProfit;
      delete raw.clientDebt;
      delete raw.specialistDebt;
      delete raw.remainingPayment;
      if (raw.prepayment == null) raw.prepayment = 0;
      if (raw.paidToSpecialist == null) raw.paidToSpecialist = 0;
      if (raw.myPercent == null) raw.myPercent = 100;
      if (raw.partnerCommission == null) raw.partnerCommission = 0;
      if (!raw.partnerId) raw.partnerId = '';
      return raw;
    };

    this.saveProjects(this.getProjects().map(stripProject));
    this.saveCompleted(this.getCompleted().map(stripProject));

    const partners = this.getPartners();
    if (!partners.length && !localStorage.getItem('crm_migrated_v11')) {
      this.getPartners(); // ensure key exists
    }

    const specialists = this.getSpecialists();
    specialists.forEach(s => {
      if (s.paidToSpecialist != null) delete s.paidToSpecialist;
      if (s.debt != null) delete s.debt;
    });
    this.saveSpecialists(specialists);

    localStorage.setItem('crm_migrated_v11', '1');
  },
};

/* =============================================
   Calc — dynamic analytics (never stored)
   ============================================= */
const Calc = {
  project(p) {
    const budget = Number(p.budget) || 0;
    const specialistCost = Number(p.specialistCost) || 0;
    const prepayment = Number(p.prepayment) || 0;
    const paidToSpecialist = Number(p.paidToSpecialist) || 0;
    const myPercent = Number(p.myPercent ?? 100);
    const partnerCommission = Number(p.partnerCommission) || 0;

    const projectProfit = budget - specialistCost;
    const myIncome = projectProfit * (myPercent / 100);
    const clientDebt = budget - prepayment;
    const specialistDebt = specialistCost - paidToSpecialist;
    const remainingPayment = budget - prepayment;

    return {
      budget, specialistCost, prepayment, paidToSpecialist, myPercent, partnerCommission,
      projectProfit, myIncome, clientDebt, specialistDebt, remainingPayment,
    };
  },

  projectStartDate(p) {
    return p.startDate || p.createdAt?.split('T')[0] || '';
  },

  projectEndDate(p) {
    return p.endDate || p.finishDate || '';
  },

  clientStats(clientId) {
    const all = Storage.getAllProjects().filter(p => p.clientId === clientId);
    let totalBudget = 0, totalProfit = 0, totalPrepayment = 0, totalClientDebt = 0;
    all.forEach(p => {
      const c = this.project(p);
      totalBudget += c.budget;
      totalProfit += c.projectProfit;
      totalPrepayment += c.prepayment;
      totalClientDebt += c.clientDebt;
    });
    return {
      count: all.length,
      totalBudget,
      totalProfit,
      totalPrepayment,
      clientDebt: totalClientDebt,
    };
  },

  specialistStats(specialistId) {
    const completed = Storage.getCompleted().filter(p => p.developerId === specialistId);
    let totalCost = 0, totalPaid = 0;
    completed.forEach(p => {
      const c = this.project(p);
      totalCost += c.specialistCost;
      totalPaid += c.paidToSpecialist;
    });
    return {
      count: completed.length,
      totalCost,
      totalPaid,
      debt: totalCost - totalPaid,
    };
  },

  partnerStats(partnerId) {
    const all = Storage.getAllProjects().filter(p => p.partnerId === partnerId);
    const clientIds = new Set(all.map(p => p.clientId).filter(Boolean));
    let totalDeals = 0, totalCommission = 0, ourIncome = 0;
    all.forEach(p => {
      const c = this.project(p);
      totalDeals += c.budget;
      totalCommission += c.partnerCommission;
      ourIncome += c.myIncome;
    });
    const partner = Storage.getPartners().find(x => x.id === partnerId);
    const paidToPartner = Number(partner?.paidToPartner) || 0;
    return {
      clientsCount: clientIds.size,
      totalDeals,
      totalCommission,
      paidToPartner,
      partnerDebt: totalCommission - paidToPartner,
      ourIncome,
    };
  },

  financeBalance(transactions) {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return income - expense;
  },

  personalDebtSummary(debts = Storage.getPersonalDebts()) {
    let owedToMe = 0, myDebts = 0;
    debts.forEach(d => {
      const amount = Number(d.amount) || 0;
      if (d.type === 'owed_to_me') owedToMe += amount;
      else if (d.type === 'my_debt') myDebts += amount;
    });
    return { owedToMe, myDebts };
  },

  savingsProgress(amount, goal) {
    const g = Number(goal) || 0;
    if (!g) return 0;
    return Math.min(100, Math.round((Number(amount) || 0) / g * 100));
  },

  savingsSummary(items = Storage.getSavings()) {
    let totalSaved = 0, totalGoal = 0;
    items.forEach(s => {
      totalSaved += Number(s.amount) || 0;
      totalGoal += Number(s.goal) || 0;
    });
    return {
      totalSaved,
      totalGoal,
      progress: totalGoal > 0 ? Math.min(100, Math.round(totalSaved / totalGoal * 100)) : 0,
      count: items.length,
    };
  },

  dashboardStats() {
    const active = Storage.getProjects();
    const completed = Storage.getCompleted();
    const all = [...active, ...completed];
    const clients = Storage.getClients();
    const specialists = Storage.getSpecialists();
    const partners = Storage.getPartners();
    const transactions = Storage.getTransactions();

    let totalBudget = 0, totalMyIncome = 0, totalProfit = 0;
    let clientDebts = 0, specialistDebts = 0, partnerDebts = 0;

    all.forEach(p => {
      const c = Calc.project(p);
      totalBudget += c.budget;
      totalMyIncome += c.myIncome;
      totalProfit += c.projectProfit;
      clientDebts += c.clientDebt;
      specialistDebts += c.specialistDebt;
    });

    partners.forEach(pt => {
      partnerDebts += Calc.partnerStats(pt.id).partnerDebt;
    });

    const personalDebts = Calc.personalDebtSummary();
    const avgCheck = completed.length ? totalBudget / completed.length : 0;

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthIncome = completed
      .filter(p => Utils.getMonthKey(Calc.projectEndDate(p)) === monthKey)
      .reduce((s, p) => s + Calc.project(p).myIncome, 0);

    const savings = Calc.savingsSummary();

    return {
      totalBudget,
      totalMyIncome,
      netProfit: totalProfit,
      savingsTotal: savings.totalSaved,
      activeCount: active.length,
      completedCount: completed.length,
      avgCheck,
      clientsCount: clients.length,
      specialistsCount: specialists.length,
      partnersCount: partners.length,
      clientDebts,
      specialistDebts,
      partnerDebts,
      monthIncome,
      balance: Calc.financeBalance(transactions),
      owedToMe: personalDebts.owedToMe,
      myDebts: personalDebts.myDebts,
    };
  },
};

Storage.migrate();
