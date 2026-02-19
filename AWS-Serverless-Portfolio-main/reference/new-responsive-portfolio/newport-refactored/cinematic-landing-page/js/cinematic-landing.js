/**
 * CinematicLanding - Alpine.js controller for cinematic landing page
 * Orchestrates animation timeline and coordinates with canvas engine
 */

import { createCineCanvas } from './cine-canvas.js';

/**
 * Alpine.js component factory function
 * @returns {Object} Alpine component object
 */
export function CinematicLanding() {
  return {
    // Configuration
    nextUrl: '../index.html#projects',
    
    // State
    cx: null,
    debugMode: false,
    
    /**
     * Debug logging helper
     * Logs messages with '[cine]' prefix when debug mode is enabled
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments to log
     */
    log(message, ...args) {
      if (this.debugMode) {
        console.log(`[cine] ${message}`, ...args);
      }
    },
    
    /**
     * Lock scene for debugging
     * Sets up specific scene with appropriate canvas state and DOM visibility
     * @param {string} scene - Scene name to lock to
     */
    lockScene(scene) {
      // First, set initial hidden state for all scenes
      // Stats uses is-hidden, hero elements use visible class
      this.setHidden('#stats', true);
      
      const sceneMap = {
        'intro': () => {
          this.log('Locking to intro scene');
          this.cx.setScene('intro');
          // H1 visible (blur-to-clear), others hidden
          this.setVisible('#heroTitle', true);
        },
        'grow': () => {
          this.log('Locking to grow scene');
          this.cx.setScene('grow');
          // H1 visible (blur-to-clear), others hidden
          this.setVisible('#heroTitle', true);
        },
        'subtitle': () => {
          this.log('Locking to subtitle scene (grow + subtitle visible)');
          this.cx.setScene('grow');
          this.setVisible('#heroTitle', true);
          this.setVisible('#heroSubtitle', true);
        },
        'settle': () => {
          this.log('Locking to settle scene');
          this.cx.setScene('settle');
          this.setVisible('#heroTitle', true);
          this.setVisible('#heroSubtitle', true);
        },
        'burst': () => {
          this.log('Locking to burst scene');
          this.cx.setScene('burst');
          this.setVisible('#heroTitle', true);
          this.setVisible('#heroSubtitle', true);
          this.setVisible('#launchButton', true);
          const btn = document.querySelector('#launchButton');
          if (btn) {
            const btnRect = btn.getBoundingClientRect();
            this.cx.setFocusRect(btnRect);
          }
        },
        'spotlight': () => {
          this.log('Locking to spotlight scene');
          this.cx.setScene('spotlight');
          this.setVisible('#heroTitle', true);
          this.setVisible('#heroSubtitle', true);
          this.setVisible('#launchButton', true);
          const btn = document.querySelector('#launchButton');
          if (btn) {
            const btnRect = btn.getBoundingClientRect();
            this.cx.setFocusRect(btnRect);
          }
        },
        'stats': () => {
          this.log('Locking to stats scene');
          this.cx.setScene('stats');
          this.setVisible('#heroTitle', true);
          this.setVisible('#heroSubtitle', true);
          this.setVisible('#launchButton', true);
          this.setHidden('#stats', false);
          this.cx.twinkle(true);
        },
        'fade': () => {
          this.log('Locking to fade scene');
          this.cx.setScene('fade');
          this.setVisible('#heroTitle', true);
          this.setVisible('#heroSubtitle', true);
          this.setVisible('#launchButton', true);
        },
        'all': () => {
          this.log('Locking to all scene (all elements visible)');
          this.setVisible('#heroTitle', true);
          this.setVisible('#heroSubtitle', true);
          this.setVisible('#launchButton', true);
          this.setHidden('#stats', false);
          this.cx.setScene('idle');
        }
      };
      
      if (sceneMap[scene]) {
        sceneMap[scene]();
      } else {
        console.warn(`[cine] Unknown scene: ${scene}`);
      }
    },
    
    /**
     * Initialize component
     * Creates canvas engine and checks for reduced-motion or skip flags
     */
    init() {
      // Create canvas engine instance
      const canvasEl = document.getElementById('cineCanvas');
      this.cx = createCineCanvas(canvasEl);
      
      // Electric effect will be enabled during intro timeline (after title fades in)
      
      // Add window resize event listener
      this.handleResize = () => {
        if (this.cx && this.cx.resize) {
          this.cx.resize();
        }
      };
      window.addEventListener('resize', this.handleResize);
      
      // Parse URL parameters for scene lock and debug mode
      const urlParams = new URLSearchParams(window.location.search);
      const sceneLock = urlParams.get('scene');
      this.debugMode = urlParams.has('debug');
      
      if (this.debugMode) {
        this.log('Debug mode enabled');
      }
      
      // Check for scene lock first
      if (sceneLock) {
        this.log(`Scene locked to: ${sceneLock}`);
        this.lockScene(sceneLock);
        return;
      }
      
      // Check for reduced-motion or skip flags
      if (this.prefersReduced() || this.hasSkipFlag()) {
        this.log('Rendering static layout (reduced-motion or skip flag)');
        this.renderStatic();
        return;
      }
      
      // Run intro timeline animation
      this.log('Starting intro timeline');
      this.runIntroTimeline();
    },
    
    /**
     * Check if user prefers reduced motion
     * @returns {boolean} True if reduced motion is preferred
     */
    prefersReduced() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    
    /**
     * Check if skip animation flag is set
     * Checks for data-skip-anim attribute on html element or URL param
     * @returns {boolean} True if animation should be skipped
     */
    hasSkipFlag() {
      // Check for data-skip-anim attribute on html element
      const hasDataAttr = document.documentElement.dataset.skipAnim === 'true';
      
      // Check for 'skip' URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const hasUrlParam = urlParams.has('skip');
      
      return hasDataAttr || hasUrlParam;
    },
    
    /**
     * Render static layout for reduced-motion users
     * Shows all elements immediately without animations
     */
    renderStatic() {
      // Show hero title immediately (add visible class)
      const heroTitle = document.getElementById('heroTitle');
      if (heroTitle) {
        heroTitle.classList.add('visible');
      }
      
      // Show hero subtitle immediately (add visible class)
      const heroSubtitle = document.getElementById('heroSubtitle');
      if (heroSubtitle) {
        heroSubtitle.classList.add('visible');
      }
      
      // Show launch button immediately (add visible class)
      const launchButton = document.getElementById('launchButton');
      if (launchButton) {
        launchButton.classList.add('visible');
      }
      
      // Stats remain hidden in static render (only shown during launch sequence)
      
      // Set canvas to idle scene
      if (this.cx) {
        this.cx.setScene('idle');
      }
    },
    
    /**
     * Run the intro timeline sequence
     * Sequence: Black canvas → space theme fades in with title → subtitle → button
     */
    async runIntroTimeline() {
      try {
        // Set initial state
        this.log('T0: Setting initial state');
        this.setHidden('#stats', true);
        
        // T0: Start fading in the space background while title fades in
        this.log('T0: Starting space background fade-in and revealing title slowly');
        this.cx.setScene('intro');
        this.cx.fadeInBackground(3000); // 3 second fade for space theme
        this.setVisible('#heroTitle', true);
        await this.sleep(2000); // Wait for title to be mostly visible
        
        // T2000ms: Scene grows
        this.log('T2000: Setting scene to grow');
        this.cx.setScene('grow');
        await this.sleep(1000);
        
        // T3000ms: Subtitle appears with shooting star
        this.log('T3000: Revealing hero subtitle with shooting star');
        this.cx.shootingStarEffect(); // Trigger shooting star
        this.setVisible('#heroSubtitle', true);
        await this.sleep(800);
        
        // T3800ms: Settle phase
        this.log('T3800: Setting scene to settle');
        this.cx.setScene('settle');
        await this.sleep(300);
        
        // T4100ms: Reveal launchButton
        this.log('T4100: Revealing launch button');
        this.setVisible('#launchButton', true);
        const btn = document.querySelector('#launchButton');
        if (btn) {
          const btnRect = btn.getBoundingClientRect();
          this.cx.setFocusRect(btnRect);
          this.cx.setScene('burst');
          await this.sleep(650);
        } else {
          console.error('[cine] Launch button not found for burst effect');
          await this.sleep(650);
        }
        
        // Final: Return to idle scene
        this.log('T4750: Setting scene to idle (timeline complete)');
        this.cx.setScene('idle');
      } catch (error) {
        console.error('[cine] Timeline error:', error);
        this.renderStatic();
      }
    },
    
    /**
     * Toggle visibility of an element using is-hidden class
     */
    setHidden(selector, hidden) {
      try {
        const el = document.querySelector(selector);
        if (!el) {
          console.error(`[cine] Element not found: ${selector}`);
          return;
        }
        
        if (hidden) {
          el.classList.add('is-hidden');
        } else {
          el.classList.remove('is-hidden');
        }
      } catch (error) {
        console.error(`[cine] Error in setHidden for ${selector}:`, error);
      }
    },
    
    /**
     * Toggle visibility of an element using visible class
     */
    setVisible(selector, visible) {
      try {
        const el = document.querySelector(selector);
        if (!el) {
          console.error(`[cine] Element not found: ${selector}`);
          return;
        }
        
        if (visible) {
          el.classList.add('visible');
          el.classList.remove('is-hidden');
          el.style.display = '';
          el.style.opacity = '';
          el.style.visibility = '';
        } else {
          el.classList.remove('visible');
          el.classList.add('is-hidden');
        }
      } catch (error) {
        console.error(`[cine] Error in setVisible for ${selector}:`, error);
      }
    },
    
    /**
     * Fade out an element
     */
    async fadeOut(selector, duration) {
      try {
        const el = document.querySelector(selector);
        if (!el) {
          console.error(`[cine] Element not found: ${selector}`);
          return;
        }
        
        el.style.transition = `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
        el.style.opacity = '0';
        await this.sleep(duration);
      } catch (error) {
        console.error(`[cine] Error in fadeOut for ${selector}:`, error);
      }
    },
    
    /**
     * Sleep helper
     */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Navigate to next URL
     */
    goto() {
      try {
        window.location.href = this.nextUrl;
      } catch (error) {
        console.error('[cine] Navigation error:', error);
        try {
          window.location.pathname = this.nextUrl;
        } catch (fallbackError) {
          console.error('[cine] Fallback navigation also failed:', fallbackError);
        }
      }
    },
    
    /**
     * Start screen shake effect
     * @param {number} duration - Shake duration in milliseconds
     * @param {number} maxIntensity - Maximum shake intensity in pixels (default: 8)
     */
    startScreenShake(duration, maxIntensity = 8) {
      const body = document.body;
      const startTime = performance.now();
      
      const shake = (timestamp) => {
        const elapsed = timestamp - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Reset transform when done
          body.style.transform = '';
          return;
        }
        
        // Intensity increases then decreases (bell curve)
        const intensity = Math.sin(progress * Math.PI) * maxIntensity;
        
        // Random shake in X and Y
        const shakeX = (Math.random() - 0.5) * intensity;
        const shakeY = (Math.random() - 0.5) * intensity;
        
        body.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
        
        requestAnimationFrame(shake);
      };
      
      requestAnimationFrame(shake);
    },
    
    /**
     * Fade entire page to black for smooth transition
     * @param {number} duration - Fade duration in milliseconds
     * @returns {Promise} Resolves when fade is complete
     */
    async fadeToBlack(duration) {
      // Create fade overlay if it doesn't exist
      let overlay = document.getElementById('fade-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'fade-overlay';
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000000;
          opacity: 0;
          pointer-events: none;
          z-index: 9999;
          transition: opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1);
        `;
        document.body.appendChild(overlay);
      }
      
      // Trigger fade
      await this.nextFrame();
      overlay.style.opacity = '1';
      
      // Wait for fade to complete
      await this.sleep(duration);
    },
    
    /**
     * Wait for next animation frame
     * @returns {Promise} Resolves on next frame
     */
    nextFrame() {
      return new Promise(resolve => requestAnimationFrame(resolve));
    },

    /**
     * Launch sequence - orchestrates the button click animation
     * Button launches upward like a rocket ship with fire trail
     */
    async launch() {
      try {
        this.log('Launch sequence initiated');
        
        // Add button click animation (.clicked class with 800ms timeout)
        const btn = document.querySelector('#launchButton');
        if (btn) {
          btn.classList.add('clicked');
          setTimeout(() => btn.classList.remove('clicked'), 800);
        }
        
        // Check for reduced-motion and navigate immediately if true
        if (this.prefersReduced()) {
          this.log('Reduced motion detected, navigating immediately');
          this.goto();
          return;
        }
        
        // T0-600ms: Swipe title left and subtitle right
        this.log('T0: Swiping hero text - title left, subtitle right');
        this.swipeLeft('#heroTitle');
        setTimeout(() => this.swipeRight('#heroSubtitle'), 50);
        
        // T0-700ms: FLIP button to center (NO spotlight yet - just move the button)
        if (btn) {
          this.log('T0: FLIP button to center (no spotlight yet)');
          this.flipToCenter(btn, 700);
        } else {
          console.error('[cine] Launch button not found for FLIP animation');
        }
        
        // Wait for swipe animation to complete
        await this.sleep(650);
        
        // Second burst effect - same as click burst but slightly larger
        this.log('T650: Second burst effect (larger)');
        if (btn) {
          btn.classList.add('burst-two');
          // Removed flash() - was causing jarring white screen flash
          setTimeout(() => btn.classList.remove('burst-two'), 900);
        }
        
        // Wait for burst to complete
        await this.sleep(400);
        
        // Button charges up - stall longer before launch
        this.log('T1050: Button charging for launch (extended stall)');
        if (btn) {
          btn.classList.add('charging');
        }
        
        // Extended charge/stall time for dramatic effect
        await this.sleep(1300);
        
        // Launch the button upward like a rocket with fire trail
        this.log('Button launching upward with rocket fire');
        if (btn) {
          btn.classList.remove('charging');
          btn.classList.add('launching');
          btn.classList.add('rocket-fire'); // Add fire trail effect
          
          // Calculate position to move button to ~20% from top
          const targetY = window.innerHeight * 0.2;
          const btnRect = btn.getBoundingClientRect();
          const currentCenterY = btnRect.top + btnRect.height / 2;
          const moveUpAmount = currentCenterY - targetY;
          
          // Smooth rocket-like launch with ease-out
          btn.style.transition = 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1)';
          const currentTransform = btn.style.transform || '';
          btn.style.transform = currentTransform.replace(/translate3d\(([^,]+),\s*([^,]+),/, (_, x, y) => {
            const currentY = parseFloat(y) || 0;
            return `translate3d(${x}, ${currentY - moveUpAmount}px,`;
          });
        }
        
        // Wait for launch animation
        await this.sleep(800);
        
        // Mark as launched (settled at top) - keep rocket fire going
        if (btn) {
          btn.classList.remove('launching');
          btn.classList.add('launched');
        }
        
        // Button at peak - enable thruster smoke (no spotlight)
        this.log('Button at peak - thruster smoke firing');
        
        // Enable smoke effect - rocket thrusters firing
        this.log('Thruster smoke shooting downward');
        this.cx.smoke(true);
        
        if (btn) {
          const newRect = btn.getBoundingClientRect();
          this.cx.setFocusRect(newRect);
        }
        
        // Make section background transparent so canvas beam is visible
        const section = document.querySelector('section');
        if (section) {
          section.style.background = 'transparent';
        }
        
        // Hide DOM stats - we'll use canvas stats instead
        const domStats = document.querySelector('#stats');
        if (domStats) {
          domStats.style.display = 'none';
        }
        
        // Show stats on canvas and START GROWING IMMEDIATELY
        await this.sleep(100);
        this.log('Revealing canvas stats - growing immediately behind smoke');
        
        // Define stats data for canvas rendering
        const statsData = [
          { label: 'Projects: ', value: 0 },
          { label: 'Certifications: ', value: 0 },
          { label: 'In-Progress: ', value: 0 }
        ];
        
        // Show stats on canvas and start growth animation IMMEDIATELY
        this.cx.showStats(statsData, false);
        this.cx.setStatsGlow(true);
        this.cx.twinkle(true);
        
        // Start stats growth immediately - they grow behind the smoke
        this.cx.startStatsGrowth();
        this.log('Stats growth started - scaling behind smoke and spotlight');
        
        // Electric effect already enabled from page init
        
        // ============================================
        // ROCKET STALL AT PEAK: Hold position with thrusters firing
        // ============================================
        this.log('Rocket stalling at peak - thrusters firing with smoke');
        
        // Extended stall at peak with smoke visible
        await this.sleep(1600); // Longer stall time to show off the thruster effect
        
        // Disable smoke as rocket prepares to ascend
        this.log('Disabling thruster smoke');
        this.cx.smoke(false);
        
        // ============================================
        // EXIT SEQUENCE: Button ascends, stats continue growing
        // ============================================
        this.log('Starting exit sequence - button ascending, stats continue growing');
        
        // Stats are already growing (started during spotlight phase)
        // Start button ascending animation
        if (btn) {
          this.ascendButton(btn, 1000);
        }
        
        // Wait for button to finish ascending
        await this.sleep(1000);
        
        // Hide button completely after animation
        if (btn) {
          btn.style.visibility = 'hidden';
          btn.style.pointerEvents = 'none';
          btn.classList.remove('rocket-fire'); // Remove fire trail
        }
        
        // Start counter animation early in the growth phase for smooth coordination
        await this.sleep(200);
        this.log('Starting canvas counter animation with plus sign flash as stats grow');
        this.cx.flashPlusSigns(1000); // Slightly longer flash for smoother effect
        await this.runCanvasCounters([6, 3, 2], 1000); // Slightly longer counter animation
        
        // Trigger flyby rocket in background
        await this.sleep(200);
        this.log('Triggering flyby rocket in background');
        this.cx.triggerFlybyRocket();
        
        // Let stats continue growing smoothly - more time to appreciate the growth
        this.log('Stats continuing to grow smoothly on canvas...');
        await this.sleep(1400); // Extended time for smoother visual flow
        
        // ============================================
        // EPIC HYPERSPACE WARP TRANSITION
        // ============================================
        this.log('INITIATING HYPERSPACE JUMP - ENGAGING WARP DRIVE');
        
        // Start the EPIC hyperspace star warp effect
        this.cx.starWarp(true);
        
        // Start screen shake effect - extended duration
        this.startScreenShake(3000); // 3 second shake
        
        // Start stats warp-off animation (stats tear away as we enter hyperspace)
        this.cx.warpOffStats(2500); // 2.5 second warp transition
        
        // Intensify the warp effect over time
        await this.sleep(600);
        this.log('Warp drive at 40% - space-time distortion increasing');
        
        await this.sleep(500);
        this.log('Warp drive at 70% - approaching maximum velocity');
        
        await this.sleep(400);
        this.log('Warp drive at 100% - MAXIMUM WARP');
        
        // Peak warp flash
        this.cx.flash();
        
        await this.sleep(300);
        
        // Let the warp effect continue at full intensity
        this.log('Maintaining maximum warp speed');
        await this.sleep(1200);
        
        // ============================================
        // FADE TO BLACK TRANSITION
        // ============================================
        this.log('Warp complete - fading to black for smooth transition');
        
        // Fade entire page to black
        await this.fadeToBlack(800);
        
        // Clean up - set scene to idle
        this.cx.setScene('idle');
        
        this.log('Fade complete - navigating to destination');
        
        // Set flag for warp arrival animation on destination page
        sessionStorage.setItem('warpArrival', 'true');
        
        // Navigate to main index page at projects section
        this.goto();
      } catch (error) {
        console.error('[cine] Launch sequence error:', error);
      }
    },
    
    /**
     * Swipe element to the left and fade out
     */
    swipeLeft(selector) {
      try {
        const el = document.querySelector(selector);
        if (!el) {
          console.error(`[cine] Element not found: ${selector}`);
          return;
        }
        
        el.classList.add('swipe-left');
        
        setTimeout(() => {
          requestAnimationFrame(() => {
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
          });
        }, 600);
      } catch (error) {
        console.error(`[cine] Error in swipeLeft for ${selector}:`, error);
      }
    },
    
    /**
     * Swipe element to the right and fade out
     */
    swipeRight(selector) {
      try {
        const el = document.querySelector(selector);
        if (!el) {
          console.error(`[cine] Element not found: ${selector}`);
          return;
        }
        
        el.classList.add('swipe-right');
        
        setTimeout(() => {
          requestAnimationFrame(() => {
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
          });
        }, 600);
      } catch (error) {
        console.error(`[cine] Error in swipeRight for ${selector}:`, error);
      }
    },
    
    /**
     * Ascend button animation - button flies up and fades out
     */
    ascendButton(element, duration) {
      try {
        if (!element) {
          console.error('[cine] No element provided to ascendButton');
          return;
        }
        
        const computedStyle = window.getComputedStyle(element);
        const currentTransform = computedStyle.transform;
        
        let currentY = 0;
        let currentX = 0;
        if (currentTransform && currentTransform !== 'none') {
          const matrix = new DOMMatrix(currentTransform);
          currentX = matrix.m41;
          currentY = matrix.m42;
        }
        
        const targetY = currentY - (window.innerHeight * 1.5);
        
        element.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
        element.style.transform = `translate3d(${currentX}px, ${targetY}px, 0) scale(0.1)`;
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
      } catch (error) {
        console.error('[cine] Error in ascendButton:', error);
      }
    },
    
    /**
     * Grow stats font-size for crisp scaling (no CSS transform blur)
     * Uses requestAnimationFrame for smooth animation
     * @param {HTMLElement} element - The stats container
     * @param {number} duration - Animation duration in milliseconds
     */
    growStatsFontSize(element, duration) {
      if (!element) return;
      
      // Get current computed font-size
      const computedStyle = window.getComputedStyle(element);
      const currentSize = parseFloat(computedStyle.fontSize);
      const targetSize = currentSize * 1.08; // Grow to 108% - very subtle, never causes stacking
      
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const newSize = currentSize + (targetSize - currentSize) * eased;
        element.style.fontSize = `${newSize}px`;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    },
    
    /**
     * FLIP button animation - moves button to viewport center
     */
    flipToCenter(element, duration) {
      try {
        if (!element) {
          console.error('[cine] No element provided to flipToCenter');
          return;
        }
        
        element.classList.add('flipping');
        
        const first = element.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const deltaX = centerX - (first.left + first.width / 2);
        const deltaY = centerY - (first.top + first.height / 2);
        
        element.style.transition = `transform ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`;
        element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
        
        const centeredRect = new DOMRect(
          centerX - first.width / 2,
          centerY - first.height / 2,
          first.width,
          first.height
        );
        this.cx.setFocusRect(centeredRect);
      } catch (error) {
        console.error('[cine] Error in flipToCenter:', error);
      }
    },
    
    /**
     * Animate counters from 0 to target values (DOM version)
     */
    async runCounters(container, customDuration = 500) {
      try {
        if (!container) {
          console.error('[cine] No container provided to runCounters');
          return;
        }
        
        const counters = container.querySelectorAll('[data-target]');
        if (counters.length === 0) {
          console.warn('[cine] No counter elements found with data-target attribute');
          return;
        }
        
        const duration = customDuration;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
          
          counters.forEach(counter => {
            const target = parseInt(counter.dataset.target, 10);
            if (isNaN(target)) {
              console.warn('[cine] Invalid data-target value:', counter.dataset.target);
              return;
            }
            const value = Math.floor(target * eased);
            counter.textContent = value;
          });
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        requestAnimationFrame(animate);
        await this.sleep(duration);
      } catch (error) {
        console.error('[cine] Error in runCounters:', error);
      }
    },
    
    /**
     * Animate canvas stats counters from 0 to target values
     * @param {Array<number>} targets - Array of target values [6, 3, 2]
     * @param {number} duration - Animation duration in ms
     */
    async runCanvasCounters(targets, duration = 800) {
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
        
        // Update each stat value on canvas
        targets.forEach((target, index) => {
          const value = Math.floor(target * eased);
          this.cx.updateStatValue(index, value);
        });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
      await this.sleep(duration);
    },
    
    /**
     * Cleanup method
     */
    destroy() {
      this.log('Cleaning up component');
      
      if (this.cx && this.cx.stop) {
        this.cx.stop();
      }
      
      if (this.handleResize) {
        window.removeEventListener('resize', this.handleResize);
      }
    }
  };
}

// Expose to global scope for Alpine.js x-data
window.CinematicLanding = CinematicLanding;
