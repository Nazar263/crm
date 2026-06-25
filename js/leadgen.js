/* =============================================
   leadgen.js — OpenStreetMap lead generation
   ============================================= */

const LeadGen = {
  statuses: ['Новий', 'Зацікавлений', 'Передзвонити', 'Не відповідає', 'Не цікаво'],
  overpassEndpoints: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
  ],
  fallbackCityBounds: {
    'львів': ['49.7681748', '49.9037122', '23.8980549', '24.1334136'],
    'lviv': ['49.7681748', '49.9037122', '23.8980549', '24.1334136'],
    'київ': ['50.2132730', '50.5907980', '30.2394401', '30.8259410'],
    'kyiv': ['50.2132730', '50.5907980', '30.2394401', '30.8259410'],
    'kiev': ['50.2132730', '50.5907980', '30.2394401', '30.8259410'],
    'одеса': ['46.3507020', '46.6162750', '30.5982200', '30.8907680'],
    'odesa': ['46.3507020', '46.6162750', '30.5982200', '30.8907680'],
    'харків': ['49.8882560', '50.1119510', '36.1056920', '36.4544070'],
    'kharkiv': ['49.8882560', '50.1119510', '36.1056920', '36.4544070'],
    'дніпро': ['48.3572540', '48.5903880', '34.8193070', '35.2086330'],
    'dnipro': ['48.3572540', '48.5903880', '34.8193070', '35.2086330'],
    'варшава': ['52.0978500', '52.3681530', '20.8516880', '21.2711510'],
    'warsaw': ['52.0978500', '52.3681530', '20.8516880', '21.2711510'],
  },

  getLeadId(osmType, osmId) {
    return `${osmType}-${osmId}`;
  },

  normalizePhone(phone) {
    return String(phone || '').replace(/[^\d+]/g, '').replace(/^00/, '+');
  },

  phoneForUrl(phone) {
    const clean = this.normalizePhone(phone);
    return clean.startsWith('+') ? clean.slice(1) : clean;
  },

  getTag(tags, names) {
    for (const name of names) {
      if (tags?.[name]) return tags[name];
    }
    return '';
  },

  buildAddress(tags = {}) {
    const parts = [
      tags['addr:street'],
      tags['addr:housenumber'],
      tags['addr:city'],
    ].filter(Boolean);
    return parts.join(', ') || tags['addr:full'] || '';
  },

  getMapsLink(lead) {
    if (lead.lat && lead.lon) return `https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lon}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name} ${lead.address}`.trim())}`;
  },

  mapElementToLead(el) {
    const tags = el.tags || {};
    const center = el.center || {};
    const phone = this.getTag(tags, ['contact:phone', 'phone', 'mobile', 'contact:mobile']);
    const website = this.getTag(tags, ['contact:website', 'website', 'url']);
    const telegram = this.getTag(tags, ['contact:telegram', 'telegram']);
    return {
      id: this.getLeadId(el.type, el.id),
      osmType: el.type,
      osmId: el.id,
      name: tags.name || 'Без назви',
      address: this.buildAddress(tags),
      phone,
      telegram,
      website,
      lat: el.lat || center.lat || '',
      lon: el.lon || center.lon || '',
      status: 'Новий',
      note: '',
      lastContactAt: '',
      createdAt: new Date().toISOString(),
    };
  },

  saveFilters() {
    const filters = {
      onlyNoWebsite: document.getElementById('lead-filter-no-website')?.checked || false,
      hideNotInteresting: document.getElementById('lead-filter-hide-not-interesting')?.checked || false,
      showHidden: false,
    };
    Storage.saveLeadFilters(filters);
  },

  applySavedFilters() {
    const filters = Storage.getLeadFilters();
    const noWebsite = document.getElementById('lead-filter-no-website');
    const hideNotInteresting = document.getElementById('lead-filter-hide-not-interesting');
    if (noWebsite) noWebsite.checked = filters.onlyNoWebsite;
    if (hideNotInteresting) hideNotInteresting.checked = filters.hideNotInteresting;
  },

  filteredLeads() {
    const filters = Storage.getLeadFilters();
    return Storage.getLeads().filter(lead => {
      if (filters.onlyNoWebsite && lead.website) return false;
      if (!filters.showHidden && filters.hideNotInteresting && lead.status === 'Не цікаво') return false;
      return true;
    });
  },

  render() {
    this.applySavedFilters();
    const tbody = document.getElementById('tbody-leads');
    if (!tbody) return;
    const leads = this.filteredLeads();

    if (!leads.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="12"><div class="empty-state"><span>Немає лідів</span><small>Виконайте пошук або змініть фільтри</small></div></td></tr>`;
      return;
    }

    tbody.innerHTML = leads.map(lead => this.renderRow(lead)).join('');
  },

  renderRow(lead) {
    const phone = this.normalizePhone(lead.phone);
    const phoneUrl = this.phoneForUrl(lead.phone);
    const telegram = String(lead.telegram || '').replace(/^@/, '');
    const statusOptions = this.statuses.map(status =>
      `<option value="${Utils.escHtml(status)}"${lead.status === status ? ' selected' : ''}>${Utils.escHtml(status)}</option>`
    ).join('');

    return `
      <tr data-lead-id="${Utils.escHtml(lead.id)}">
        <td><strong>${Utils.escHtml(lead.name)}</strong></td>
        <td>${Utils.escHtml(lead.address || '—')}</td>
        <td>${phone ? `<button class="btn btn-ghost btn-copy-phone" data-phone="${Utils.escHtml(phone)}">Копіювати</button>` : '<span style="color:var(--text-secondary)">—</span>'}</td>
        <td>${phone ? `<a class="btn btn-ghost" href="https://wa.me/${Utils.escHtml(phoneUrl)}" target="_blank" rel="noopener">WhatsApp</a>` : '❌'}</td>
        <td>${telegram ? `<a class="btn btn-ghost" href="https://t.me/${Utils.escHtml(telegram)}" target="_blank" rel="noopener">Telegram</a>` : '❌'}</td>
        <td>${phone ? `<a class="btn btn-ghost" href="viber://chat?number=%2B${Utils.escHtml(phoneUrl)}">Viber</a>` : '❌'}</td>
        <td>${lead.website ? `<a class="link" href="${Utils.escHtml(lead.website)}" target="_blank" rel="noopener">Є сайт</a>` : '❌ Немає'}</td>
        <td><a class="link" href="${Utils.escHtml(this.getMapsLink(lead))}" target="_blank" rel="noopener">Карти</a></td>
        <td><select class="form-input lead-status">${statusOptions}</select></td>
        <td><textarea class="form-input lead-note" rows="2" placeholder="Нотатка...">${Utils.escHtml(lead.note || '')}</textarea></td>
        <td>${lead.lastContactAt ? Utils.formatDateTime(lead.lastContactAt) : '—'}</td>
        <td><button class="btn-icon btn-icon--danger btn-delete-lead" title="Видалити">×</button></td>
      </tr>`;
  },

  updateLead(id, patch) {
    const leads = Storage.getLeads();
    const idx = leads.findIndex(lead => lead.id === id);
    if (idx < 0) return;
    leads[idx] = { ...leads[idx], ...patch, lastContactAt: new Date().toISOString() };
    Storage.saveLeads(leads);
    updateBadges();
    this.render();
  },

  updateLeadQuiet(id, patch) {
    const leads = Storage.getLeads();
    const idx = leads.findIndex(lead => lead.id === id);
    if (idx < 0) return;
    leads[idx] = { ...leads[idx], ...patch, lastContactAt: new Date().toISOString() };
    Storage.saveLeads(leads);
  },

  deleteLead(id) {
    Storage.saveLeads(Storage.getLeads().filter(lead => lead.id !== id));
    updateBadges();
    this.render();
    showToast('Лід видалено');
  },

  async search() {
    const niche = document.getElementById('lead-niche').value.trim();
    const city = document.getElementById('lead-city').value.trim();
    const status = document.getElementById('lead-search-status');

    if (!niche || !city) {
      showToast('Введіть нішу та місто', 'error');
      return;
    }

    if (status) status.textContent = 'Шукаю в OpenStreetMap...';
    try {
      const bounds = await this.getCityBounds(city);
      const query = this.buildOverpassQuery(niche, city, bounds);
      const res = await this.fetchOverpass(query);
      const json = await this.parseOverpassResponse(res);
      const found = (json.elements || []).map(el => this.mapElementToLead(el));
      this.mergeLeads(found);
      if (status) status.textContent = `Знайдено: ${found.length}`;
      if (!found.length) {
        showToast('OpenStreetMap нічого не знайшов. Спробуйте іншу назву ніші або місто.', 'error');
        return;
      }
      showToast(`Додано/оновлено лідів: ${found.length}`);
    } catch (err) {
      if (status) status.textContent = '';
      showToast(err.message || 'Не вдалося виконати пошук', 'error');
    }
  },

  async getCityBounds(city) {
    const fallback = this.fallbackCityBounds[this.normalizeSearchText(city)];
    const urls = [
      `/api/geocode?city=${encodeURIComponent(city)}`,
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=uk&q=${encodeURIComponent(city)}`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const places = await res.json();
        const box = places?.[0]?.boundingbox;
        if (Array.isArray(box) && box.length === 4) return box;
      } catch {
        continue;
      }
    }

    return fallback || null;
  },

  async postOverpass(url, query) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: query,
    });
  },

  async fetchOverpass(query) {
    const attempts = [];
    const local = await this.postOverpass('/api/overpass', query).catch(err => {
      attempts.push(`local: ${err.message || 'network error'}`);
      return null;
    });
    if (local?.ok) return local;
    if (local) attempts.push(`local: ${local.status}`);

    for (const endpoint of this.overpassEndpoints) {
      const res = await this.postOverpass(endpoint, query).catch(err => {
        attempts.push(`${endpoint}: ${err.message || 'network error'}`);
        return null;
      });
      if (res?.ok) return res;
      if (res) attempts.push(`${endpoint}: ${res.status}`);
    }

    throw new Error(`Overpass тимчасово не відповідає. Спробуйте ще раз через хвилину.`);
  },

  async parseOverpassResponse(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Overpass повернув некоректну відповідь. Спробуйте ще раз.');
    }
  },

  normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
  },

  getNicheRules(niche) {
    const text = this.normalizeSearchText(niche);
    const includesAny = words => words.some(word => text.includes(word));
    const includesStandaloneSto = /(^|[\s,.;:/-])сто($|[\s,.;:/-])/.test(text);
    const rules = [];

    const add = (key, values) => values.forEach(value => rules.push({ key, value }));

    if (includesAny(['стомат', 'зуб', 'dent'])) add('amenity', ['dentist']);
    if (includesAny(['кафе', 'кав', 'coffee', 'cafe'])) add('amenity', ['cafe']);
    if (includesAny(['ресторан', 'їж', 'еда', 'food'])) add('amenity', ['restaurant', 'fast_food']);
    if (includesAny(['салон', 'краси', 'красот', 'beauty', 'манік', 'нігт', 'nail'])) add('shop', ['beauty', 'hairdresser']);
    if (includesAny(['перук', 'барбер', 'волос', 'hair'])) add('shop', ['hairdresser']);
    if (includesAny(['фітнес', 'спортзал', 'зал', 'gym'])) add('leisure', ['fitness_centre']);
    if (includesAny(['готел', 'хостел', 'hotel'])) add('tourism', ['hotel', 'guest_house', 'hostel']);
    if (includesAny(['аптек', 'pharmacy'])) add('amenity', ['pharmacy']);
    if (includesAny(['клінік', 'мед', 'лікар', 'doctor'])) add('amenity', ['clinic', 'doctors']);
    if (includesAny(['вет', 'тварин'])) add('amenity', ['veterinary']);
    if (includesStandaloneSto || includesAny(['авто', 'шиномонтаж', 'мийк'])) {
      add('shop', ['car_repair', 'car_parts']);
      add('amenity', ['car_wash']);
    }
    if (includesAny(['школ', 'освіт', 'курс'])) add('amenity', ['school', 'language_school']);
    if (includesAny(['садок', 'дитяч'])) add('amenity', ['kindergarten']);
    if (includesAny(['юрист', 'адвокат', 'law'])) add('office', ['lawyer']);
    if (includesAny(['бухгалтер', 'account'])) add('office', ['accountant']);
    if (includesAny(['нерухом', 'ріелт', 'real estate'])) add('office', ['estate_agent']);
    if (includesAny(['реклам', 'маркет', 'agency', 'агенц'])) {
      add('office', ['advertising', 'company', 'it']);
      add('shop', ['copyshop', 'computer']);
      add('craft', ['printer', 'photographer']);
    }
    if (includesAny(['банк', 'bank'])) add('amenity', ['bank']);

    return rules;
  },

  buildOverpassQuery(niche, city, bounds = null) {
    const safeCity = city.replace(/"/g, '\\"');
    const safeNiche = niche.replace(/"/g, '\\"');
    const rules = this.getNicheRules(niche);

    if (bounds) {
      const [south, north, west, east] = bounds;
      const bbox = `${south},${west},${north},${east}`;
      const exactTagSearch = rules
        .map(rule => `  nwr["${rule.key}"="${rule.value}"](${bbox});`)
        .join('\n');
      return `
[out:json][timeout:25];
(
${exactTagSearch}
  nwr["name"~"${safeNiche}",i](${bbox});
  nwr["amenity"~"${safeNiche}",i](${bbox});
  nwr["shop"~"${safeNiche}",i](${bbox});
  nwr["office"~"${safeNiche}",i](${bbox});
  nwr["craft"~"${safeNiche}",i](${bbox});
);
out center tags 120;`;
    }

    const exactTagSearchInArea = rules
      .map(rule => `  nwr["${rule.key}"="${rule.value}"](area.searchArea);`)
      .join('\n');
    const exactTagSearchByAddress = rules
      .map(rule => `  nwr["${rule.key}"="${rule.value}"]["addr:city"~"^${safeCity}$",i];`)
      .join('\n');
    const exactTagSearchAroundCity = rules
      .map(rule => `  nwr(around.cityCenter:25000)["${rule.key}"="${rule.value}"];`)
      .join('\n');
    return `
[out:json][timeout:35];
(
  area["name"~"^${safeCity}$",i]["boundary"="administrative"];
  area["name:uk"~"^${safeCity}$",i]["boundary"="administrative"];
  area["name:en"~"^${safeCity}$",i]["boundary"="administrative"];
  area["name:ru"~"^${safeCity}$",i]["boundary"="administrative"];
  area["alt_name"~"^${safeCity}$",i]["boundary"="administrative"];
)->.searchArea;
(
  node["place"~"city|town|village"]["name"~"^${safeCity}$",i];
  node["place"~"city|town|village"]["name:uk"~"^${safeCity}$",i];
  node["place"~"city|town|village"]["name:en"~"^${safeCity}$",i];
  node["place"~"city|town|village"]["name:ru"~"^${safeCity}$",i];
  node["place"~"city|town|village"]["alt_name"~"^${safeCity}$",i];
)->.cityCenter;
(
${exactTagSearchInArea}
${exactTagSearchByAddress}
${exactTagSearchAroundCity}
  nwr["name"~"${safeNiche}",i](area.searchArea);
  nwr["amenity"~"${safeNiche}",i](area.searchArea);
  nwr["shop"~"${safeNiche}",i](area.searchArea);
  nwr["office"~"${safeNiche}",i](area.searchArea);
  nwr["craft"~"${safeNiche}",i](area.searchArea);
  nwr["name"~"${safeNiche}",i]["addr:city"~"^${safeCity}$",i];
  nwr["amenity"~"${safeNiche}",i]["addr:city"~"^${safeCity}$",i];
  nwr["shop"~"${safeNiche}",i]["addr:city"~"^${safeCity}$",i];
  nwr["office"~"${safeNiche}",i]["addr:city"~"^${safeCity}$",i];
  nwr["craft"~"${safeNiche}",i]["addr:city"~"^${safeCity}$",i];
  nwr(around.cityCenter:25000)["name"~"${safeNiche}",i];
  nwr(around.cityCenter:25000)["amenity"~"${safeNiche}",i];
  nwr(around.cityCenter:25000)["shop"~"${safeNiche}",i];
  nwr(around.cityCenter:25000)["office"~"${safeNiche}",i];
  nwr(around.cityCenter:25000)["craft"~"${safeNiche}",i];
);
out center tags 120;`;
  },

  mergeLeads(found) {
    const existing = Storage.getLeads();
    const byId = new Map(existing.map(lead => [lead.id, lead]));
    found.forEach(lead => {
      byId.set(lead.id, { ...lead, ...(byId.get(lead.id) || {}) });
    });
    Storage.saveLeads([...byId.values()]);
    updateBadges();
    this.render();
  },

  exportCsv() {
    const rows = [
      ['назва', 'адреса', 'телефон', 'сайт', 'статус', 'нотатка', 'дата останнього контакту'],
      ...Storage.getLeads().map(lead => [
        lead.name, lead.address, lead.phone, lead.website, lead.status, lead.note, lead.lastContactAt,
      ]),
    ];
    const csv = rows.map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  importCsv(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = this.parseCsv(reader.result);
      const [, ...dataRows] = rows;
      const imported = dataRows.filter(row => row.length).map(row => ({
        id: `csv-${Storage.generateId()}`,
        name: row[0] || 'Без назви',
        address: row[1] || '',
        phone: row[2] || '',
        website: row[3] || '',
        status: row[4] || 'Новий',
        note: row[5] || '',
        lastContactAt: row[6] || '',
        telegram: '',
        lat: '',
        lon: '',
        createdAt: new Date().toISOString(),
      }));
      this.mergeLeads(imported);
      showToast(`Імпортовано лідів: ${imported.length}`);
    };
    reader.readAsText(file);
  },

  parseCsv(text) {
    const rows = [];
    let row = [], cell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i + 1];
      if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) { row.push(cell); cell = ''; }
      else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (cell || row.length) rows.push([...row, cell]);
        row = []; cell = '';
        if (ch === '\r' && next === '\n') i++;
      } else cell += ch;
    }
    if (cell || row.length) rows.push([...row, cell]);
    return rows;
  },
};

document.getElementById('btn-search-leads')?.addEventListener('click', () => LeadGen.search());
document.getElementById('btn-export-leads')?.addEventListener('click', () => LeadGen.exportCsv());
document.getElementById('btn-import-leads')?.addEventListener('click', () => {
  const input = document.getElementById('leads-csv-input');
  input.value = '';
  input.click();
});
document.getElementById('leads-csv-input')?.addEventListener('change', e => LeadGen.importCsv(e.target.files?.[0]));
document.getElementById('lead-filter-no-website')?.addEventListener('change', () => { LeadGen.saveFilters(); LeadGen.render(); });
document.getElementById('lead-filter-hide-not-interesting')?.addEventListener('change', () => { LeadGen.saveFilters(); LeadGen.render(); });
document.getElementById('btn-show-hidden-leads')?.addEventListener('click', () => {
  const filters = Storage.getLeadFilters();
  Storage.saveLeadFilters({ ...filters, showHidden: true, hideNotInteresting: false });
  LeadGen.render();
});
document.getElementById('tbody-leads')?.addEventListener('click', e => {
  const row = e.target.closest('tr[data-lead-id]');
  if (!row) return;
  if (e.target.closest('.btn-copy-phone')) {
    navigator.clipboard?.writeText(e.target.closest('.btn-copy-phone').dataset.phone || '');
    showToast('Номер скопійовано');
  }
  if (e.target.closest('.btn-delete-lead')) LeadGen.deleteLead(row.dataset.leadId);
});
document.getElementById('tbody-leads')?.addEventListener('change', e => {
  const row = e.target.closest('tr[data-lead-id]');
  if (!row) return;
  if (e.target.classList.contains('lead-status')) LeadGen.updateLead(row.dataset.leadId, { status: e.target.value });
});
document.getElementById('tbody-leads')?.addEventListener('input', e => {
  const row = e.target.closest('tr[data-lead-id]');
  if (!row || !e.target.classList.contains('lead-note')) return;
  LeadGen.updateLeadQuiet(row.dataset.leadId, { note: e.target.value });
});
document.getElementById('tbody-leads')?.addEventListener('blur', e => {
  const row = e.target.closest('tr[data-lead-id]');
  if (!row || !e.target.classList.contains('lead-note')) return;
  LeadGen.render();
}, true);
