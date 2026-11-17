// Click feedback is event-driven; scroll reveals below are isolated to a small
// set of supporting sections so the rest of the workspace still moves on render.
const interactiveTargets = 'button:not(:disabled), a[href], [role="button"]:not([aria-disabled="true"])';
const revealTargets = [
  '.landing-feature-head', '.landing-feature-grid article', '.overview-guides .seo-link-card',
  '.home-daily-challenge', '.home-featured', '.home-quick-access', '.home-directory-group',
  '.os-widget-grid > .os-widget', '.app-discovery-footer', '.app-discovery-link',
  '.dashboard-action', '.stat', '.streak-panel', '.dashboard-grid > section',
  '.subject-card', '.topic-row', '.deck-card', '.set-mode', '.set-preview-card',
  '.game-intro-grid > div', '.game-set-card', '.game-mode-card', '.video-card',
  '.video-discovery', '.watch-tip', '.watch-practice', '.practice-question',
  '.practice-review', '.reward-task', '.reward-card', '.task', '.resource-card',
  '.live-modes article', '.live-panel'
].join(',');

export function initInteractionMotion(doc = document, win = window) {
  if (!doc?.addEventListener || !win?.matchMedia) return () => {};
  const preference = win.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  const cancelAnimations = () => {
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
  const onClick = event => {
    if (preference.matches) return;
    const origin = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const target = origin?.closest(interactiveTargets);
    if (!target || !target.isConnected || target.disabled || target.getAttribute('aria-disabled') === 'true' ||
        typeof target.animate !== 'function') return;

    // The individual scale property composes with hover and 3D transforms.
    const animation = target.animate(
      [{ scale: '1' }, { scale: '.94', offset: .32 }, { scale: '1.04', offset: .68 }, { scale: '1' }],
      { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
    animations.add(animation);
    animation.onfinish = animation.oncancel = () => animations.delete(animation);
  };
  const onPreferenceChange = () => {
    if (preference.matches) cancelAnimations();
  };

  doc.addEventListener('click', onClick, true);
  if (preference.addEventListener) preference.addEventListener('change', onPreferenceChange);
  else preference.addListener?.(onPreferenceChange);

  return () => {
    doc.removeEventListener('click', onClick, true);
    if (preference.removeEventListener) preference.removeEventListener('change', onPreferenceChange);
    else preference.removeListener?.(onPreferenceChange);
    cancelAnimations();
  };
}

export function initScrollReveals(doc = document, win = window) {
  if (!doc?.body || !win?.IntersectionObserver || !win?.MutationObserver || !win?.matchMedia) return () => {};
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
      // Only offscreen, visible content is observed; existing text and focus are
      // never hidden while waiting for an intersection callback.
      if (observed.has(element) || element.hidden || !element.getClientRects().length ||
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
        intersection.unobserve(element);
        observed.delete(element);
        if (!element.isConnected || element.contains(doc.activeElement) || typeof element.animate !== 'function') continue;
        const animation = element.animate(
          [
            { opacity: .08, transform: 'translateY(42px) scale(.93) rotateX(4deg)' },
            { opacity: 1, transform: 'translateY(0) scale(1) rotateX(0)' }
          ],
          { duration: 760, easing: 'cubic-bezier(.16,1,.3,1)' }
        );
        animations.add(animation);
        animation.onfinish = animation.oncancel = () => animations.delete(animation);
      }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    register(doc.body);
  };
  const mutations = new win.MutationObserver(records => {
    if (!intersection) return;
    for (const element of observed) {
      if (!element.isConnected) {
        intersection.unobserve(element);
        observed.delete(element);
      }
    }
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

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initInteractionMotion();
  initScrollReveals();
}
