/**
 * Hero intro sequence for dev-test:
 * 1) Typewriter/fade for "Deploying" + "Dreams"
 * 2) Centered blast for "Into" + "AI Solutions"
 * 3) Fade out overlay, then reveal hero content at its native layout positions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname || '';
  const isDevTestPage = /\/dev-test(?:\.html)?$/i.test(path) || path.includes('/dev-test.html');

  if (!isDevTestPage) {
    const heroTexts = document.querySelectorAll('.hero-text');
    const primaryButtons = document.querySelectorAll('.btn.primary');

    setTimeout(() => {
      heroTexts.forEach((text) => {
        text.classList.add('visible');
      });

      primaryButtons.forEach((btn) => btn.classList.add('visible'));
      document.body.classList.add('after-hero-ready');
    }, 100);

    return;
  }

  const heroTexts = Array.from(document.querySelectorAll('#top .hero-text'));
  const heroButtons = Array.from(document.querySelectorAll('#top .btn.primary'));
  const heading = document.querySelector('#top h1.hero-text');
  const paragraph = document.querySelector('#top p.hero-text');
  const actions = document.querySelector('#top .hero-text.mt-7');
  const media = document.querySelector('#top .hero-text.w-full');

  if (!heading || heroTexts.length === 0) return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const TYPE_SPEED_DEPLOYING = 42;
  const TYPE_SPEED_DREAMS = 44;
  const TYPE_SPEED_SUBTEXT = 7;
  const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#%&*+-';

  const revealButtons = () => {
    heroButtons.forEach((btn) => btn.classList.add('visible'));
  };

  const revealAfterHero = () => {
    document.body.classList.add('after-hero-ready');
  };

  const revealInstant = () => {
    heroTexts.forEach((el) => el.classList.add('visible'));
    revealButtons();
    revealAfterHero();
  };

  const typeText = (el, text, speed = 30) =>
    new Promise((resolve) => {
      let index = 0;
      el.textContent = '';
      el.style.opacity = '1';

      const step = () => {
        index += 1;
        el.textContent = text.slice(0, index);
        if (index < text.length) {
          setTimeout(step, speed);
        } else {
          resolve();
        }
      };

      step();
    });

  const matrixReveal = (el, finalHtml, finalText, duration = 860, stepMs = 42) =>
    new Promise((resolve) => {
      const text = finalText.replace(/\s+/g, ' ').trim();

      if (!text) {
        el.innerHTML = finalHtml;
        resolve();
        return;
      }

      const chars = Array.from(text);
      const totalFrames = Math.max(12, Math.round(duration / stepMs));
      let frame = 0;
      el.classList.add('intro-matrix');

      const tick = () => {
        frame += 1;
        const progress = frame / totalFrames;
        const revealCount = Math.floor(progress * chars.length);

        const output = chars
          .map((char, idx) => {
            if (char === ' ') return ' ';
            if (idx < revealCount) return char;
            return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          })
          .join('');

        el.textContent = output;

        if (frame < totalFrames) {
          setTimeout(tick, stepMs);
          return;
        }

        el.classList.remove('intro-matrix');
        el.innerHTML = finalHtml;
        resolve();
      };

      tick();
    });

  const typeParagraph = async () => {
    if (!paragraph) return;

    const lines = Array.from(paragraph.querySelectorAll('span'));
    paragraph.classList.add('visible');

    if (lines.length === 0) {
      const fullText = paragraph.dataset.fullText || paragraph.textContent || '';
      paragraph.dataset.fullText = fullText;
      paragraph.textContent = '';
      await typeText(paragraph, fullText, TYPE_SPEED_SUBTEXT);
      return;
    }

    lines.forEach((line) => {
      if (!line.dataset.fullText) {
        line.dataset.fullText = line.textContent || '';
      }
      line.textContent = '';
    });

    await wait(40);
    for (let i = 0; i < lines.length; i += 1) {
      await typeText(lines[i], lines[i].dataset.fullText || '', TYPE_SPEED_SUBTEXT);
      if (i < lines.length - 1) {
        await wait(30);
      }
    }
  };

  const revealNative = async () => {
    const revealTargets = [heading, paragraph, actions, media].filter(Boolean);
    revealTargets.forEach((el) => el.classList.remove('visible'));
    heroButtons.forEach((btn) => btn.classList.remove('visible'));

    if (heading) {
      await wait(40);
      heading.classList.add('visible');
    }

    if (media) {
      await wait(230);
      media.classList.add('visible');
    }

    await wait(170);
    revealAfterHero();
    await typeParagraph();

    await wait(150);
    if (actions) {
      actions.classList.add('visible');
    }
    revealButtons();
  };

  if (prefersReducedMotion) {
    revealInstant();
    return;
  }

  (async () => {
    let overlay = null;
    const cleanupOverlay = () => {
      if (overlay && overlay.isConnected) {
        overlay.remove();
      }
    };

    const safetyTimer = window.setTimeout(() => {
      cleanupOverlay();
      revealInstant();
    }, 7600);

    try {
      heroTexts.forEach((el) => el.classList.remove('visible'));

      overlay = document.createElement('div');
      overlay.className = 'hero-intro-overlay';

      const introHeading = heading.cloneNode(true);
      introHeading.classList.remove('hero-text');
      introHeading.classList.add('hero-intro-heading');
      overlay.appendChild(introHeading);
      document.body.appendChild(overlay);

      const lines = Array.from(introHeading.children).filter((el) => el.tagName === 'SPAN');
      const lineDeploying = lines[0];
      const lineDreams = lines[1];
      const lineInto = lines[2];
      const lineAi = lines[3];

      if (!lineDeploying || !lineDreams || !lineInto || !lineAi) {
        cleanupOverlay();
        revealInstant();
        clearTimeout(safetyTimer);
        return;
      }

      const deployingText = lineDeploying.textContent.trim();
      const dreamsText = lineDreams.textContent.trim();
      const aiFinalHtml = lineAi.innerHTML;
      const aiFinalText = lineAi.textContent || '';

      lineDeploying.classList.add('intro-type');
      lineDreams.classList.add('intro-type');
      lineInto.classList.add('intro-hidden');
      lineAi.classList.add('intro-hidden');

      await wait(220);
      await typeText(lineDeploying, deployingText, TYPE_SPEED_DEPLOYING);
      await wait(180);
      await typeText(lineDreams, dreamsText, TYPE_SPEED_DREAMS);
      await wait(220);

      lineInto.classList.remove('intro-hidden');
      lineInto.classList.add('intro-blast');
      await wait(240);

      lineAi.classList.remove('intro-hidden');
      await matrixReveal(lineAi, aiFinalHtml, aiFinalText, 840, 38);

      await wait(220);

      overlay.classList.add('is-exit');
      await wait(460);
      cleanupOverlay();

      await revealNative();
      clearTimeout(safetyTimer);
    } catch (error) {
      cleanupOverlay();
      revealInstant();
    }
  })();
});
