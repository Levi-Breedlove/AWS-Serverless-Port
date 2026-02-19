/**
 * Scroll reveal motion (Framer Motion-style) for static HTML.
 * Uses IntersectionObserver + CSS variables.
 *
 * Opt-in via `.motion` (this file auto-applies to key sections).
 */

(function () {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elements = [];

  function setVars(el, vars) {
    Object.entries(vars).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      el.style.setProperty(key, value);
    });
  }

  function apply(selector, opts = {}) {
    const nodes = Array.from(document.querySelectorAll(selector));
    nodes.forEach((el, index) => {
      if (el.classList.contains('motion')) return;
      el.classList.add('motion');
      if (opts.motion) el.dataset.motion = opts.motion;
      if (opts.once === false) el.dataset.motionOnce = 'false';
      if (opts.duration) setVars(el, { '--motion-duration': `${opts.duration}ms` });

      const baseDelay = opts.delay ?? 0;
      const stagger = opts.stagger ?? 0;
      const computedDelay = baseDelay + index * stagger;
      if (computedDelay) setVars(el, { '--motion-delay': `${computedDelay}ms` });

      if (opts.y) setVars(el, { '--motion-y': `${opts.y}px` });
      if (opts.x) setVars(el, { '--motion-x': `${opts.x}px` });

      elements.push(el);
    });
  }

  // Headings + subtitles
  apply('.section > h2', { motion: 'fade-up', y: 22, duration: 750 });
  apply('.section > p.sub', { motion: 'fade-up', y: 18, delay: 80, duration: 750 });

  // Projects section
  apply('#projects .filterbar', { motion: 'fade-up', y: 16, delay: 140, duration: 700 });
  apply('#projects .projects .card', { motion: 'fade-up', y: 22, delay: 120, stagger: 70, duration: 750 });

  // Certifications/training: animate containers (avoid `.cert-card` because many are `display:none` in carousel)
  apply('#certifications .section-header', { motion: 'fade-up', y: 18, stagger: 80, duration: 750 });
  apply('#certifications .carousel-container', { motion: 'fade-up', y: 22, stagger: 120, duration: 800 });

  // Tech stack
  apply('#stack .table-container', { motion: 'fade-up', y: 22, duration: 800 });

  // Experience timeline
  apply('#experience .timeline .step', { motion: 'fade-up', y: 22, stagger: 80, duration: 750 });

  // Contact: split reveal left/right
  apply('#contact .form', { motion: 'slide-left', delay: 80, duration: 800 });
  apply('#contact .info', { motion: 'slide-right', delay: 140, duration: 850 });

  // Footer
  apply('footer', { motion: 'fade', delay: 80, duration: 650 });
  const footerEls = Array.from(document.querySelectorAll('footer.motion'));
  const footerSyncSelector = '#contact .form, #contact .info';

  function start() {
    // If reduced motion, force visible and stop.
    if (prefersReduced) {
      elements.forEach((el) => el.classList.add('is-inview'));
      return;
    }

    // Fallback if IntersectionObserver unavailable.
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-inview'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const once = el.dataset.motionOnce !== 'false';

        if (entry.isIntersecting) {
          el.classList.add('is-inview');
          // Sync footer reveal with contact reveal so it feels continuous.
          if (footerEls.length && el.matches && el.matches(footerSyncSelector)) {
            footerEls.forEach((footerEl) => {
              footerEl.classList.add('is-inview');
              if (footerEl.dataset.motionOnce !== 'false') observer.unobserve(footerEl);
            });
          }
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove('is-inview');
        }
      });
    }, {
      threshold: 0.14,
      rootMargin: '0px 0px -12% 0px'
    });

    elements.forEach((el) => observer.observe(el));

    // Prime above-the-fold so there’s no "blank until IO" delay.
    function prime() {
      const viewH = window.innerHeight || document.documentElement.clientHeight || 0;
      const cutoff = viewH * 0.92;
      elements.forEach((el) => {
        if (el.classList.contains('is-inview')) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < cutoff && rect.bottom > 0) {
          el.classList.add('is-inview');
        }
      });

      if (
        footerEls.length &&
        elements.some(
          (el) => el.classList.contains('is-inview') && el.matches && el.matches(footerSyncSelector)
        )
      ) {
        footerEls.forEach((footerEl) => footerEl.classList.add('is-inview'));
      }
    }

    prime();
    window.addEventListener('resize', prime, { passive: true });
  }

  // Start after DOMContentLoaded so it aligns with page-load-warp's fade-in.
  const scheduleStart = () => requestAnimationFrame(start);
  if (document.readyState === 'complete') {
    scheduleStart();
  } else {
    document.addEventListener('DOMContentLoaded', scheduleStart, { once: true });
  }
})();
