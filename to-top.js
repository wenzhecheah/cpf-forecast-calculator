// Back to top, as in the BTO Planner: a button in the bottom right corner, shown
// once the page is scrolled. It scrolls up smoothly, and stops as soon as the
// user scrolls (wheel, touch, keys or the scrollbar).
(function backToTop() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'to-top';
  button.setAttribute('aria-label', 'Back to top');
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.append(button);

  const update = () => button.classList.toggle('show', window.scrollY > 400);
  window.addEventListener('scroll', update, { passive: true });
  update();

  let frame = null;
  const stop = () => { cancelAnimationFrame(frame); frame = null; };
  for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown']) {
    window.addEventListener(type, e => { if (frame && e.target !== button) stop(); }, { passive: true });
  }
  button.addEventListener('click', () => {
    stop();
    const start = window.scrollY;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { window.scrollTo(0, 0); return; }
    const duration = Math.min(900, 300 + start / 8); // longer pages take a little longer
    const t0 = performance.now();
    const ease = t => 1 - (1 - t) ** 3;
    const step = now => {
      const t = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, start * (1 - ease(t)));
      frame = t < 1 ? requestAnimationFrame(step) : null;
    };
    frame = requestAnimationFrame(step);
  });
})();
