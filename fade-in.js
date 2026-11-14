// Entrance: when the page opens, its parts fade in one by one, top to bottom:
// the header text, then each section, panel or card. Big blocks (forms, results,
// form columns, the homepage cards, the data sections) fade in part by part.
// The page is kept hidden until this runs (the "fade-pending" class set in the
// page's head), so it doesn't flash before fading in. If the page was loaded in
// the background ahead of a click (prerendered), the entrance waits for the click.
(function fadeIn() {
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.remove('fade-pending'); return; }
  const split = 'form, main > section, .form-cols, .form-col, .tools, #sections';
  const parts = el => el.matches(split) && el.children.length ? [...el.children].flatMap(parts) : [el];
  const items = [...document.querySelectorAll('.masthead-inner > *, .site-nav-bar'),
    ...[...(document.querySelector('main')?.children ?? [])].flatMap(parts)];
  if (document.prerendering) {
    root.classList.add('fade-paused');
    document.addEventListener('prerenderingchange', () => root.classList.remove('fade-paused'), { once: true });
  }
  let i = 0;
  for (const el of items) {
    if (!el.getClientRects().length) continue; // hidden or empty: nothing to show
    el.style.setProperty('--fade-delay', `${Math.min(i++, 14) * 70}ms`); // at most ~1s for the last
    el.classList.add('fade-in');
    // Afterwards, drop the animation so hover effects (e.g. cards lifting) work again.
    el.addEventListener('animationend', () => el.classList.remove('fade-in'), { once: true });
  }
  root.classList.remove('fade-pending');
})();
