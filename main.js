const DATA_CSV_PATH = 'data.csv';

let catalog = []; // {id, sheet, name, image, value}
let boxA = []; // [{item, qty}, ...]
let boxB = []; // [{item, qty}, ...]

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

// loadCatalog logic inlined into init to reduce one-time-use function

function populateCategory(){
  categorySelect.innerHTML = '';
  categorySelect.appendChild(Object.assign(document.createElement('option'), { value: 'all', textContent: 'All' }));
  const categories = Array.from(new Set(catalog.map(item => item.sheet))).sort((a, b) => a.localeCompare(b));
  categories.forEach(sheet => categorySelect.appendChild(Object.assign(document.createElement('option'), { value: sheet, textContent: sheet })));
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
  list.forEach(item => itemsList.appendChild(createCatalogItemElement(item)));
}

function createCatalogItemElement(item){
  const el = document.createElement('div');
  el.className = 'item';
  const img = document.createElement('img');
  img.src = item.image || 'https://via.placeholder.com/64?text=?';
  const meta = document.createElement('div');
  meta.className = 'meta';
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = item.name;
  const val = document.createElement('div');
  val.className = 'val';
  val.textContent = `Value: ${item.value}`;
  const btnA = document.createElement('button');
  btnA.textContent = 'Add A';
  btnA.onclick = () => addToBox('A', item.id);
  btnA.className = 'btn';
  const btnB = document.createElement('button');
  btnB.textContent = 'Add B';
  btnB.onclick = () => addToBox('B', item.id);
  btnB.className = 'btn primary';
  meta.appendChild(name);
  meta.appendChild(val);
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.appendChild(btnA);
  actions.appendChild(btnB);
  el.appendChild(img);
  el.appendChild(meta);
  el.appendChild(actions);
  return el;
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

function updateBoxes(){
  boxAItems.innerHTML = '';
  boxA.forEach((entry, i) => {
    const {item, qty} = entry;
    const el = document.createElement('div');
    el.className = 'box-item';
    const img = document.createElement('img');
    img.src = item.image || 'https://via.placeholder.com/36?text=?';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = `${item.name} x${qty}`;
    const btnMinus = document.createElement('button');
    btnMinus.className = 'btn qty-btn';
    btnMinus.textContent = '-';
    btnMinus.onclick = () => adjustQty('A', i, -1);
    const btnPlus = document.createElement('button');
    btnPlus.className = 'btn qty-btn';
    btnPlus.textContent = '+';
    btnPlus.onclick = () => adjustQty('A', i, 1);
    const btnRemove = document.createElement('button');
    btnRemove.className = 'btn remove';
    btnRemove.textContent = 'Remove';
    btnRemove.onclick = () => removeFromBox('A', i);
    el.appendChild(img);
    el.appendChild(name);
    el.appendChild(btnMinus);
    el.appendChild(btnPlus);
    el.appendChild(btnRemove);
    boxAItems.appendChild(el);
  });

  boxBItems.innerHTML = '';
  boxB.forEach((entry, i) => {
    const {item, qty} = entry;
    const el = document.createElement('div');
    el.className = 'box-item';
    const img = document.createElement('img');
    img.src = item.image || 'https://via.placeholder.com/36?text=?';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = `${item.name} x${qty}`;
    const btnMinus = document.createElement('button');
    btnMinus.className = 'btn qty-btn';
    btnMinus.textContent = '-';
    btnMinus.onclick = () => adjustQty('B', i, -1);
    const btnPlus = document.createElement('button');
    btnPlus.className = 'btn qty-btn';
    btnPlus.textContent = '+';
    btnPlus.onclick = () => adjustQty('B', i, 1);
    const btnRemove = document.createElement('button');
    btnRemove.className = 'btn remove';
    btnRemove.textContent = 'Remove';
    btnRemove.onclick = () => removeFromBox('B', i);
    el.appendChild(img);
    el.appendChild(name);
    el.appendChild(btnMinus);
    el.appendChild(btnPlus);
    el.appendChild(btnRemove);
    boxBItems.appendChild(el);
  });

  const sum = arr => arr.reduce((s, entry) => s + (entry.item.value * entry.qty), 0);
  const a = sum(boxA);
  const b = sum(boxB);
  totalA.textContent = a.toFixed(0);
  totalB.textContent = b.toFixed(0);
  updateDiff(a, b);
}

function updateDiff(a, b){
  if(a === 0 && b === 0){
    diffPercent.textContent = '0%';
    return;
  }
  const avg = (a + b) / 2 || 1;
  const diff = ((a - b) / avg) * 100;
  const sign = diff > 0 ? '+' : '';
  diffPercent.textContent = `${sign}${diff.toFixed(1)}%`;
}

function buildShareURL(){
  const left = boxA.map(entry => `${encodeURIComponent(entry.item.id)}:${entry.qty}`).join(',');
  const right = boxB.map(entry => `${encodeURIComponent(entry.item.id)}:${entry.qty}`).join(',');
  const params = new URLSearchParams();
  if(left) params.set('left', left);
  if(right) params.set('right', right);
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

async function copyShareURL(){
  const url = buildShareURL();
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

async function init(){
  try{
    const res = await fetch(DATA_CSV_PATH);
    if(res.ok){
      const text = await res.text();
      const rows = parseCsv(text);
      if(rows.length){
        const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
        const dataRows = rows.slice(1);
        const findCol = cands => { for(const c of cands){ const idx = headers.findIndex(h => h === c || h.includes(c)); if(idx>=0) return idx } return -1 };
        const iCategory = findCol(['category','sheet']);
        const iName = findCol(['name','item','item_name','nombre']);
        const iImage = findCol(['img','image','icon','thumbnail','imagen']);
        const iValue = findCol(['value','price','valor','cost','precio']);
        const iTrade = findCol(['tradable','tradeable','trade']);
        catalog = [];
        dataRows.forEach(r => {
          const category = iCategory>=0 ? String(r[iCategory]||'').trim() : '';
          const name = iName>=0 ? String(r[iName]||'').trim() : '';
          if(!name) return;
          const tradeable = iTrade>=0 ? String(r[iTrade]||'').trim().toLowerCase() : 'yes';
          if(iTrade>=0 && tradeable !== 'yes') return;
          const image = iImage>=0 ? String(r[iImage]||'').trim() : '';
          const value = parseNumericValue(iValue>=0 ? r[iValue] : '0');
          const sheet = category || 'Unknown';
          catalog.push({ id: `${sheet}::${name}`, sheet, name, image, value });
        });
      }
    }
  }catch(error){ console.error('Error loading CSV', error) }
  populateCategory();
  setupListeners();
  loadFromURL();
  renderItems();
  updateBoxes();
}

init();
