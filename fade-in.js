// Entrance: when the page opens, its parts fade in one by one, top to bottom:
// the header text, then each section, panel or card. Big blocks (forms, results,
// form columns, the homepage cards, the data sections) fade in part by part.
// Added by script only, so if this doesn't run the page simply shows as normal.
(function fadeIn() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const split = 'form, main > section, .form-cols, .form-col, .tools, #sections';
  const parts = el => el.matches(split) && el.children.length ? [...el.children].flatMap(parts) : [el];
  const items = [...document.querySelectorAll('.masthead-inner > *, .site-nav-bar'),
    ...[...(document.querySelector('main')?.children ?? [])].flatMap(parts)];
  let i = 0;
  for (const el of items) {
    if (!el.getClientRects().length) continue; // hidden or empty: nothing to show
    el.style.setProperty('--fade-delay', `${Math.min(i++, 14) * 70}ms`); // at most ~1s for the last
    el.classList.add('fade-in');
    // Afterwards, drop the animation so hover effects (e.g. cards lifting) work again.
    el.addEventListener('animationend', () => el.classList.remove('fade-in'), { once: true });
  }
})();
