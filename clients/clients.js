/* =============================================
   clients.js — Clients Module Reference (MVP v1.1)
   Реалізація: js/clients.js + js/storage.js (Calc.clientStats)
   ============================================= */

/*
  RAW CLIENT FIELDS (LocalStorage: 'clients'):
  { id, name, telegram, source }

  COMPUTED (Calc.clientStats):
  - count           — кількість проєктів
  - totalBudget     — загальний оборот
  - totalProfit     — загальний прибуток (budget - specialistCost)
  - totalPrepayment — сума передоплат
  - clientDebt      — борг клієнта (budget - prepayment)
*/
