// Progressive enhancement: content remains visible if motion is unsupported.
const revealTargets = [
  '.landing-feature-head', '.landing-feature-grid article',
  '.dashboard-action', '.stat', '.streak-panel', '.dashboard-grid > section',
  '.subject-card', '.topic-row', '.deck-card', '.set-mode', '.set-preview-card',
  '.game-intro-grid > div', '.game-set-card', '.game-mode-card',
  '.video-card', '.video-discovery', '.watch-tip', '.watch-practice',
  '.practice-question', '.practice-review', '.reward-task', '.reward-card',
  '.task', '.resource-card'
].join(',');

export function initScrollReveals(doc = document, win = window) {
  if (!win.IntersectionObserver || !win.MutationObserver || !win.matchMedia) return () => {};
  const preference = win.matchMedia('(prefers-reduced-motion: reduce)');
  const observed = new Set();
  const animations = new Set();
  let intersection;
  const stop = () => {
    intersection?.disconnect();
    intersection = undefined;
    observed.clear();
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
  const register = root => {
    if (!intersection || !root || root.nodeType !== 1) return;
    const targets = root.matches(revealTargets) ? [root] : [];
    targets.push(...root.querySelectorAll(revealTargets));
    for (const element of targets) {
      // Animate only content below the viewport. Visible, hidden and focused
      // content must never wait for an observer before it can be used.
      if (observed.has(element) || !element.getClientRects().length ||
          element.getBoundingClientRect().top < win.innerHeight - 24) continue;
      observed.add(element);
      intersection.observe(element);
    }
  };
  const start = () => {
    stop();
    if (preference.matches) return;
    intersection = new win.IntersectionObserver(entries => {
      if (preference.matches || !intersection) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target;
        intersection?.unobserve(element);
        observed.delete(element);
        if (!element.isConnected || element.contains(doc.activeElement) || typeof element.animate !== 'function') continue;
        const animation = element.animate(
          [{ opacity: 0.48, transform: 'translateY(32px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' }
        );
        animations.add(animation);
        animation.onfinish = animation.oncancel = () => animations.delete(animation);
      }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    register(doc.body);
  };
  const mutations = new win.MutationObserver(records => {
    if (!intersection) return;
    for (const element of observed) if (!element.isConnected) { intersection.unobserve(element); observed.delete(element); }
    for (const record of records) {
      if (record.type === 'attributes' && !record.target.hidden) register(record.target);
      for (const node of record.addedNodes) register(node);
    }
  });
  mutations.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  if (preference.addEventListener) preference.addEventListener('change', start);
  else preference.addListener?.(start);
  start();
  return () => {
    mutations.disconnect();
    if (preference.removeEventListener) preference.removeEventListener('change', start);
    else preference.removeListener?.(start);
    stop();
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') initScrollReveals();
