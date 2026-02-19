// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
  // Sticky header scroll effect
  const header = document.querySelector('.sticky-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // Project filtering
  const filterButtons = document.querySelectorAll('.fbtn');
  const cards = document.querySelectorAll('.projects .card');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      cards.forEach(card => {
        const tags = card.dataset.tags || '';
        if (filter === 'all' || tags.includes(filter)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // PST Timestamp - Update every second
  function updatePSTTime() {
    const now = new Date();
    const pstTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);

    const pstElement = document.getElementById('pst-time');
    if (pstElement) {
      pstElement.textContent = `${pstTime} PST`;
    }
  }

  // Update immediately and then every second
  updatePSTTime();
  setInterval(updatePSTTime, 1000);

  // Tech stack tooltip
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) {
    console.error('Tooltip element not found!');
    return;
  }

  const techItems = document.querySelectorAll('.tech-item');
  console.log('Found', techItems.length, 'tech items');

  if (techItems.length === 0) {
    console.error('No tech items found!');
    return;
  }

  let hideTimeout;
  let isPinned = false;
  let currentPinnedElement = null;

  techItems.forEach(el => {
    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', show);
    el.addEventListener('blur', hide);
    el.addEventListener('click', togglePin);
    // Keyboard support for pinning tooltips
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        togglePin({ currentTarget: el, stopPropagation: () => { } });
      }
    });
  });

  // Click anywhere else to unpin
  document.addEventListener('click', (e) => {
    if (isPinned && !e.target.closest('.tech-item') && !e.target.closest('.tooltip')) {
      unpin();
    }
  });

  function show(e) {
    // Don't show hover tooltip if another one is pinned
    if (isPinned && e.currentTarget !== currentPinnedElement) {
      return;
    }

    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    const text = e.currentTarget.dataset.tooltip;
    if (!text) {
      console.warn('No tooltip text for element');
      return;
    }

    console.log('Showing tooltip:', text);
    tooltip.textContent = text;
    const r = e.currentTarget.getBoundingClientRect();
    tooltip.style.left = (r.left + r.width / 2) + 'px';
    tooltip.style.top = r.top + 'px';
    tooltip.style.opacity = '1';
    tooltip.style.display = 'block';
    console.log('Tooltip position:', tooltip.style.left, tooltip.style.top);
  }

  function hide(e) {
    // Don't hide if pinned
    if (isPinned) {
      return;
    }

    console.log('Hiding tooltip');
    // Add a small delay before hiding to prevent flickering
    hideTimeout = setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        tooltip.style.display = 'none';
      }, 150);
    }, 50);
  }

  function togglePin(e) {
    e.stopPropagation();

    if (isPinned && currentPinnedElement === e.currentTarget) {
      // Clicking the same element unpins it
      unpin();
    } else {
      // Pin this tooltip
      unpin(); // Unpin any existing
      isPinned = true;
      currentPinnedElement = e.currentTarget;
      currentPinnedElement.classList.add('pinned');
      tooltip.classList.add('pinned');
      show(e);
    }
  }

  function unpin() {
    if (isPinned) {
      isPinned = false;
      if (currentPinnedElement) {
        currentPinnedElement.classList.remove('pinned');
      }
      currentPinnedElement = null;
      tooltip.classList.remove('pinned');
      tooltip.style.opacity = '0';
      setTimeout(() => {
        tooltip.style.display = 'none';
      }, 150);
    }
  }

  // Safe button click animation (won't throw if button doesn't exist)
  const primaryBtn = document.querySelector('.btn.primary');
  if (primaryBtn) {
    primaryBtn.addEventListener('click', function () {
      this.classList.add('clicked');
      setTimeout(() => this.classList.remove('clicked'), 800);
    });
  }
});



// Certifications Carousel
let certsIndex = 0;
let trainingIndex = 0;

function getVisibleCards() {
  if (window.innerWidth <= 768) return 1;
  if (window.innerWidth <= 1200) return 2;
  return 3;
}

function updateCarouselWithFade(section, index, instant = false) {
  const grid = document.querySelector(`#${section}-carousel .certs-grid`);
  if (!grid) return;

  const cards = Array.from(grid.children);
  const visibleCards = getVisibleCards();

  // For certifications carousel only (not training which uses infinite scroll)
  if (section === 'certs') {
    if (instant) {
      // Instant transition for manual navigation
      cards.forEach(card => {
        card.style.display = 'none';
        card.classList.remove('fade-out', 'fade-in');
      });

      for (let i = index; i < index + visibleCards && i < cards.length; i++) {
        cards[i].style.display = 'block';
        cards[i].classList.add('fade-in');
      }
    } else {
      // Smooth premium transition for auto-play
      cards.forEach(card => {
        if (card.style.display === 'block') {
          card.classList.add('fade-out');
        }
      });

      // Wait for fade out (slide left), then switch cards
      setTimeout(() => {
        cards.forEach(card => {
          card.style.display = 'none';
          card.classList.remove('fade-out', 'fade-in');
        });

        // Show new set of cards sliding in from right
        for (let i = index; i < index + visibleCards && i < cards.length; i++) {
          cards[i].style.display = 'block';
          setTimeout(() => {
            cards[i].classList.add('fade-in');
          }, 50);
        }
      }, 1200);
    }
  }
}

function nextCerts() {
  const totalCards = document.querySelectorAll('#certs-carousel .cert-card').length;
  const visibleCards = getVisibleCards();
  const maxIndex = Math.ceil(totalCards / visibleCards) - 1;

  if (certsIndex < maxIndex) {
    certsIndex++;
  } else {
    certsIndex = 0;
  }
  updateCarouselWithFade('certs', certsIndex * visibleCards, true);
}

function prevCerts() {
  const totalCards = document.querySelectorAll('#certs-carousel .cert-card').length;
  const visibleCards = getVisibleCards();
  const maxIndex = Math.ceil(totalCards / visibleCards) - 1;

  if (certsIndex > 0) {
    certsIndex--;
  } else {
    certsIndex = maxIndex;
  }
  updateCarouselWithFade('certs', certsIndex * visibleCards, true);
}



// Show More functionality for descriptions
function initShowMore() {
  const descriptions = document.querySelectorAll('.cert-description');

  descriptions.forEach((desc) => {
    // Skip if already has a button
    if (desc.nextElementSibling && desc.nextElementSibling.classList.contains('show-more-btn')) {
      return;
    }

    // Check if content exceeds 2 lines
    const lineHeight = parseFloat(getComputedStyle(desc).lineHeight);
    const maxHeight = lineHeight * 2;

    if (desc.scrollHeight > maxHeight + 2) {
      // Create show more button
      const btn = document.createElement('button');
      btn.className = 'show-more-btn';
      btn.textContent = 'Show more';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        desc.classList.toggle('expanded');
        btn.classList.toggle('expanded');
        btn.textContent = desc.classList.contains('expanded') ? 'Show less' : 'Show more';
      });

      // Insert button after description
      desc.parentNode.insertBefore(btn, desc.nextSibling);
    }
  });
}

// Helper function to initialize show more for a specific container
function initShowMoreForContainer(container) {
  const descriptions = container.querySelectorAll('.cert-description');

  descriptions.forEach((desc) => {
    // Skip if already has a button
    if (desc.nextElementSibling && desc.nextElementSibling.classList.contains('show-more-btn')) {
      return;
    }

    // Check if content exceeds 2 lines
    const lineHeight = parseFloat(getComputedStyle(desc).lineHeight);
    const maxHeight = lineHeight * 2;

    if (desc.scrollHeight > maxHeight + 2) {
      // Create show more button
      const btn = document.createElement('button');
      btn.className = 'show-more-btn';
      btn.textContent = 'Show more';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        desc.classList.toggle('expanded');
        btn.classList.toggle('expanded');
        btn.textContent = desc.classList.contains('expanded') ? 'Show less' : 'Show more';
      });

      // Insert button after description
      desc.parentNode.insertBefore(btn, desc.nextSibling);
    }
  });
}

// Initialize infinite carousel for training
let infiniteCarouselPaused = false;
let infiniteCarouselTimeout = null;

function initInfiniteCarousel() {
  const trainingGrid = document.querySelector('#training-carousel .certs-grid');
  if (!trainingGrid) return;

  // Clone all cards and append them for seamless loop
  const cards = Array.from(trainingGrid.children);
  cards.forEach(card => {
    const clone = card.cloneNode(true);
    trainingGrid.appendChild(clone);
  });

  // Re-initialize show more buttons for cloned cards
  initShowMoreForContainer(trainingGrid);

  // Handle hover pause/resume
  const trainingCarousel = document.querySelector('#training-carousel');
  if (trainingCarousel) {
    trainingCarousel.addEventListener('mouseenter', () => {
      trainingGrid.style.animationPlayState = 'paused';
      clearTimeout(infiniteCarouselTimeout);
    });

    trainingCarousel.addEventListener('mouseleave', () => {
      if (!infiniteCarouselPaused) {
        trainingGrid.style.animationPlayState = 'running';
      }
    });
  }
}

function pauseInfiniteCarousel() {
  const trainingGrid = document.querySelector('#training-carousel .certs-grid');
  if (!trainingGrid) return;

  infiniteCarouselPaused = true;
  trainingGrid.style.animationPlayState = 'paused';

  // Clear any existing timeout
  clearTimeout(infiniteCarouselTimeout);

  // Resume after 5 seconds if not hovering
  infiniteCarouselTimeout = setTimeout(() => {
    const trainingCarousel = document.querySelector('#training-carousel');
    const isHovering = trainingCarousel && trainingCarousel.matches(':hover');

    if (!isHovering) {
      infiniteCarouselPaused = false;
      trainingGrid.style.animationPlayState = 'running';
    }
  }, 5000);
}

function scrollInfiniteCarousel(direction) {
  const trainingGrid = document.querySelector('#training-carousel .certs-grid');
  if (!trainingGrid) return;

  // Pause the animation
  pauseInfiniteCarousel();

  // Get current transform value
  const style = window.getComputedStyle(trainingGrid);
  const matrix = new DOMMatrix(style.transform);
  const currentX = matrix.m41;

  // Calculate scroll amount (one card width + gap)
  const cardWidth = 380; // approximate card width
  const scrollAmount = direction === 'next' ? -cardWidth : cardWidth;

  // Apply instant transform
  trainingGrid.style.transform = `translateX(${currentX + scrollAmount}px)`;

  // Reset animation after a brief moment
  setTimeout(() => {
    trainingGrid.style.transform = '';
  }, 100);
}

// Update navigation functions for training
function nextTraining(autoPlay = false) {
  if (!autoPlay) {
    scrollInfiniteCarousel('next');
  }
}

function prevTraining() {
  scrollInfiniteCarousel('prev');
}

// Initialize carousels immediately when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCarousels);
} else {
  initializeCarousels();
}

function initializeCarousels() {
  updateCarouselWithFade('certs', 0, true);
  initInfiniteCarousel();
  initShowMore();
}

// Reset on resize - no fade effect, just instant update
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    certsIndex = 0;
    const visibleCards = getVisibleCards();
    const certsGrid = document.querySelector('#certs-carousel .certs-grid');
    if (certsGrid) {
      const cards = Array.from(certsGrid.children);
      cards.forEach((card, i) => {
        card.classList.remove('fade-out', 'fade-in');
        card.style.display = i < visibleCards ? 'block' : 'none';
      });
    }
  }, 150);
});
