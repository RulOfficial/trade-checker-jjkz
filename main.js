const DATA_CSV_PATH = 'data.csv';
let catalog = [];
let boxA = [];
let boxB = [];

const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');
const itemsList = document.getElementById('itemsList');
const boxAItems = document.getElementById('boxAItems');
const boxBItems = document.getElementById('boxBItems');
const totalA = document.getElementById('totalA');
const totalB = document.getElementById('totalB');
const diffPercent = document.getElementById('diffPercent');

function parseNumericValue(valueRaw){
  if(valueRaw == null) return 0;
  let s = String(valueRaw).trim().toLowerCase();
  if(!s) return 0;
  s = s.replace(/\s+/g,'');
  let mult = 1;
  if(s.endsWith('k')){ mult = 1000; s = s.slice(0,-1); }
  if(s.indexOf(',') > -1 && s.indexOf('.') === -1) s = s.replace(',','.');
  s = s.replace(/[^0-9.\-]/g,'');
  const num = parseFloat(s);
  if(isNaN(num)) return 0;
  return num * mult;
}

function parseCsv(text){
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for(let i = 0; i < text.length; i++){
    const ch = text[i];
    const next = text[i + 1];

    if(ch === '"'){
      if(inQuotes && next === '"'){
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if(ch === ',' && !inQuotes){
      row.push(cell);
      cell = '';
      continue;
    }

    if((ch === '\n' || ch === '\r') && !inQuotes){
      if(ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      if(row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  if(cell.length || row.length){
    row.push(cell);
    if(row.length > 1 || row[0] !== '') rows.push(row);
  }

  return rows;
}

function renderItems(){
  const cat = categorySelect.value;
  const q = searchInput.value.trim().toLowerCase();
  let list = catalog.filter(item => (cat === 'all' || item.sheet === cat) && (!q || item.name.toLowerCase().includes(q)));
  const sort = sortSelect.value;
  if(sort === 'value_desc') list.sort((a, b) => b.value - a.value);
  if(sort === 'value_asc') list.sort((a, b) => a.value - b.value);
  if(sort === 'alpha_asc') list.sort((a, b) => a.name.localeCompare(b.name));
  if(sort === 'alpha_desc') list.sort((a, b) => b.name.localeCompare(a.name));

  itemsList.innerHTML = '';
  list.forEach(item => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/64?text=?'}">
      <div class="meta">
        <div class="name">${item.name}</div>
        <div class="val">Value: ${item.value}</div>
      </div>
      <div class="actions">
        <button class="btn" onclick="addToBox('A', '${item.id}')">Add A</button>
        <button class="btn primary" onclick="addToBox('B', '${item.id}')">Add B</button>
      </div>
    `;
    itemsList.appendChild(el);
  });
}

function findItemById(id){
  return catalog.find(item => item.id === id);
}

function addToBox(box, id){
  const item = findItemById(id);
  if(!item) return;
  const target = box === 'A' ? boxA : boxB;
  const existing = target.find(entry => entry.item.id === id);
  if(existing){
    existing.qty += 1;
  } else {
    target.push({item, qty: 1});
  }
  updateBoxes();
}

function removeFromBox(box, idx){
  const target = box === 'A' ? boxA : boxB;
  target.splice(idx, 1);
  updateBoxes();
}

function adjustQty(box, idx, delta){
  const target = box === 'A' ? boxA : boxB;
  if(!target[idx]) return;
  target[idx].qty = Math.max(1, target[idx].qty + delta);
  updateBoxes();
}

function renderBoxItems(box, container){
  container.innerHTML = '';
  box.forEach((entry, i) => {
    const el = document.createElement('div');
    el.className = 'box-item';
    const boxId = box === boxA ? 'A' : 'B';
    el.innerHTML = `
      <img src="${entry.item.image || 'https://via.placeholder.com/36?text=?'}">
      <div class="name">${entry.item.name} x${entry.qty}</div>
      <button class="btn qty-btn" onclick="adjustQty('${boxId}', ${i}, -1)">-</button>
      <button class="btn qty-btn" onclick="adjustQty('${boxId}', ${i}, 1)">+</button>
      <button class="btn remove" onclick="removeFromBox('${boxId}', ${i})">Remove</button>
    `;
    container.appendChild(el);
  });
}

function updateBoxes(){
  renderBoxItems(boxA, boxAItems);
  renderBoxItems(boxB, boxBItems);

  const sum = arr => arr.reduce((s, entry) => s + (entry.item.value * entry.qty), 0);
  const a = sum(boxA);
  const b = sum(boxB);
  totalA.textContent = a.toFixed(0);
  totalB.textContent = b.toFixed(0);
  
  if(a === 0 && b === 0){
    diffPercent.textContent = '0%';
  } else {
    const avg = (a + b) / 2;
    const diff = ((a - b) / avg) * 100;
    diffPercent.textContent = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  }
}

async function copyShareURL(){
  const left = boxA.map(entry => `${encodeURIComponent(entry.item.id)}:${entry.qty}`).join(',');
  const right = boxB.map(entry => `${encodeURIComponent(entry.item.id)}:${entry.qty}`).join(',');
  const params = new URLSearchParams();
  if(left) params.set('left', left);
  if(right) params.set('right', right);
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const btn = document.getElementById('copyLinkBtn');
    if(btn){
      const old = btn.textContent;
      btn.textContent = 'Copied ✓';
      setTimeout(() => btn.textContent = old, 1500);
    }
  }catch(error){
    console.error('Copy failed', error);
    alert('Could not copy the link');
  }
}

function loadFromURL(){
  const params = new URLSearchParams(window.location.search);
  const left = params.get('left');
  const right = params.get('right');

  if(left){
    boxA = left.split(',').map(part => {
      const [rawId, qtyStr] = part.split(':');
      const item = findItemById(decodeURIComponent(rawId || ''));
      const qty = parseInt(qtyStr, 10) || 1;
      return item ? {item, qty} : null;
    }).filter(Boolean);
  }

  if(right){
    boxB = right.split(',').map(part => {
      const [rawId, qtyStr] = part.split(':');
      const item = findItemById(decodeURIComponent(rawId || ''));
      const qty = parseInt(qtyStr, 10) || 1;
      return item ? {item, qty} : null;
    }).filter(Boolean);
  }
}

function setupListeners(){
  categorySelect.onchange = renderItems;
  sortSelect.onchange = renderItems;
  searchInput.oninput = renderItems;
  const copyBtn = document.getElementById('copyLinkBtn');
  if(copyBtn) copyBtn.addEventListener('click', copyShareURL);
}

async function loadCatalogFromCSV(){
  try{
    const res = await fetch(DATA_CSV_PATH);
    if(!res.ok) throw new Error('Failed to fetch CSV');
    const text = await res.text();
    const rows = parseCsv(text);
    if(rows.length < 2) throw new Error('CSV must have header and data rows');
    rows.slice(1).forEach(row => {
      const category = String(row[0]||'').trim();
      const name = String(row[1]||'').trim();
      const image = String(row[2]||'').trim();
      const value = parseNumericValue(row[3]);
      if(!name) return;
      const sheet = category || 'Unknown';
      catalog.push({ 
        id: `${sheet}::${name}`, 
        sheet, 
        name, 
        image, 
        value 
      });
    });
  }catch(error){
    console.error('Error loading catalog:', error);
  }
}

async function init(){
  await loadCatalogFromCSV();
  categorySelect.innerHTML = '<option value="all">All</option>';
  Array.from(new Set(catalog.map(item => item.sheet)))
    .sort((a, b) => a.localeCompare(b))
    .forEach(sheet => {
      const opt = document.createElement('option');
      opt.value = sheet;
      opt.textContent = sheet;
      categorySelect.appendChild(opt);
    });
  setupListeners();
  loadFromURL();
  renderItems();
  updateBoxes();
}

init();
