/* =============================================
   finance.js — Finance Module Reference (MVP v1.1)
   Реалізація: js/finance.js + js/storage.js
   ============================================= */

/*
  RAW TRANSACTION (LocalStorage: 'transactions'):
  {
    id,
    type: 'income' | 'expense',
    amount,
    bank,
    category,
    description,
    date,           // дата операції
    plannedDate,    // планова дата
    status: 'planned' | 'done'
  }

  COMPUTED:
  - balance  = done income - done expense
  - cashflow = planned income - planned expense
*/
