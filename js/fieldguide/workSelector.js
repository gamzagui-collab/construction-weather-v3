import { TRADE_GROUPS, FAVORITE_TRADES } from '../database/trades.js';

export function initWorkSelector(onChange) {
  const acc = document.getElementById('tradeAccordion');
  const search = document.getElementById('tradeSearch');
  if (!acc) return;
  const selected = new Set(JSON.parse(localStorage.getItem('selectedTrades') || '[]'));
  const openState = new Set(JSON.parse(localStorage.getItem('openTradeGroups') || '[]'));

  function render(filter = '') {
    const q = filter.trim();
    acc.innerHTML = renderFavoriteBlock(q) + renderCategoryBlocks(q);
    bindEvents();
    renderTags();
  }

  function renderFavoriteBlock(q) {
    const items = FAVORITE_TRADES.filter(name => !q || name.includes(q));
    if (!items.length) return '';
    return `<section class="favorite-trades"><h4>자주 찾는 공종</h4><div class="trade-grid">${items.map(renderTradeChip).join('')}</div></section>`;
  }

  function renderCategoryBlocks(q) {
    return TRADE_GROUPS.map(group => {
      const items = group.items.filter(item => !q || `${item.category} ${item.middle} ${item.name} ${item.keywords}`.includes(q));
      if (!items.length) return '';
      const open = q || openState.has(group.category) ? 'open' : '';
      return `<details class="trade-category" data-category="${group.category}" ${open}>
        <summary><b>${group.category}</b><span>${items.length}개</span></summary>
        <div class="category-tools"><button type="button" data-select-cat="${group.category}">분류 전체선택</button><button type="button" data-clear-cat="${group.category}">분류 해제</button></div>
        <div class="trade-grid">${items.map(item => renderTradeChip(item.name)).join('')}</div>
      </details>`;
    }).join('');
  }

  function renderTradeChip(name) {
    return `<label class="chip trade-chip ${selected.has(name) ? 'active' : ''}"><input type="checkbox" ${selected.has(name) ? 'checked' : ''} value="${name}"> ${name}</label>`;
  }

  function bindEvents() {
    acc.querySelectorAll('input[type=checkbox]').forEach(ch => ch.addEventListener('change', () => {
      ch.checked ? selected.add(ch.value) : selected.delete(ch.value);
      save(false);
      render(search?.value || '');
    }));
    acc.querySelectorAll('details.trade-category').forEach(d => d.addEventListener('toggle', () => {
      const cat = d.dataset.category;
      if (d.open) openState.add(cat); else openState.delete(cat);
      localStorage.setItem('openTradeGroups', JSON.stringify([...openState]));
    }));
    acc.querySelectorAll('[data-select-cat]').forEach(btn => btn.addEventListener('click', () => {
      const group = TRADE_GROUPS.find(g => g.category === btn.dataset.selectCat);
      group?.items.forEach(item => selected.add(item.name));
      save(); render(search?.value || '');
    }));
    acc.querySelectorAll('[data-clear-cat]').forEach(btn => btn.addEventListener('click', () => {
      const group = TRADE_GROUPS.find(g => g.category === btn.dataset.clearCat);
      group?.items.forEach(item => selected.delete(item.name));
      save(); render(search?.value || '');
    }));
  }

  function renderTags() {
    const el = document.getElementById('selectedTrades');
    if (!el) return;
    el.innerHTML = [...selected].map(t => `<span class="tag">${t}<button type="button" data-trade="${t}">×</button></span>`).join('');
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { selected.delete(b.dataset.trade); save(); render(search?.value || ''); }));
  }

  function save(notify = true) {
    localStorage.setItem('selectedTrades', JSON.stringify([...selected]));
    renderTags();
    if (notify) onChange?.([...selected]); else onChange?.([...selected]);
  }

  search?.addEventListener('input', () => render(search.value.trim()));
  render();
  return { getSelected: () => [...selected] };
}
