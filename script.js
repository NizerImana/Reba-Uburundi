/* =========================================================
   Reba Uburundi : logique partagée par toutes les pages
   Pages réelles : index.html, province.html, commune.html,
   zone.html, search.html. Chacune fait un vrai changement
   de page (navigation par lien <a href>, pas de rendu en place).
   ========================================================= */

/* ---------------- Petits utilitaires ---------------- */

function titleCase(str){
  if (!str) return str;
  const isShouting = str === str.toUpperCase() && /[A-Z]/.test(str);
  if (!isShouting) return str;
  return str.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function isQuarterName(name){
  return /^quartier\b/i.test(name);
}

function normalize(str){
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function fmt(n){
  return n.toLocaleString('fr-FR');
}

function qs(name){
  return new URLSearchParams(window.location.search).get(name);
}

function qsInt(name){
  const v = qs(name);
  if (v === null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

/* ---------------- Comptages ---------------- */

function countCommunes(province){ return province.communes.length; }
function countZones(commune){ return commune.zones.length; }
function countCollines(zone){ return zone.collines_quarters.length; }

function totalZonesInProvince(province){
  return province.communes.reduce((s,c) => s + c.zones.length, 0);
}
function totalCollinesInProvince(province){
  return province.communes.reduce((s,c) => s + c.zones.reduce((z,zn) => z + zn.collines_quarters.length, 0), 0);
}
function totalCollinesInCommune(commune){
  return commune.zones.reduce((s,z) => s + z.collines_quarters.length, 0);
}

/* ---------------- Construction des URLs de navigation ---------------- */

function provinceUrl(pi){
  return `province.html?p=${pi}`;
}
function communeUrl(pi, ci){
  return `commune.html?p=${pi}&c=${ci}`;
}
function zoneUrl(pi, ci, zi, highlight){
  const base = `zone.html?p=${pi}&c=${ci}&z=${zi}`;
  return highlight ? `${base}&h=${encodeURIComponent(highlight)}` : base;
}
function searchUrl(q){
  return `search.html?q=${encodeURIComponent(q)}`;
}

/* ---------------- Géographie : chefs-lieux des provinces ----------------
   Coordonnées des cinq chefs-lieux provinciaux (2023). Il n'existe pas de
   coordonnées fiables pour chaque commune, zone ou colline dans ce jeu de
   données : la carte se limite donc au niveau province, ce qui reste
   honnête plutôt que d'inventer une précision qu'on n'a pas. */

const PROVINCE_COORDS = {
  BUHUMUZA:    { lat: -3.2194, lng: 30.5528 }, // Cankuzo
  BUJUMBURA:   { lat: -3.3822, lng: 29.3644 }, // Bujumbura (Mukaza)
  BURUNGA:     { lat: -4.1330, lng: 29.8000 }, // Makamba
  BUTANYERERA: { lat: -2.9083, lng: 29.8269 }, // Ngozi
  GITEGA:      { lat: -3.4333, lng: 29.9000 }, // Gitega
};

function getProvinceCoords(name){
  return PROVINCE_COORDS[name] || null;
}

function haversineKm(lat1, lng1, lat2, lng2){
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Affiche en mètres en dessous d'1 km (évite d'annoncer "0 km" pour une position proche),
// avec une décimale entre 1 et 10 km, puis arrondi au km au-delà.
function formatDistance(km){
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function gmapsLink(lat, lng){
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
function gmapsDirections(fromLat, fromLng, toLat, toLng){
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`;
}

/* ---------------- Repères et faits sur le Burundi ----------------
   Chiffres et lieux issus de sources publiques (recensement 2024,
   Wikipédia, World Factbook) reformulés ici avec nos propres mots.
   À prendre comme repères généraux, pas comme données officielles
   figées : la démographie et l'administration burundaises évoluent. */

const COUNTRY_FACTS = {
  population: '≈ 13,6 millions',
  populationNote: 'estimation 2024',
  area: '27 834 km²',
  capitals: 'Gitega (capitale politique) et Bujumbura (capitale économique)',
  languages: 'Kirundi et français (langues officielles), swahili largement parlé',
  currency: 'Franc burundais (BIF)',
  timezone: 'UTC+2 (heure d\'Afrique centrale, pas de changement saisonnier)',
  climate: "Climat tropical d'altitude, tempéré par le relief, avec une grande saison sèche de juin à août",
};

const PROVINCE_FACTS = {
  BUHUMUZA: {
    area: '5 931 km²',
    population: '2 052 261 hab.',
    density: '346 hab./km²',
    note: "La province la moins peuplée du pays, à l'est, frontalière du Rwanda et de la Tanzanie. Elle abrite l'essentiel du parc national de la Ruvubu, le plus vaste du Burundi."
  },
  BUJUMBURA: {
    area: '≈ 3 940 km²',
    population: '3 353 555 hab.',
    density: '852 hab./km²',
    note: "La province la plus densément peuplée du pays, autour de Bujumbura, la capitale économique, sur les rives du lac Tanganyika."
  },
  BURUNGA: {
    area: '6 206 km²',
    population: '2 118 551 hab.',
    density: '341 hab./km²',
    note: "La plus vaste province par sa superficie, au sud, bordée par le lac Tanganyika et la Tanzanie. Rumonge en est le plus grand centre urbain."
  },
  BUTANYERERA: {
    area: '4 480 km²',
    population: '2 530 206 hab.',
    density: '565 hab./km²',
    note: "Deuxième province la plus peuplée, au nord à la frontière du Rwanda, une région de collines réputée pour la culture du café."
  },
  GITEGA: {
    area: '≈ 4 546 km²',
    population: '2 278 215 hab.',
    density: '501 hab./km²',
    note: "Province des hauts plateaux du centre, autour de Gitega, capitale politique du Burundi depuis le transfert de 2018."
  },
};

function getProvinceFacts(name){
  return PROVINCE_FACTS[name] || null;
}

/* Sites touristiques et culturels, avec coordonnées vérifiées.
   Catégories : nature, culture, histoire. */
const POINTS_OF_INTEREST = [
  { id: 'kibira', name: 'Parc national de la Kibira', category: 'nature', lat: -2.9147, lng: 29.4336,
    blurb: "Forêt tropicale de montagne au nord-ouest, sur la ligne de partage des eaux Congo-Nil, refuge de chimpanzés et de centaines d'espèces d'oiseaux." },
  { id: 'ruvubu', name: 'Parc national de la Ruvubu', category: 'nature', lat: -3.111, lng: 30.373,
    blurb: "Le plus grand parc du Burundi, une savane le long de la rivière Ruvubu abritant buffles, antilopes, hippopotames et une avifaune très riche." },
  { id: 'rusizi', name: 'Parc national de la Rusizi', category: 'nature', lat: -3.2477, lng: 29.2307,
    blurb: "À une quinzaine de kilomètres de Bujumbura, ce parc au bord de la rivière Rusizi se visite en barque, à la rencontre des hippopotames et des oiseaux d'eau." },
  { id: 'tanganyika', name: 'Lac Tanganyika (plages de Bujumbura)', category: 'nature', lat: -3.3822, lng: 29.3644,
    blurb: "Deuxième lac le plus profond du monde après le lac Baïkal. Ses rives sablonneuses près de Bujumbura sont appréciées pour la baignade et les couchers de soleil." },
  { id: 'karera', name: 'Chutes de la Karera', category: 'nature', lat: -3.83, lng: 30.08,
    blurb: "Une série de six chutes d'eau réparties sur trois paliers, au sud de Rutana, dans le sud-est du pays." },
  { id: 'source-nil', name: 'Source méridionale du Nil (mont Kikizi)', category: 'histoire', lat: -3.913, lng: 29.8396,
    blurb: "Sur les pentes du mont Kikizi, près de Rutovu, une pyramide commémore l'une des sources les plus australes du Nil, découverte en 1938." },
  { id: 'gishora', name: 'Sanctuaire des tambours de Gishora', category: 'culture', lat: -3.372, lng: 29.928,
    blurb: "Colline sacrée à quelques kilomètres de Gitega, où sont conservés les tambours royaux et où se produisent les célèbres joueurs de tambour du Burundi." },
  { id: 'livingstone-stanley', name: 'Monument Livingstone-Stanley', category: 'histoire', lat: -3.476, lng: 29.3514,
    blurb: "Près de Mugere, au sud de Bujumbura sur le lac Tanganyika, ce monument marque le lieu où les explorateurs Livingstone et Stanley firent halte en 1871." },
  { id: 'rwihinda', name: 'Lac Rwihinda (lac aux Oiseaux)', category: 'nature', lat: -2.53944, lng: 30.05417,
    blurb: "Dans la région des lacs du nord, près de Kirundo, cette réserve naturelle abrite une soixantaine d'espèces d'oiseaux migrateurs sur ses eaux marécageuses." },
  { id: 'musee-gitega', name: 'Musée national de Gitega', category: 'culture', lat: -3.418236, lng: 29.908485,
    blurb: "Fondé en 1955, le plus grand musée du Burundi rassemble une collection ethnographique consacrée à l'histoire et aux traditions du pays." },
];

const POI_CATEGORY_LABEL = { nature: 'Nature', culture: 'Culture', histoire: 'Histoire' };
const POI_CATEGORY_COLOR = { nature: '#3A7256', culture: '#C7911A', histoire: '#9C3D34' };

function getPoiById(id){
  return POINTS_OF_INTEREST.find(p => p.id === id) || null;
}

/* Repères historiques, volontairement centrés sur les faits les plus
   anciens et les moins sujets à controverse. */
const HISTORY_TIMELINE = [
  { year: '≈ 1680', text: "Fondation du royaume du Burundi sous le premier mwami (roi), Ntare Ier." },
  { year: '1890', text: "Le territoire est intégré à l'Afrique orientale allemande." },
  { year: '1922', text: "La Société des Nations confie le Ruanda-Urundi à la Belgique, administré depuis le Congo belge." },
  { year: '1er juillet 1962', text: "Indépendance du Burundi, d'abord sous forme de monarchie constitutionnelle." },
  { year: '1966', text: "La monarchie est abolie et la République est proclamée." },
  { year: '2000', text: "Signature de l'accord d'Arusha pour la paix et la réconciliation." },
  { year: '2018', text: "La capitale politique est transférée de Bujumbura à Gitega." },
  { year: '2023–2025', text: "Réforme administrative : les 18 anciennes provinces sont regroupées en 5 nouvelles provinces." },
];

const NATIONAL_SYMBOLS = {
  flag: "Un sautoir (croix diagonale) blanc divise le drapeau en quatre champs rouges et verts, avec un disque blanc central portant trois étoiles rouges bordées de vert.",
  flagColors: "Rouge : la lutte pour l'indépendance · Vert : l'espoir et le développement · Blanc : la paix",
  motto: "Unité, Travail, Progrès",
  anthem: "Burundi Bwacu (« Notre Burundi »), adopté en 1962",
  independenceDay: '1er juillet 1962 (fête célébrée chaque année le 1er juillet)',
};

/* ---------------- Favoris (stockés localement dans le navigateur) ---------------- */

const FAVORITES_KEY = 'reba-uburundi-favoris';

function getFavorites(){
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e){
    return [];
  }
}

function saveFavorites(list){
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); } catch (e){ /* stockage indisponible */ }
}

function isFavorite(href){
  return getFavorites().some(f => f.href === href);
}

// item: { type, label, path, href }
function toggleFavorite(item){
  const list = getFavorites();
  const idx = list.findIndex(f => f.href === item.href);
  if (idx >= 0){
    list.splice(idx, 1);
  } else {
    list.unshift(item);
  }
  saveFavorites(list);
  updateFavCountBadge();
  return idx < 0; // true si désormais favori
}

function updateFavCountBadge(){
  const badge = document.getElementById('fav-count');
  if (!badge) return;
  const n = getFavorites().length;
  badge.textContent = String(n);
  badge.hidden = n === 0;
}

function starIconSvg(){
  return '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5l2.98 6.6 7.02.79-5.29 4.9 1.52 7.11L12 17.98l-6.23 3.92 1.52-7.11L2 9.89l7.02-.79z"/></svg>';
}

function createFavButton(item){
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fav-btn' + (isFavorite(item.href) ? ' is-fav' : '');
  btn.setAttribute('aria-label', 'Ajouter ou retirer des favoris');
  btn.innerHTML = starIconSvg();
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = toggleFavorite(item);
    btn.classList.toggle('is-fav', nowFav);
  });
  return btn;
}

function highlightActiveNav(){
  const page = (window.location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page) link.classList.add('is-active');
  });
}

/* ---------------- Petits graphiques en barres (HTML/CSS, sans bibliothèque) ---------------- */

// items: [{ label, value, display }] : value sert à calculer la largeur, display est le texte affiché
function renderBarList(containerId, items){
  const el = document.getElementById(containerId);
  if (!el) return;
  const max = Math.max(...items.map(i => i.value), 1);
  el.innerHTML = items.map(i => `
    <div class="bar-row">
      <span class="bar-label">${i.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max((i.value / max) * 100, 3).toFixed(1)}%"></div></div>
      <span class="bar-value">${i.display}</span>
    </div>
  `).join('');
}

/* ---------------- Copier le lien de la page ---------------- */

function wireCopyLinkButton(){
  const btn = document.getElementById('copy-link-btn');
  if (!btn) return;
  const originalLabel = btn.textContent;
  btn.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error('clipboard indisponible');
      }
      btn.textContent = 'Lien copié !';
    } catch (e){
      btn.textContent = 'Copie indisponible';
    }
    setTimeout(() => { btn.textContent = originalLabel; }, 1800);
  });
}

/* ---------------- Découverte au hasard ---------------- */

function goToRandomColline(){
  const pi = Math.floor(Math.random() * DATA.provinces.length);
  const province = DATA.provinces[pi];
  const ci = Math.floor(Math.random() * province.communes.length);
  const commune = province.communes[ci];
  const zi = Math.floor(Math.random() * commune.zones.length);
  const zone = commune.zones[zi];
  const name = zone.collines_quarters[Math.floor(Math.random() * zone.collines_quarters.length)];
  window.location.href = zoneUrl(pi, ci, zi, name);
}

function wireRandomButton(){
  const btn = document.getElementById('random-btn');
  if (btn) btn.addEventListener('click', goToRandomColline);
}

/* ---------------- Fil d'ariane ---------------- */

// items: [{ label, href }] : href null/absent = étape courante (non cliquable)
function renderBreadcrumb(container, items){
  container.innerHTML = '';
  items.forEach((item, i) => {
    if (i > 0){
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '/';
      container.appendChild(sep);
    }
    if (item.href){
      const a = document.createElement('a');
      a.className = 'crumb-btn';
      a.href = item.href;
      a.textContent = item.label;
      container.appendChild(a);
    } else {
      const span = document.createElement('span');
      span.className = 'crumb-btn current';
      span.textContent = item.label;
      container.appendChild(span);
    }
  });
}

/* ---------------- Bandeau de statistiques (page d'accueil) ---------------- */

function renderStats(container, footerEl){
  const nProv = DATA.provinces.length;
  const nComm = DATA.provinces.reduce((s,p) => s + p.communes.length, 0);
  const nZone = DATA.provinces.reduce((s,p) => s + totalZonesInProvince(p), 0);
  const nColl = DATA.provinces.reduce((s,p) => s + totalCollinesInProvince(p), 0);

  const items = [
    [nProv, 'provinces'],
    [nComm, 'communes'],
    [nZone, 'zones'],
    [fmt(nColl), 'collines et quartiers'],
  ];
  container.innerHTML = items.map(([num, label]) => `
    <div class="stat">
      <span class="num">${num}</span>
      <span class="label">${label}</span>
    </div>
  `).join('');

  if (footerEl){
    footerEl.textContent = `${nProv} provinces · ${nComm} communes · ${nZone} zones · ${fmt(nColl)} collines/quartiers`;
  }
}

/* ---------------- Index de recherche ---------------- */

function buildSearchIndex(){
  const index = [];
  DATA.provinces.forEach((p, pi) => {
    index.push({ type: 'province', name: titleCase(p.name), path: 'Burundi', href: provinceUrl(pi) });
    p.communes.forEach((c, ci) => {
      index.push({ type: 'commune', name: c.name, path: titleCase(p.name), href: communeUrl(pi, ci) });
      c.zones.forEach((z, zi) => {
        index.push({ type: 'zone', name: z.name, path: `${titleCase(p.name)} / ${c.name}`, href: zoneUrl(pi, ci, zi) });
        z.collines_quarters.forEach(name => {
          index.push({
            type: isQuarterName(name) ? 'quartier' : 'colline',
            name,
            path: `${titleCase(p.name)} / ${c.name} / ${z.name}`,
            href: zoneUrl(pi, ci, zi, name)
          });
        });
      });
    });
  });
  return index;
}

let SEARCH_INDEX = null;
function getSearchIndex(){
  if (!SEARCH_INDEX) SEARCH_INDEX = buildSearchIndex();
  return SEARCH_INDEX;
}

function doSearch(query, limit){
  const q = normalize(query.trim());
  if (!q) return [];
  const matches = getSearchIndex().filter(item => normalize(item.name).includes(q));
  return typeof limit === 'number' ? matches.slice(0, limit) : matches;
}

const TYPE_LABEL = { province: 'province', commune: 'commune', zone: 'zone', colline: 'colline', quartier: 'quartier' };

/* ---------------- Widget de recherche (présent sur toutes les pages) ---------------- */

function initSearchWidget(){
  const input = document.getElementById('search-input');
  if (!input) return;

  const wrap = input.closest('.search-wrap');
  const clearBtn = document.getElementById('search-clear');
  const box = document.getElementById('suggestions');

  function toggleClear(){
    if (clearBtn) clearBtn.style.display = input.value ? 'flex' : 'none';
  }

  function closeSuggestions(){
    if (box){ box.hidden = true; box.innerHTML = ''; }
  }

  function openSuggestions(query){
    if (!box) return;
    const results = doSearch(query, 8);
    if (!results.length){
      box.innerHTML = `<div class="suggestions-empty">Aucun résultat pour « ${query} »</div>`;
      box.hidden = false;
      return;
    }
    box.innerHTML = results.map(r => `
      <a class="suggestion-item" href="${r.href}">
        <span>
          <span class="suggestion-name">${r.name}</span>
          <span class="suggestion-path">${r.path}</span>
        </span>
        <span class="suggestion-type">${TYPE_LABEL[r.type]}</span>
      </a>
    `).join('') + `<a class="suggestions-more" href="${searchUrl(query)}">Voir tous les résultats</a>`;
    box.hidden = false;
  }

  input.addEventListener('input', () => {
    toggleClear();
    const q = input.value;
    if (q.trim()) openSuggestions(q); else closeSuggestions();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()){
      window.location.href = searchUrl(input.value.trim());
    }
    if (e.key === 'Escape'){
      closeSuggestions();
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) openSuggestions(input.value);
  });

  if (clearBtn){
    clearBtn.addEventListener('click', () => {
      input.value = '';
      toggleClear();
      closeSuggestions();
      input.focus();
    });
  }

  document.addEventListener('click', (e) => {
    if (wrap && !wrap.contains(e.target)) closeSuggestions();
  });

  // Pré-remplit le champ si on est sur la page de résultats
  if (document.body.dataset.page === 'search'){
    const q = qs('q');
    if (q) input.value = q;
  }

  toggleClear();
}

/* ---------------- Blocs réutilisables ---------------- */

function heading(title, countLabel){
  return `
    <div class="level-heading">
      <h2>${title}</h2>
      ${countLabel ? `<span class="count-pill">${countLabel}</span>` : ''}
    </div>
  `;
}

function notFound(message, backHref, backLabel){
  return `
    <div class="not-found">
      <h2>Page introuvable</h2>
      <p>${message}</p>
      <a href="${backHref}">${backLabel}</a>
    </div>
  `;
}

/* ---------------- Construction d'une carte Leaflet ---------------- */

function buildLeafletMap(containerId, markers, opts = {}){
  if (typeof L === 'undefined') return null;
  const map = L.map(containerId, { scrollWheelZoom: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 17,
  }).addTo(map);

  const bounds = [];
  markers.forEach(m => {
    const marker = L.marker([m.lat, m.lng]).addTo(map);
    if (m.popup) marker.bindPopup(m.popup);
    bounds.push([m.lat, m.lng]);
  });

  if (bounds.length > 1){
    map.fitBounds(bounds, { padding: [30, 30] });
  } else if (bounds.length === 1){
    map.setView(bounds[0], opts.zoom || 9);
  } else {
    map.setView([-3.4, 29.9], 7); // vue générale du Burundi par défaut
  }
  return map;
}

/* ================================================================
   Initialisation par page : chaque fonction lit l'URL de sa propre
   page et construit son contenu ; la navigation d'une page à l'autre
   se fait par de vrais liens <a href="...">.
   ================================================================ */

function initHome(){
  const statsEl = document.getElementById('stats');
  const footerEl = document.getElementById('footer-count');
  if (statsEl) renderStats(statsEl, footerEl);
  wireRandomButton();

  const grid = document.getElementById('grid');
  if (!grid) return;
  DATA.provinces.forEach((p, pi) => {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = provinceUrl(pi);
    a.innerHTML = `
      <span class="card-title">${titleCase(p.name)}</span>
      <span class="card-meta">Chef-lieu : ${p.capital}</span>
      <span class="card-count">${countCommunes(p)} communes</span>
    `;
    a.appendChild(createFavButton({ type: 'province', label: titleCase(p.name), path: 'Burundi', href: provinceUrl(pi) }));
    grid.appendChild(a);
  });
}

function initProvince(){
  const pi = qsInt('p');
  const province = pi !== null ? DATA.provinces[pi] : null;
  const content = document.getElementById('content');

  if (!province){
    renderBreadcrumb(document.getElementById('crumbs'), [{ label: 'Burundi', href: 'index.html' }, { label: 'Province introuvable' }]);
    content.innerHTML = notFound(
      "Cette province n'existe pas ou le lien utilisé est incomplet.",
      'index.html',
      'Retour à la liste des provinces'
    );
    return;
  }

  renderBreadcrumb(document.getElementById('crumbs'), [
    { label: 'Burundi', href: 'index.html' },
    { label: titleCase(province.name) }
  ]);
  document.getElementById('back-link').href = 'index.html';

  document.title = `${titleCase(province.name)} | Reba Uburundi`;
  document.getElementById('page-title').textContent = titleCase(province.name);
  document.getElementById('page-meta').textContent =
    `Chef-lieu : ${province.capital} · ${countCommunes(province)} communes · ${fmt(totalZonesInProvince(province))} zones · ${fmt(totalCollinesInProvince(province))} collines et quartiers`;

  const headFavSlot = document.getElementById('page-fav-slot');
  if (headFavSlot){
    headFavSlot.innerHTML = '';
    headFavSlot.appendChild(createFavButton({ type: 'province', label: titleCase(province.name), path: 'Burundi', href: provinceUrl(pi) }));
  }
  wireCopyLinkButton();

  const facts = getProvinceFacts(province.name);
  const factsHtml = facts ? `
    <div class="province-fact-card">
      <div><div class="fact-label">Superficie</div><div class="fact-value">${facts.area}</div></div>
      <div><div class="fact-label">Population</div><div class="fact-value">${facts.population}</div></div>
      <div><div class="fact-label">Densité</div><div class="fact-value">${facts.density}</div></div>
      <p class="province-note">${facts.note}</p>
    </div>
  ` : '';

  content.innerHTML = factsHtml + heading('Communes', `${countCommunes(province)} communes`) + `<div class="grid" id="grid"></div>`;
  const grid = document.getElementById('grid');
  province.communes.forEach((c, ci) => {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = communeUrl(pi, ci);
    a.innerHTML = `
      <span class="card-title">${c.name}</span>
      <span class="card-meta">${fmt(totalCollinesInCommune(c))} collines et quartiers</span>
      <span class="card-count">${countZones(c)} zones</span>
    `;
    a.appendChild(createFavButton({ type: 'commune', label: c.name, path: titleCase(province.name), href: communeUrl(pi, ci) }));
    grid.appendChild(a);
  });

  initProvinceMapWidget(pi, province);
}

function initProvinceMapWidget(pi, province){
  const section = document.getElementById('map-section');
  if (!section) return;
  const coords = getProvinceCoords(province.name);
  if (!coords){ section.hidden = true; return; }
  section.hidden = false;

  const map = buildLeafletMap('province-map', [
    { lat: coords.lat, lng: coords.lng, popup: `<strong>${province.capital}</strong><br>Chef-lieu de ${titleCase(province.name)}` }
  ], { zoom: 9 });

  const gmapsBtn = document.getElementById('gmaps-link');
  if (gmapsBtn) gmapsBtn.href = gmapsLink(coords.lat, coords.lng);

  const btn = document.getElementById('locate-btn');
  const resultEl = document.getElementById('locate-result');
  const dirBtn = document.getElementById('directions-link');
  if (!btn) return;

  let userMarker = null;

  btn.addEventListener('click', () => {
    if (!navigator.geolocation){
      resultEl.textContent = "La géolocalisation n'est pas prise en charge par ce navigateur.";
      return;
    }
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = 'Localisation en cours...';

    navigator.geolocation.getCurrentPosition((pos) => {
      btn.disabled = false;
      btn.textContent = originalLabel;
      const { latitude, longitude } = pos.coords;
      const dist = haversineKm(latitude, longitude, coords.lat, coords.lng);

      if (userMarker && map) map.removeLayer(userMarker);
      if (map){
        userMarker = L.circleMarker([latitude, longitude], { radius: 8, color: '#9C3D34', fillColor: '#9C3D34', fillOpacity: 0.9 }).addTo(map);
        userMarker.bindPopup('Vous êtes ici (position approximative)').openPopup();
        map.fitBounds([[latitude, longitude], [coords.lat, coords.lng]], { padding: [40, 40] });
      }

      resultEl.innerHTML = `Vous êtes à environ <strong>${formatDistance(dist)}</strong> du chef-lieu ${province.capital}.
        <span class="locate-caveat">Distance à vol d'oiseau depuis votre position jusqu'au chef-lieu. Ce n'est pas une détection de commune ou de zone exacte.</span>`;

      if (dirBtn){
        dirBtn.href = gmapsDirections(latitude, longitude, coords.lat, coords.lng);
        dirBtn.hidden = false;
      }
    }, (err) => {
      btn.disabled = false;
      btn.textContent = originalLabel;
      resultEl.textContent = 'Localisation impossible : ' + (err.code === 1
        ? "l'accès à votre position a été refusé."
        : "votre position n'a pas pu être déterminée.");
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

function initCommune(){
  const pi = qsInt('p');
  const ci = qsInt('c');
  const province = pi !== null ? DATA.provinces[pi] : null;
  const commune = province && ci !== null ? province.communes[ci] : null;
  const content = document.getElementById('content');

  if (!province || !commune){
    renderBreadcrumb(document.getElementById('crumbs'), [{ label: 'Burundi', href: 'index.html' }, { label: 'Commune introuvable' }]);
    content.innerHTML = notFound(
      "Cette commune n'existe pas ou le lien utilisé est incomplet.",
      'index.html',
      "Retour à la liste des provinces"
    );
    return;
  }

  renderBreadcrumb(document.getElementById('crumbs'), [
    { label: 'Burundi', href: 'index.html' },
    { label: titleCase(province.name), href: provinceUrl(pi) },
    { label: commune.name }
  ]);
  document.getElementById('back-link').href = provinceUrl(pi);

  document.title = `${commune.name} | Reba Uburundi`;
  document.getElementById('page-title').textContent = commune.name;
  document.getElementById('page-meta').textContent =
    `Commune de ${titleCase(province.name)} · ${countZones(commune)} zones · ${fmt(totalCollinesInCommune(commune))} collines et quartiers`;

  const headFavSlot = document.getElementById('page-fav-slot');
  if (headFavSlot){
    headFavSlot.innerHTML = '';
    headFavSlot.appendChild(createFavButton({ type: 'commune', label: commune.name, path: titleCase(province.name), href: communeUrl(pi, ci) }));
  }
  wireCopyLinkButton();

  const mapLink = document.getElementById('map-link');
  if (mapLink){
    if (getProvinceCoords(province.name)){
      mapLink.href = `${provinceUrl(pi)}#map-section`;
      mapLink.hidden = false;
    } else {
      mapLink.hidden = true;
    }
  }

  content.innerHTML = heading('Zones', `${countZones(commune)} zones`) + `<div class="grid" id="grid"></div>`;
  const grid = document.getElementById('grid');
  commune.zones.forEach((z, zi) => {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = zoneUrl(pi, ci, zi);
    a.innerHTML = `
      <span class="card-title">${z.name}</span>
      <span class="card-count">${countCollines(z)} collines / quartiers</span>
    `;
    a.appendChild(createFavButton({ type: 'zone', label: z.name, path: `${titleCase(province.name)} / ${commune.name}`, href: zoneUrl(pi, ci, zi) }));
    grid.appendChild(a);
  });
}

function initZone(){
  const pi = qsInt('p');
  const ci = qsInt('c');
  const zi = qsInt('z');
  const province = pi !== null ? DATA.provinces[pi] : null;
  const commune = province && ci !== null ? province.communes[ci] : null;
  const zone = commune && zi !== null ? commune.zones[zi] : null;
  const content = document.getElementById('content');

  if (!province || !commune || !zone){
    renderBreadcrumb(document.getElementById('crumbs'), [{ label: 'Burundi', href: 'index.html' }, { label: 'Zone introuvable' }]);
    content.innerHTML = notFound(
      "Cette zone n'existe pas ou le lien utilisé est incomplet.",
      'index.html',
      'Retour à la liste des provinces'
    );
    return;
  }

  renderBreadcrumb(document.getElementById('crumbs'), [
    { label: 'Burundi', href: 'index.html' },
    { label: titleCase(province.name), href: provinceUrl(pi) },
    { label: commune.name, href: communeUrl(pi, ci) },
    { label: zone.name }
  ]);
  document.getElementById('back-link').href = communeUrl(pi, ci);

  document.title = `${zone.name} | Reba Uburundi`;
  document.getElementById('page-title').textContent = zone.name;
  document.getElementById('page-meta').textContent =
    `Zone de la commune ${commune.name}, ${titleCase(province.name)} · ${countCollines(zone)} collines et quartiers`;

  const headFavSlot = document.getElementById('page-fav-slot');
  if (headFavSlot){
    headFavSlot.innerHTML = '';
    headFavSlot.appendChild(createFavButton({ type: 'zone', label: zone.name, path: `${titleCase(province.name)} / ${commune.name}`, href: zoneUrl(pi, ci, zi) }));
  }
  wireCopyLinkButton();

  const mapLink = document.getElementById('map-link');
  if (mapLink){
    if (getProvinceCoords(province.name)){
      mapLink.href = `${provinceUrl(pi)}#map-section`;
      mapLink.hidden = false;
    } else {
      mapLink.hidden = true;
    }
  }

  content.innerHTML = `
    <p class="leaf-note">Plus petite unité administrative locale du Burundi. Cliquez l'étoile pour la garder dans vos favoris.</p>
    <div class="colline-list" id="colline-list"></div>
  `;
  const list = document.getElementById('colline-list');
  const highlight = qs('h');
  let highlightedEl = null;
  zone.collines_quarters.forEach(name => {
    const collineHref = zoneUrl(pi, ci, zi, name);
    const pill = document.createElement('span');
    pill.className = 'colline-pill' + (isQuarterName(name) ? ' is-quarter' : '') + (isFavorite(collineHref) ? ' is-favorited' : '');
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    const favItem = { type: isQuarterName(name) ? 'quartier' : 'colline', label: name, path: `${titleCase(province.name)} / ${commune.name} / ${zone.name}`, href: collineHref };
    pill.appendChild(createFavButton(favItem));
    const text = document.createElement('span');
    text.className = 'pill-text';
    text.textContent = name;
    pill.appendChild(text);
    const toggle = () => {
      const nowFav = toggleFavorite(favItem);
      pill.classList.toggle('is-favorited', nowFav);
      pill.querySelector('.fav-btn').classList.toggle('is-fav', nowFav);
    };
    pill.addEventListener('click', toggle);
    pill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); }
    });
    if (highlight && normalize(name) === normalize(highlight)){
      pill.classList.add('pill-highlight');
      highlightedEl = pill;
    }
    list.appendChild(pill);
  });
  if (highlightedEl){
    highlightedEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function initSearchPage(){
  const q = qs('q') || '';
  const content = document.getElementById('content');

  renderBreadcrumb(document.getElementById('crumbs'), [
    { label: 'Burundi', href: 'index.html' },
    { label: 'Résultats de recherche' }
  ]);
  document.getElementById('back-link').href = 'index.html';
  document.title = `Recherche : ${q} | Reba Uburundi`;

  if (!q.trim()){
    content.innerHTML = notFound(
      "Saisissez un nom de lieu dans la barre de recherche ci-dessus pour commencer.",
      'index.html',
      "Retour à l'accueil"
    );
    return;
  }

  const results = doSearch(q, 100);
  document.getElementById('page-title').textContent = `Recherche : « ${q} »`;
  document.getElementById('page-meta').textContent = results.length
    ? `${results.length}${results.length === 100 ? '+' : ''} résultat${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}`
    : 'Aucun résultat';

  if (!results.length){
    content.innerHTML = `
      <div class="empty-state">
        Aucun résultat pour « ${q} ». Vérifiez l'orthographe ou essayez un autre nom de lieu.
      </div>
    `;
    return;
  }

  content.innerHTML = `<div class="results-list" id="results-list"></div>`;
  const list = document.getElementById('results-list');
  results.forEach(r => {
    const a = document.createElement('a');
    a.className = 'result-item';
    a.href = r.href;
    a.innerHTML = `
      <span class="result-main">
        <span class="result-name">${r.name}</span>
        <span class="result-path">${r.path}</span>
      </span>
      <span class="result-type">${TYPE_LABEL[r.type]}</span>
    `;
    list.appendChild(a);
  });
}

function initMapPage(){
  const markers = DATA.provinces.map((p, pi) => {
    const c = getProvinceCoords(p.name);
    if (!c) return null;
    return {
      lat: c.lat,
      lng: c.lng,
      popup: `<strong>${titleCase(p.name)}</strong><br>Chef-lieu : ${p.capital}<br>${countCommunes(p)} communes<br><a href="${provinceUrl(pi)}">Voir la province</a>`
    };
  }).filter(Boolean);

  const map = buildLeafletMap('map', markers, { zoom: 8 });

  // Couche des sites touristiques et culturels, activable/désactivable
  let poiLayer = null;
  const poiMarkersById = {};
  function buildPoiLayer(){
    if (!map || typeof L === 'undefined') return null;
    const layer = L.layerGroup();
    POINTS_OF_INTEREST.forEach(poi => {
      const marker = L.circleMarker([poi.lat, poi.lng], {
        radius: 7,
        color: POI_CATEGORY_COLOR[poi.category],
        fillColor: POI_CATEGORY_COLOR[poi.category],
        fillOpacity: 0.85,
        weight: 2,
      });
      marker.bindPopup(`<strong>${poi.name}</strong><br>${poi.blurb}<br><a href="decouvrir.html#poi-${poi.id}">En savoir plus</a>`);
      marker.addTo(layer);
      poiMarkersById[poi.id] = marker;
    });
    return layer;
  }

  const poiToggle = document.getElementById('poi-toggle');
  if (poiToggle){
    poiToggle.addEventListener('change', () => {
      if (!map) return;
      if (poiToggle.checked){
        if (!poiLayer) poiLayer = buildPoiLayer();
        if (poiLayer) poiLayer.addTo(map);
      } else if (poiLayer){
        map.removeLayer(poiLayer);
      }
    });
    if (poiToggle.checked){
      poiLayer = buildPoiLayer();
      if (poiLayer && map) poiLayer.addTo(map);
    }
  }

  // Ouvre directement un site si l'URL contient ?poi=identifiant (lien depuis la page Découvrir)
  const poiParam = qs('poi');
  if (poiParam && map){
    const poi = getPoiById(poiParam);
    const marker = poiMarkersById[poiParam];
    if (poi && marker){
      map.setView([poi.lat, poi.lng], 11);
      marker.openPopup();
    }
  }

  const btn = document.getElementById('locate-btn');
  const resultEl = document.getElementById('locate-result');
  if (!btn) return;

  let userMarker = null;

  btn.addEventListener('click', () => {
    if (!navigator.geolocation){
      resultEl.textContent = "La géolocalisation n'est pas prise en charge par ce navigateur.";
      return;
    }
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = 'Localisation en cours...';

    navigator.geolocation.getCurrentPosition((pos) => {
      btn.disabled = false;
      btn.textContent = originalLabel;
      const { latitude, longitude } = pos.coords;

      if (userMarker && map) map.removeLayer(userMarker);
      if (map){
        userMarker = L.circleMarker([latitude, longitude], { radius: 8, color: '#9C3D34', fillColor: '#9C3D34', fillOpacity: 0.9 }).addTo(map);
        userMarker.bindPopup('Vous êtes ici (position approximative)').openPopup();
        map.setView([latitude, longitude], 9);
      }

      let nearest = null;
      DATA.provinces.forEach((p, pi) => {
        const c = getProvinceCoords(p.name);
        if (!c) return;
        const d = haversineKm(latitude, longitude, c.lat, c.lng);
        if (!nearest || d < nearest.d) nearest = { p, pi, d };
      });

      if (nearest){
        resultEl.innerHTML = `Vous semblez être le plus proche du chef-lieu de la province de
          <a href="${provinceUrl(nearest.pi)}">${titleCase(nearest.p.name)}</a>
          (${nearest.p.capital}), à environ <strong>${formatDistance(nearest.d)}</strong>.
          <span class="locate-caveat">Estimation basée sur la distance à vol d'oiseau jusqu'aux cinq chefs-lieux provinciaux. Une position proche d'une frontière peut être approximative.</span>`;
      } else {
        resultEl.textContent = 'Position obtenue, mais aucune province de référence disponible pour comparer.';
      }
    }, (err) => {
      btn.disabled = false;
      btn.textContent = originalLabel;
      resultEl.textContent = 'Localisation impossible : ' + (err.code === 1
        ? "l'accès à votre position a été refusé."
        : "votre position n'a pas pu être déterminée.");
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

function initDecouvrir(){
  const factsGrid = document.getElementById('country-facts');
  if (factsGrid){
    const items = [
      ['Population', `${COUNTRY_FACTS.population} (${COUNTRY_FACTS.populationNote})`],
      ['Superficie', COUNTRY_FACTS.area],
      ['Capitales', COUNTRY_FACTS.capitals],
      ['Langues', COUNTRY_FACTS.languages],
      ['Monnaie', COUNTRY_FACTS.currency],
      ['Fuseau horaire', COUNTRY_FACTS.timezone],
    ];
    factsGrid.innerHTML = items.map(([label, value]) => `
      <div class="fact-item"><div class="fact-label">${label}</div><div class="fact-value">${value}</div></div>
    `).join('');
  }

  function renderPoiGrid(containerId, category){
    const el = document.getElementById(containerId);
    if (!el) return;
    const items = POINTS_OF_INTEREST.filter(p => p.category === category);
    el.innerHTML = items.map(poi => `
      <div class="poi-card" id="poi-${poi.id}">
        <div class="poi-title">${poi.name}</div>
        <span class="poi-badge cat-${poi.category}">${POI_CATEGORY_LABEL[poi.category]}</span>
        <p class="poi-blurb">${poi.blurb}</p>
        <a class="poi-link" href="map.html?poi=${poi.id}">Voir sur la carte</a>
      </div>
    `).join('');
    items.forEach(poi => {
      const card = document.getElementById(`poi-${poi.id}`);
      if (card) card.appendChild(createFavButton({ type: 'site', label: poi.name, path: 'Sites à découvrir', href: `map.html?poi=${poi.id}` }));
    });
  }

  renderPoiGrid('poi-nature', 'nature');
  renderPoiGrid('poi-culture', 'culture');
  renderPoiGrid('poi-histoire', 'histoire');

  const timelineEl = document.getElementById('history-timeline');
  if (timelineEl){
    timelineEl.innerHTML = HISTORY_TIMELINE.map(item => `
      <div class="timeline-row">
        <span class="timeline-year">${item.year}</span>
        <span class="timeline-text">${item.text}</span>
      </div>
    `).join('');
  }

  const symbolsEl = document.getElementById('national-symbols');
  if (symbolsEl){
    symbolsEl.innerHTML = `
      <div class="practical-item"><strong>Drapeau</strong>${NATIONAL_SYMBOLS.flag}<br><span style="color:var(--ink-soft);font-size:0.85rem;">${NATIONAL_SYMBOLS.flagColors}</span></div>
      <div class="practical-item"><strong>Devise nationale</strong>${NATIONAL_SYMBOLS.motto}</div>
      <div class="practical-item"><strong>Hymne national</strong>${NATIONAL_SYMBOLS.anthem}</div>
      <div class="practical-item"><strong>Fête de l'indépendance</strong>${NATIONAL_SYMBOLS.independenceDay}</div>
    `;
  }

  const practicalEl = document.getElementById('practical-facts');
  if (practicalEl){
    const items = [
      ['Langues utiles', COUNTRY_FACTS.languages],
      ['Monnaie', COUNTRY_FACTS.currency],
      ['Décalage horaire', COUNTRY_FACTS.timezone],
      ['Climat', COUNTRY_FACTS.climate],
    ];
    practicalEl.innerHTML = items.map(([label, value]) => `
      <div class="practical-item"><strong>${label}</strong>${value}</div>
    `).join('');
  }

  // Ouvre directement la bonne section si l'URL contient une ancre #poi-...
  if (window.location.hash){
    const target = document.querySelector(window.location.hash);
    if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function initFavoris(){
  const list = document.getElementById('fav-list');
  const empty = document.getElementById('fav-empty');
  if (!list) return;

  function render(){
    const favs = getFavorites();
    updateFavCountBadge();
    if (!favs.length){
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = '';
    favs.forEach(item => {
      const row = document.createElement('div');
      row.className = 'fav-row';
      row.innerHTML = `
        <span class="fav-row-type">${TYPE_LABEL[item.type] || item.type}</span>
        <span class="fav-row-main">
          <a class="fav-row-name" href="${item.href}">${item.label}</a>
          <span class="fav-row-path">${item.path}</span>
        </span>
      `;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'fav-remove-btn';
      removeBtn.setAttribute('aria-label', 'Retirer des favoris');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        const remaining = getFavorites().filter(f => f.href !== item.href);
        saveFavorites(remaining);
        render();
      });
      row.appendChild(removeBtn);
      list.appendChild(row);
    });
  }

  render();
}

function parseFactNumber(str){
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

function initChiffres(){
  // Comparaison des provinces : population et densité
  const provinceItems = DATA.provinces.map(p => {
    const f = getProvinceFacts(p.name);
    return { name: titleCase(p.name), pop: f ? parseFactNumber(f.population) : 0, density: f ? parseFactNumber(f.density) : 0 };
  });

  renderBarList('chart-population', provinceItems.map(p => ({
    label: p.name, value: p.pop, display: fmt(p.pop)
  })));
  renderBarList('chart-density', provinceItems.map(p => ({
    label: p.name, value: p.density, display: `${fmt(p.density)} hab./km²`
  })));

  // Répartition administrative par province
  renderBarList('chart-communes', DATA.provinces.map(p => ({
    label: titleCase(p.name), value: countCommunes(p), display: `${countCommunes(p)} communes`
  })));
  renderBarList('chart-zones', DATA.provinces.map(p => ({
    label: titleCase(p.name), value: totalZonesInProvince(p), display: `${fmt(totalZonesInProvince(p))} zones`
  })));

  // Communes qui comptent le plus de zones
  const allCommunes = [];
  DATA.provinces.forEach((p, pi) => {
    p.communes.forEach((c, ci) => {
      allCommunes.push({ name: c.name, province: titleCase(p.name), zones: countZones(c), href: communeUrl(pi, ci) });
    });
  });
  const topCommunes = [...allCommunes].sort((a, b) => b.zones - a.zones).slice(0, 8);
  const topCommunesEl = document.getElementById('top-communes');
  if (topCommunesEl){
    topCommunesEl.innerHTML = topCommunes.map((c, i) => `
      <li><a href="${c.href}">${c.name}</a> <span class="rank-meta">(${c.province}) : ${c.zones} zones</span></li>
    `).join('');
  }

  // Zones qui comptent le plus de collines/quartiers
  const allZones = [];
  DATA.provinces.forEach((p, pi) => {
    p.communes.forEach((c, ci) => {
      c.zones.forEach((z, zi) => {
        allZones.push({ name: z.name, province: titleCase(p.name), commune: c.name, count: countCollines(z), href: zoneUrl(pi, ci, zi) });
      });
    });
  });
  const topZones = [...allZones].sort((a, b) => b.count - a.count).slice(0, 10);
  const topZonesEl = document.getElementById('top-zones');
  if (topZonesEl){
    topZonesEl.innerHTML = topZones.map(z => `
      <li><a href="${z.href}">${z.name}</a> <span class="rank-meta">(${z.commune}, ${z.province}) : ${z.count} collines/quartiers</span></li>
    `).join('');
  }

  // Distances à vol d'oiseau entre les cinq chefs-lieux provinciaux
  const matrixEl = document.getElementById('distance-matrix');
  if (matrixEl){
    const names = DATA.provinces.map(p => titleCase(p.name));
    const coordsList = DATA.provinces.map(p => getProvinceCoords(p.name));
    let html = '<table class="distance-table"><thead><tr><th></th>' + names.map(n => `<th>${n}</th>`).join('') + '</tr></thead><tbody>';
    names.forEach((rowName, i) => {
      html += `<tr><th>${rowName}</th>`;
      names.forEach((colName, j) => {
        if (i === j || !coordsList[i] || !coordsList[j]){
          html += '<td>-</td>';
        } else {
          const d = haversineKm(coordsList[i].lat, coordsList[i].lng, coordsList[j].lat, coordsList[j].lng);
          html += `<td>${Math.round(d)} km</td>`;
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    matrixEl.innerHTML = html;
  }
}

/* ---------------- Aiguillage selon la page ---------------- */

initSearchWidget();
highlightActiveNav();
updateFavCountBadge();

switch (document.body.dataset.page){
  case 'home': initHome(); break;
  case 'province': initProvince(); break;
  case 'commune': initCommune(); break;
  case 'zone': initZone(); break;
  case 'search': initSearchPage(); break;
  case 'map': initMapPage(); break;
  case 'decouvrir': initDecouvrir(); break;
  case 'favoris': initFavoris(); break;
  case 'chiffres': initChiffres(); break;
}
