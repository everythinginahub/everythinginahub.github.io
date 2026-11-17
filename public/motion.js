// Small, event-driven tap feedback. Visual entrances and state changes are CSS-driven;
// nothing in this module observes the viewport or reacts to scrolling.
const interactiveTargets = 'button:not(:disabled), a[href], [role="button"]:not([aria-disabled="true"])';

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

    // Use the individual scale property so this feedback composes with hover and
    // entrance transforms on cards, dock links, and buttons.
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

if (typeof window !== 'undefined' && typeof document !== 'undefined') initInteractionMotion();
