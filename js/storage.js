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

  normalizeBank(value) {
    const v = String(value || '').toLowerCase().trim();
    if (!v) return '';
    if (v === 'mono' || v.includes('monobank') || v.includes('моно')) return 'mono';
    if (v === 'privat' || v.includes('privatbank') || v.includes('приват')) return 'privat';
    if (v === 'cash' || v.includes('готів') || v.includes('gotiv')) return 'cash';
    return '';
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

  exportData() {
    const data = {};
    Object.entries(this.KEYS).forEach(([name, key]) => {
      data[name] = this.get(key);
    });
    return {
      app: 'WebAgency CRM',
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };
  },

  importData(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Некоректний файл');
    const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    const nextData = {};

    Object.entries(this.KEYS).forEach(([name, key]) => {
      const value = data[name];
      if (value != null && !Array.isArray(value)) throw new Error('Некоректний формат даних');
      nextData[key] = Array.isArray(value) ? value : [];
    });

    Object.entries(nextData).forEach(([key, value]) => this.set(key, value));
    ['crm_migrated_v11', 'crm_migrated_v12', 'crm_migrated_v13', 'crm_migrated_v14'].forEach(key => localStorage.removeItem(key));
    this.migrate();
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
      if (raw.myPercent == null) raw.myPercent = 0;
      if (raw.profitTaken == null) raw.profitTaken = 0;
      if (raw.partnerCommission == null) raw.partnerCommission = 0;
      if (!raw.partnerId) raw.partnerId = '';
      return raw;
    };

    if (!localStorage.getItem('crm_migrated_v12')) {
      const migratePercent = (p) => {
        const raw = stripProject(p);
        const budget = Number(raw.budget) || 0;
        if (budget > 0) {
          const storedCost = Number(raw.specialistCost) || 0;
          raw.myPercent = Math.round((budget - storedCost) / budget * 100);
        }
        return raw;
      };
      this.saveProjects(this.getProjects().map(migratePercent));
      this.saveCompleted(this.getCompleted().map(migratePercent));
      localStorage.setItem('crm_migrated_v12', '1');
    } else {
      this.saveProjects(this.getProjects().map(stripProject));
      this.saveCompleted(this.getCompleted().map(stripProject));
    }

    const partners = this.getPartners();
    partners.forEach(p => {
      if (p.givenProjectsCount == null) p.givenProjectsCount = 0;
      if (p.givenProjectsPrice == null) p.givenProjectsPrice = 0;
      if (p.ourCommission == null) p.ourCommission = 0;
      if (p.paidToUs == null) p.paidToUs = 0;
    });
    this.savePartners(partners);

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

    if (!localStorage.getItem('crm_migrated_v13')) {
      const typeMap = {
        'Landing Page': 'IT',
        'Корпоративний сайт': 'IT',
        'Інтернет-магазин': 'IT',
        'Дизайн': 'Design',
        'Інше': 'IT',
      };
      const migrateType = (p) => {
        const raw = { ...p };
        if (raw.type && typeMap[raw.type]) raw.type = typeMap[raw.type];
        return raw;
      };
      this.saveProjects(this.getProjects().map(migrateType));
      this.saveCompleted(this.getCompleted().map(migrateType));
      localStorage.setItem('crm_migrated_v13', '1');
    }

    if (!localStorage.getItem('crm_migrated_v14')) {
      const normalizeBankField = (bank) => Storage.normalizeBank(bank) || bank;
      this.saveTransactions(this.getTransactions().map(t => ({
        ...t,
        bank: normalizeBankField(t.bank),
      })));
      this.saveSavings(this.getSavings().map(s => ({
        ...s,
        bank: normalizeBankField(s.bank),
      })));
      localStorage.setItem('crm_migrated_v14', '1');
    }
  },
};

/* =============================================
   Calc — dynamic analytics (never stored)
   ============================================= */
const Calc = {
  project(p) {
    const budget = Number(p.budget) || 0;
    const prepayment = Number(p.prepayment) || 0;
    const paidToSpecialist = Number(p.paidToSpecialist) || 0;
    const myPercent = Number(p.myPercent ?? 0);
    const profitTaken = Number(p.profitTaken) || 0;
    const partnerCommission = Number(p.partnerCommission) || 0;

    const projectProfit = Math.round(budget * myPercent / 100);
    const specialistCost = budget - projectProfit;
    const clientDebt = budget - prepayment;
    const specialistDebt = specialistCost - paidToSpecialist;
    const remainingPayment = budget - prepayment;
    const profitLeft = projectProfit - profitTaken;

    return {
      budget, specialistCost, prepayment, paidToSpecialist, myPercent, profitTaken, partnerCommission,
      projectProfit, clientDebt, specialistDebt, remainingPayment, profitLeft,
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
      ourIncome += c.projectProfit;
    });
    const partner = Storage.getPartners().find(x => x.id === partnerId);
    const paidToPartner = Number(partner?.paidToPartner) || 0;
    const givenProjectsCount = Number(partner?.givenProjectsCount) || 0;
    const givenProjectsPrice = Number(partner?.givenProjectsPrice) || 0;
    const ourCommission = Number(partner?.ourCommission) || 0;
    const paidToUs = Number(partner?.paidToUs) || 0;
    return {
      clientsCount: clientIds.size,
      totalDeals,
      totalCommission,
      paidToPartner,
      partnerDebt: totalCommission - paidToPartner,
      ourIncome,
      givenProjectsCount,
      givenProjectsPrice,
      ourCommission,
      paidToUs,
      theirDebt: ourCommission - paidToUs,
    };
  },

  financeBalance(transactions) {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return income - expense;
  },

  bankBalances(transactions = Storage.getTransactions()) {
    const balances = { mono: 0, privat: 0, cash: 0 };
    transactions.forEach(t => {
      const bank = Storage.normalizeBank(t.bank);
      if (!bank) return;
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') balances[bank] += amount;
      else if (t.type === 'expense') balances[bank] -= amount;
    });
    return balances;
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

    let totalBudget = 0, totalProfit = 0;
    let clientDebts = 0, specialistDebts = 0, partnerDebts = 0;

    completed.forEach(p => {
      const c = Calc.project(p);
      totalBudget += c.budget;
      totalProfit += c.projectProfit;
    });

    all.forEach(p => {
      const c = Calc.project(p);
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
    const monthIncome = transactions
      .filter(t => t.type === 'income' && Utils.getMonthKey(t.date || t.plannedDate) === monthKey)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const savings = Calc.savingsSummary();

    return {
      totalBudget,
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
