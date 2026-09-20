let files = [];
const byId = id => document.getElementById(id);
const size = bytes => `${(bytes / 1024).toFixed(1)} KB`;
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function render() {
  const query = byId('search').value.trim().toLocaleLowerCase();
  const publisher = byId('publisher').value;
  const rows = files.filter(row => (!publisher || row.publisher === publisher) && row.file.toLocaleLowerCase().includes(query));
  const maximum = Math.max(1, ...files.map(row => row.bytes));
  byId('files').replaceChildren(...rows.map(row => {
    const card = element('article', undefined, 'card');
    card.append(element('span', row.publisher, 'tag'), element('h3', row.file), element('p', `파일 크기 ${size(row.bytes)}`));
    const bar = element('div', undefined, 'bar'); bar.setAttribute('aria-hidden', 'true');
    const fill = element('span'); fill.style.width = `${row.bytes / maximum * 100}%`; bar.append(fill);
    card.append(bar, element('p', row.source_status), element('p', row.freshness));
    const details = element('details'); details.append(element('summary', 'SHA-256 파일 지문 보기'), element('code', row.sha256)); card.append(details);
    return card;
  }));
  byId('status').textContent = `${files.length}개 중 ${rows.length}개 파일 표시${rows.length ? '' : ' · 검색 조건에 맞는 파일이 없습니다.'}`;
}
async function init() {
  try {
    const response = await fetch('catalog.json');
    if (!response.ok) throw new Error('Metadata unavailable');
    const data = await response.json();
    if (data.schema_version !== 1 || !Array.isArray(data.files) || !data.files.every(row => typeof row.file === 'string' && typeof row.publisher === 'string' && Number.isSafeInteger(row.bytes) && row.bytes >= 0 && /^[a-f0-9]{64}$/.test(row.sha256))) throw new Error('Invalid metadata');
    files = data.files;
    const publishers = [...new Set(files.map(row => row.publisher))].sort();
    for (const name of publishers) { const option = element('option', name); option.value = name; byId('publisher').append(option); }
    byId('fileCount').textContent = files.length;
    byId('publisherCount').textContent = publishers.length;
    byId('totalSize').textContent = size(files.reduce((sum, row) => sum + row.bytes, 0));
    byId('revision').textContent = `메타데이터 추출 기준 커밋: ${data.source_commit}`;
    render();
  } catch {
    byId('status').textContent = '메타데이터를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
    for (const id of ['search', 'publisher', 'reset']) byId(id).disabled = true;
  }
}
byId('search').addEventListener('input', render);
byId('publisher').addEventListener('change', render);
byId('reset').addEventListener('click', () => { byId('search').value = ''; byId('publisher').value = ''; render(); });
init();
