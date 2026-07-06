import { roleChecklistsForTrade } from '../database/checklists.js';

function taskId(prefix, text) {
  return `${prefix}:${text}`.replace(/\s+/g, '_').slice(0, 180);
}

function taskLabel(text, cls = '', prefix = 'task') {
  const id = taskId(prefix, text);
  return `<label class="task-line ${cls}"><input type="checkbox" data-task-id="${id}"> <span>${text}</span></label>`;
}

function bindBulkButtons(scopeId, checkId, clearId) {
  document.getElementById(checkId)?.addEventListener('click', () => document.querySelectorAll(`#${scopeId} input[type="checkbox"]`).forEach((c) => c.checked = true));
  document.getElementById(clearId)?.addEventListener('click', () => document.querySelectorAll(`#${scopeId} input[type="checkbox"]`).forEach((c) => c.checked = false));
}

export function renderTradeTasks(trades, roles = []) {
  const el = document.getElementById('tradeTasks');
  if (!el) return;
  if (!trades.length) {
    el.innerHTML = '<p class="muted">공종을 선택하면 공종별 안전·품질·시공 체크리스트가 표시됩니다.</p>';
    return;
  }

  const roleSet = new Set(roles);
  const blocks = trades.map((trade) => {
    const data = roleChecklistsForTrade(trade);
    const sections = [];
    if (!roleSet.size || roleSet.has('안전관리자') || roleSet.has('현장소장')) sections.push(section('안전 위험·조치', [...data.risks, ...data.safety].slice(0, 10), 'risk', trade));
    if (!roleSet.size || roleSet.has('공사관리자') || roleSet.has('현장소장')) sections.push(section('시공 확인', data.construction.slice(0, 8), 'construction', trade));
    if (!roleSet.size || roleSet.has('품질관리자')) sections.push(section('품질 확인', data.quality.slice(0, 8), 'quality', trade));
    if (!roleSet.size || roleSet.has('장비담당자') || roleSet.has('안전관리자')) sections.push(section('장비·자재·PPE', data.equipment.slice(0, 6), 'equipment', trade));
    sections.push(section('공통 체크', data.common.slice(0, 6), 'common', trade));
    return `<article class="trade-task-card"><h4>${trade}</h4>${sections.join('')}</article>`;
  });
  el.innerHTML = blocks.join('');
  bindBulkButtons('tradeTasks', 'checkAllTradeTasks', 'clearTradeTasks');
}

function section(title, items, type, trade) {
  if (!items?.length) return '';
  return `<div class="task-section ${type}"><h5>${title}</h5>${items.map((t) => taskLabel(t, type, `${trade}:${type}`)).join('')}</div>`;
}

export function renderRoleTasks(tasks) {
  const el = document.getElementById('roleTasks');
  if (!el) return;
  el.innerHTML = `<div class="task-card"><h4>역할별 오늘 할 일 (${tasks.length})</h4>${tasks.map((t) => taskLabel(t, 'role-task', 'role')).join('')}</div>`;
  bindBulkButtons('roleTasks', 'checkAllRoleTasks', 'clearRoleTasks');
}
