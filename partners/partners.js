/* =============================================
   partners.js — Partners Module Reference (MVP v1.1)
   Реалізація: js/partners.js + js/storage.js (Calc.partnerStats)
   ============================================= */

/*
  RAW PARTNER FIELDS (LocalStorage: 'partners'):
  { id, name, services, paidToPartner }

  PROJECT LINK: partnerId, partnerCommission (на проєкті)

  COMPUTED (Calc.partnerStats):
  - clientsCount    — унікальні клієнти з проєктів партнера
  - totalDeals      — сума бюджетів
  - totalCommission — сума partnerCommission з проєктів
  - partnerDebt     — totalCommission - paidToPartner
  - ourIncome       — сумарний myIncome з проєктів партнера
*/
