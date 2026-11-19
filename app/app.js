const state = {data: null, earned: new Set(), progress: {}, kind: 'all', grade: 'all', sort: 'roadmap', query: '', view: 'checklist', open: null, spoiler: false};
const $ = id => document.getElementById(id);
const kinds = ['all', 'story', 'missable', 'collectibles', 'activities', 'online'];
const grades = ['platinum', 'gold', 'silver', 'bronze'];
const earnedKey = 'leonida-earned';
const progressKey = 'leonida-progress';

function loadStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function setProgress(trophy, value) {
  const count = Math.min(trophy.count, Math.max(0, Math.trunc(value)));
  if (count) state.progress[trophy.id] = count;
  else delete state.progress[trophy.id];
  if (count === trophy.count) state.earned.add(trophy.id);
  else state.earned.delete(trophy.id);
}

function setEarned(trophy, earned) {
  if (trophy.count) setProgress(trophy, earned ? trophy.count : 0);
  else if (earned) state.earned.add(trophy.id);
  else state.earned.delete(trophy.id);
}

function loadProgress(ids, progress) {
  const earned = new Set(ids.map(Number));
  state.earned.clear();
  state.progress = {};
  for (const trophy of state.data.trophies) {
    if (earned.has(trophy.id)) setEarned(trophy, true);
    else if (trophy.count && Number.isFinite(progress?.[trophy.id])) setProgress(trophy, progress[trophy.id]);
  }
}

function earnedIds() {
  return [...state.earned].sort((left, right) => left - right);
}

function save() {
  localStorage.setItem(earnedKey, JSON.stringify(earnedIds()));
  localStorage.setItem(progressKey, JSON.stringify(state.progress));
  renderProgress();
  renderResults();
  renderDetail();
}

function isMasked(trophy) {
  return state.spoiler && !state.earned.has(trophy.id) && trophy.hidden;
}

function title(trophy) {
  return isMasked(trophy) ? 'Hidden trophy' : trophy.name;
}

function visible(trophy) {
  return (state.view !== 'missables' || trophy.missable)
    && (state.kind === 'all' || state.kind === trophy.kind || (state.kind === 'missable' && trophy.missable))
    && (state.grade === 'all' || state.grade === trophy.grade)
    && (!$('hideEarned').checked || !state.earned.has(trophy.id))
    && `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase().includes(state.query);
}

function compareTrophies(left, right) {
  const roadmap = left.stage - right.stage || left.id - right.id;
  if (state.sort === 'grade') return grades.indexOf(left.grade) - grades.indexOf(right.grade) || roadmap;
  if (state.sort === 'name') return title(left).localeCompare(title(right)) || roadmap;
  if (state.sort === 'unearned') return Number(state.earned.has(left.id)) - Number(state.earned.has(right.id)) || roadmap;
  return roadmap;
}

function completion(trophies) {
  const total = trophies.length;
  const earned = trophies.filter(trophy => state.earned.has(trophy.id)).length;
  return {earned, total, percent: total ? Math.round(earned / total * 100) : 0};
}

function completionText({earned, total, percent}) {
  return `${earned} / ${total} · ${percent}%`;
}

function renderProgress() {
  const trophies = state.data.trophies;
  const stats = completion(trophies);
  $('earnedCount').textContent = `${stats.earned} / ${stats.total}`;
  $('percent').textContent = `${stats.percent}%`;
  $('progressBar').style.width = `${stats.earned / stats.total * 100}%`;
  $('gradeCounts').innerHTML = grades.map(grade => {
    const {earned, total} = completion(trophies.filter(trophy => trophy.grade === grade));
    return `<span class="${grade}"><b>${earned}</b>/${total} ${grade[0].toUpperCase()}</span>`;
  }).join('');
  const missables = completion(trophies.filter(trophy => trophy.missable));
  $('missablesLeft').textContent = `Missables left: ${missables.total - missables.earned}`;
}

function renderKinds() {
  $('kindFilters').innerHTML = kinds.map(kind => `<button class="chip ${state.kind === kind ? 'active' : ''}" data-kind="${kind}" aria-pressed="${state.kind === kind}">${kind[0].toUpperCase() + kind.slice(1)}</button>`).join('');
}

function miniBar(value, max, label) {
  return `<progress class="mini-bar" value="${value}" max="${max}" aria-label="${label}"></progress>`;
}

function countControl(trophy) {
  if (!trophy.count) return '';
  const count = state.progress[trophy.id] ?? 0;
  return `<div class="counter" data-counter="${trophy.id}" role="group" aria-label="Trophy progress for ${title(trophy)}">
    <div class="counter-controls">
      <button type="button" data-count-action="minus" aria-label="Decrease progress" ${count === 0 ? 'disabled' : ''}>−</button>
      <button type="button" data-count-action="set" aria-label="Set progress, ${count} / ${trophy.count}" title="Set progress">${count} / ${trophy.count}</button>
      <button type="button" data-count-action="plus" aria-label="Increase progress" ${count === trophy.count ? 'disabled' : ''}>+</button>
    </div>
    ${miniBar(count, trophy.count, 'Trophy progress')}
  </div>`;
}

function adjustProgress(event) {
  const button = event.target.closest('[data-count-action]');
  if (!button) return false;
  const counter = button.closest('[data-counter]');
  const trophy = state.data.trophies.find(item => item.id === Number(counter.dataset.counter));
  const action = button.dataset.countAction;
  const count = state.progress[trophy.id] ?? 0;
  let next = count + (action === 'plus' ? 1 : -1);
  if (action === 'set') {
    const entry = prompt(`Set progress for ${title(trophy)} (0–${trophy.count})`, count);
    if (!entry?.trim() || !Number.isFinite(Number(entry))) return true;
    next = Number(entry);
  }
  const panel = counter.closest('#detail, #list');
  setProgress(trophy, next);
  save();
  const updated = panel.querySelector(`[data-counter="${trophy.id}"]`);
  const focus = updated?.querySelector(`[data-count-action="${action}"]:enabled`)
    ?? updated?.querySelector('[data-count-action="set"]');
  (focus ?? $('hideEarned')).focus({preventScroll: true});
  return true;
}

function renderList(rows) {
  $('resultCount').textContent = `${rows.length} shown`;
  $('list').innerHTML = rows.map(trophy => {
    const earned = state.earned.has(trophy.id);
    return `<article class="trophy ${earned ? 'earned' : ''} ${state.open === trophy.id ? 'open' : ''}" data-open="${trophy.id}">
      <input type="checkbox" data-check="${trophy.id}" ${earned ? 'checked' : ''} aria-label="Mark ${title(trophy)} earned">
      <div><h3><button class="trophy-name" type="button" data-trophy-name>${title(trophy)}</button></h3><p>${isMasked(trophy) ? 'Description hidden in spoiler mode' : trophy.description}</p></div>
      <div class="meta"><span class="badge ${trophy.grade}">${trophy.grade}</span><span class="tag">${trophy.kind}</span>${trophy.missable ? '<span class="warn">Missable</span>' : ''}</div>
      ${countControl(trophy)}
    </article>`;
  }).join('') || '<p class="sub">No trophies match these filters.</p>';
}

function renderDetail() {
  const trophy = state.data.trophies.find(item => item.id === state.open) ?? state.data.trophies[0];
  const masked = isMasked(trophy);
  $('detail').innerHTML = `<span class="badge ${trophy.grade}">${trophy.grade}</span>
    <h2>${title(trophy)}</h2>
    <p class="official">${masked ? 'Description hidden in spoiler mode' : trophy.description}</p>
    <p class="source">Source: ${trophy.source}</p>
    <div class="detail-tags"><span class="tag detail-stage">Roadmap · Stage ${trophy.stage}: ${stageName(trophy.stage)}</span>${trophy.missable ? '<span class="warn">Missable</span>' : ''}</div>
    ${trophy.missable ? '<p class="detail-warning">Keep a separate save before this encounter and resolve its conditions before moving on.</p>' : ''}
    <p>${masked ? 'Earn this trophy to reveal its guide.' : trophy.guide}</p>
    ${masked ? '' : `<h3>Steps</h3><ol>${trophy.steps.split(';').map(step => `<li>${step}</li>`).join('')}</ol>`}
    ${countControl(trophy)}`;
}

function stageName(stage) {
  return ['Story chapters', 'Missables and choices', 'Collectibles and exploration', 'Activities and grinds', 'Cleanup and platinum'][stage - 1];
}

function renderRoadmap(rows) {
  const trophies = state.data.trophies;
  const stats = completion(trophies);
  $('roadmap').innerHTML = `<div class="view-head"><div><p class="kicker">ROADMAP</p><h2>Five stages to Leonida Legend</h2></div>
    <div class="platinum-progress"><strong>Platinum progress</strong><span>${completionText(stats)}</span>${miniBar(stats.earned, stats.total, 'Platinum progress')}</div></div>
    <div class="stages">${[1, 2, 3, 4, 5].map(stage => {
      const {earned, total, percent} = completion(trophies.filter(trophy => trophy.stage === stage));
      const name = stageName(stage);
      const buttons = rows.filter(trophy => trophy.stage === stage).map(trophy => `<button type="button" data-stage-open="${trophy.id}">${state.earned.has(trophy.id) ? '✓ ' : ''}${title(trophy)}</button>`).join('');
      return `<div class="stage"><h3>0${stage} · ${name}</h3><p class="stage-count">${completionText({earned, total, percent})}</p>${miniBar(earned, total, `${name} completion`)}${buttons || '<p>No matching trophies</p>'}</div>`;
    }).join('')}</div>`;
}

function renderResults() {
  const rows = state.data.trophies.filter(visible).sort(compareTrophies);
  renderList(rows);
  if (state.view === 'roadmap') renderRoadmap(rows);
}

function renderView() {
  const view = new URLSearchParams(location.hash.slice(1)).get('view');
  state.view = view === 'missables' || view === 'roadmap' ? view : 'checklist';
  document.querySelectorAll('.views a').forEach(link => {
    if (link.hash === `#view=${state.view}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  $('roadmap').classList.toggle('visible', state.view === 'roadmap');
  $('listTitle').textContent = state.view === 'missables' ? 'Missable trophies' : 'All trophies';
  renderResults();
}

function openTrophy(id) {
  document.querySelector('[data-open].open')?.classList.remove('open');
  state.open = Number(id);
  $('list').querySelector(`[data-open="${state.open}"]`)?.classList.add('open');
  renderDetail();
}

function exportProgress() {
  const data = {game: 'Grand Theft Auto VI', earned: earnedIds(), progress: state.progress};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const {earned, progress} = JSON.parse(await file.text());
    loadProgress(earned, progress);
    save();
  } catch {
    alert('That progress file could not be read.');
  }
}

async function start() {
  state.data = await fetch('data/trophies.json').then(response => response.json());
  const params = new URLSearchParams(location.search);
  const shared = (params.get('earned') ?? '').split(',').filter(Boolean);
  const stored = loadStored(earnedKey, []);
  loadProgress([...(Array.isArray(stored) ? stored : []), ...shared], loadStored(progressKey, {}));
  if (params.has('open')) state.open = Number(params.get('open'));

  $('search').oninput = event => { state.query = event.target.value.toLowerCase(); renderResults(); };
  $('grade').onchange = event => { state.grade = event.target.value; renderResults(); };
  $('sort').onchange = event => { state.sort = event.target.value; renderResults(); };
  $('hideEarned').onchange = renderResults;
  $('spoiler').onchange = event => { state.spoiler = event.target.checked; renderResults(); renderDetail(); };
  $('kindFilters').onclick = event => {
    if (!event.target.matches('[data-kind]')) return;
    state.kind = event.target.dataset.kind;
    renderKinds();
    $('kindFilters').querySelector('.active').focus();
    renderResults();
  };
  $('list').onclick = event => {
    if (adjustProgress(event) || event.target.closest('input, [data-counter]')) return;
    const card = event.target.closest('[data-open]');
    if (card) openTrophy(card.dataset.open);
  };
  $('list').onchange = event => {
    if (!event.target.matches('[data-check]')) return;
    const id = Number(event.target.dataset.check);
    const trophy = state.data.trophies.find(item => item.id === id);
    setEarned(trophy, event.target.checked);
    save();
    ($('list').querySelector(`[data-check="${id}"]`) ?? $('hideEarned')).focus({preventScroll: true});
  };
  $('detail').onclick = adjustProgress;
  $('roadmap').onclick = event => {
    const button = event.target.closest('[data-stage-open]');
    if (!button) return;
    openTrophy(button.dataset.stageOpen);
    location.hash = 'view=checklist';
  };
  $('export').onclick = exportProgress;
  $('import').onclick = () => $('file').click();
  $('file').onchange = event => {
    importProgress(event.target.files[0]);
    event.target.value = '';
  };
  window.onhashchange = renderView;
  renderKinds();
  renderProgress();
  renderDetail();
  renderView();
}

start().catch(error => {
  $('list').innerHTML = '<p class="sub">Could not load the local trophy file.</p>';
  console.error(error);
});
