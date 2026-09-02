/* =========================================================
   Reba Uburundi — logique partagée par toutes les pages
   Pages réelles : index.html, province.html, commune.html,
   zone.html, search.html — chacune fait un vrai changement
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

function gmapsLink(lat, lng){
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
function gmapsDirections(fromLat, fromLng, toLat, toLng){
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`;
}

/* ---------------- Fil d'ariane ---------------- */

// items: [{ label, href }] — href null/absent = étape courante (non cliquable)
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
   Initialisation par page — chaque fonction lit l'URL de sa propre
   page et construit son contenu ; la navigation d'une page à l'autre
   se fait par de vrais liens <a href="...">.
   ================================================================ */

function initHome(){
  const statsEl = document.getElementById('stats');
  const footerEl = document.getElementById('footer-count');
  if (statsEl) renderStats(statsEl, footerEl);

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

  document.title = `${titleCase(province.name)} — Reba Uburundi`;
  document.getElementById('page-title').textContent = titleCase(province.name);
  document.getElementById('page-meta').textContent =
    `Chef-lieu : ${province.capital} · ${countCommunes(province)} communes · ${fmt(totalZonesInProvince(province))} zones · ${fmt(totalCollinesInProvince(province))} collines et quartiers`;

  content.innerHTML = heading('Communes', `${countCommunes(province)} communes`) + `<div class="grid" id="grid"></div>`;
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

      resultEl.innerHTML = `Vous êtes à environ <strong>${Math.round(dist)} km</strong> du chef-lieu ${province.capital}.
        <span class="locate-caveat">Distance à vol d'oiseau depuis votre position jusqu'au chef-lieu — pas une détection de commune ou de zone exacte.</span>`;

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

  document.title = `${commune.name} — Reba Uburundi`;
  document.getElementById('page-title').textContent = commune.name;
  document.getElementById('page-meta').textContent =
    `Commune de ${titleCase(province.name)} · ${countZones(commune)} zones · ${fmt(totalCollinesInCommune(commune))} collines et quartiers`;

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

  document.title = `${zone.name} — Reba Uburundi`;
  document.getElementById('page-title').textContent = zone.name;
  document.getElementById('page-meta').textContent =
    `Zone de la commune ${commune.name}, ${titleCase(province.name)} · ${countCollines(zone)} collines et quartiers`;

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
    <p class="leaf-note">Plus petite unité administrative locale du Burundi.</p>
    <div class="colline-list" id="colline-list"></div>
  `;
  const list = document.getElementById('colline-list');
  const highlight = qs('h');
  let highlightedEl = null;
  zone.collines_quarters.forEach(name => {
    const span = document.createElement('span');
    span.className = 'colline-pill' + (isQuarterName(name) ? ' is-quarter' : '');
    span.textContent = name;
    if (highlight && normalize(name) === normalize(highlight)){
      span.classList.add('pill-highlight');
      highlightedEl = span;
    }
    list.appendChild(span);
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
  document.title = `Recherche : ${q} — Reba Uburundi`;

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
          (${nearest.p.capital}), à environ <strong>${Math.round(nearest.d)} km</strong>.
          <span class="locate-caveat">Estimation basée sur la distance à vol d'oiseau jusqu'aux cinq chefs-lieux provinciaux — une position proche d'une frontière peut être approximative.</span>`;
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

/* ---------------- Aiguillage selon la page ---------------- */

initSearchWidget();

switch (document.body.dataset.page){
  case 'home': initHome(); break;
  case 'province': initProvince(); break;
  case 'commune': initCommune(); break;
  case 'zone': initZone(); break;
  case 'search': initSearchPage(); break;
  case 'map': initMapPage(); break;
}
