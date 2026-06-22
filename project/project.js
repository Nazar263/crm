/* =============================================
   project.js — Projects Module Reference (MVP v1.1)
   Реалізація: js/projects.js + js/storage.js (Calc)
   ============================================= */

/*
  RAW PROJECT FIELDS (зберігаються в LocalStorage):
  {
    id, name, type, status,
    startDate,          // ручна дата старту (пріоритет)
    endDate,            // ручна дата завершення (пріоритет над finishDate)
    clientId, clientName, clientTelegram, clientSource,
    budget, prepayment, specialistCost, paidToSpecialist,
    myPercent,          // % від прибутку (default 100)
    developerId, partnerId, partnerCommission,
    description, createdAt
  }

  COMPLETED EXTRA: finishDate, days, completedAt

  НЕ ЗБЕРІГАЮТЬСЯ (Calc.project):
  - projectProfit = budget - specialistCost
  - myIncome = projectProfit * (myPercent / 100)
  - clientDebt = budget - prepayment
  - specialistDebt = specialistCost - paidToSpecialist
  - remainingPayment = budget - prepayment

  STORAGE KEYS:
  - projects_active
  - projects_completed
*/
