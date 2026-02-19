/**
 * CineCanvas - Canvas rendering engine for cinematic landing page
 * Manages visual effects: ambient glow, vignette, ring burst, spotlight, twinkle, flash
 */

class CanvasEngine {
  constructor(canvas, ctx, options = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
    this.scene = 'idle';
    this.focusRect = null;
    this.particles = [];
    this.starWarpParticles = []; // Hyperspace star warp effect
    this.flashAlpha = 0;
    this.flashStartTime = null;
    this.flashDuration = 180;
    this.ringBurst = null;
    this.rafId = null;
    this.isVisible = true;
    this.twinkleEnabled = false;
    this.starWarpEnabled = false;
    this.starWarpStartTime = null;
    this.starWarpFadeOut = false;
    this.starWarpFadeStart = null;
    
    // Background starfield and nebula - starts black, fades in
    this.backgroundStars = [];
    this.nebulaTime = 0;
    this.backgroundOpacity = 0; // Start at 0 (black)
    this.backgroundFadingIn = false;
    this.backgroundFadeStart = null;
    this.backgroundFadeDuration = 3000; // 3 seconds to fade in space theme
    this.initBackgroundStars();
    
    // Beam fade animation state
    this.beamOpacity = 1;
    this.beamFading = false;
    this.beamFadeStartTime = null;
    this.beamFadeDuration = 800;
    
    // Spotlight reveal animation state (top to bottom)
    this.spotlightRevealing = false;
    this.spotlightRevealStart = null;
    this.spotlightRevealDuration = 1200; // 1.2 seconds to fully reveal
    this.spotlightRevealProgress = 0; // 0 = not revealed, 1 = fully revealed
    
    // UFO beam animation state (descends then retracts)
    this.ufoBeamActive = false;
    this.ufoBeamProgress = 0; // 0 = retracted, 1 = fully extended
    this.ufoBeamPhase = 'idle'; // 'descending', 'holding', 'retracting', 'idle'
    this.ufoBeamStartTime = null;
    this.ufoBeamDescendDuration = 1200; // Time to descend
    this.ufoBeamHoldDuration = 800; // Time to hold at bottom
    this.ufoBeamRetractDuration = 600; // Time to retract
    
    // Flyby rocket effect (button flies by in background)
    this.flybyRocket = null;
    
    // Stats text rendering state - DISABLED (hidden for now)
    this.statsEnabled = false; // Keep disabled - stats hidden
    this.statsData = null;
    this.statsScale = 1;      // Current scale (starts at 1 = static)
    this.statsScaling = false;
    this.statsScaleStart = null;
    this.statsScaleDuration = 10000; // 10 seconds for very slow, smooth growth
    this.statsStartScale = 1.0;   // Start at 100% - static size
    this.statsEndScale = 1.6;     // Grow to 160% - fills page width smoothly
    this.statsGlow = false;
    this.statsOpacity = 0;
    this.statsFadingIn = false;
    this.statsFadeStart = null;
    this.statsShowPlus = false;  // Plus signs hidden by default
    this.statsPlusFlashing = false; // Flash state for plus signs
    this.statsPlusFlashStart = null;
    this.statsPlusFlashDuration = 800; // Flash duration matches counter animation
    this.statsPlusOpacity = 0; // Current plus sign opacity
    
    // Stats warp-off animation state (hyperspace transition)
    this.statsWarping = false;
    this.statsWarpStart = null;
    this.statsWarpDuration = 1500; // 1.5 seconds
    this.statsWarpProgress = 0; // 0 = normal, 1 = fully warped off
    this.statsWarpStretch = 1; // Horizontal stretch factor
    this.statsWarpOffsetZ = 0; // Z-axis offset for perspective
    
    // Electric static border effect - visible strands along edges
    this.electricEnabled = false;
    this.electricBolts = [];
    this.electricLastSpawn = 0;
    this.electricSpawnRate = 150; // ms between new bolt spawns (slower)
    
    // Shooting star effect
    this.shootingStar = null;
    
    // Smoke particle system for rocket charging effect
    this.smokeEnabled = false;
    this.smokeParticles = [];
    this.smokeEmitRate = 8; // Increased particles per frame to fill spotlight
    
    // Initialize canvas dimensions
    this.resize();
    
    // Handle visibility changes to pause/resume RAF
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Start render loop
    this.render(performance.now());
  }
  
  /**
   * Resize canvas with DPR-aware dimension calculation
   */
  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Set display size (CSS pixels)
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // Set actual size in memory (scaled by DPR)
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    
    // Scale context to match DPR
    this.ctx.scale(this.dpr, this.dpr);
    
    // Reinitialize background stars for new dimensions
    this.initBackgroundStars();
  }
  
  /**
   * Clear canvas for next frame
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Initialize background stars for the starfield effect
   */
  initBackgroundStars() {
    const count = 120; // Number of background stars
    this.backgroundStars = [];
    let planetsCreated = 0;
    
    for (let i = 0; i < count; i++) {
      // 5% chance to be a cute swirly galaxy instead of a star
      const isGalaxy = Math.random() < 0.05;
      const starSize = 0.5 + Math.random() * 2;
      // 10% of larger stars (size > 1.5) become cross stars
      const isCrossStar = !isGalaxy && starSize > 1.5 && Math.random() < 0.1;
      
      // Create exactly 3 planets (larger stars with rings) - evenly spaced through the loop
      const isPlanet = !isGalaxy && !isCrossStar && planetsCreated < 3 && i % 40 === 10;
      if (isPlanet) {
        planetsCreated++;
      }
      
      this.backgroundStars.push({
        x: Math.random(), // Normalized 0-1
        y: Math.random(), // Normalized 0-1
        size: isPlanet ? (3 + Math.random() * 2) : (isGalaxy ? (8 + Math.random() * 8) : starSize), // Planets are medium-sized
        brightness: 0.2 + Math.random() * 0.6, // 0.2-0.8
        twinkleSpeed: 0.5 + Math.random() * 2, // Different twinkle speeds
        twinklePhase: Math.random() * Math.PI * 2, // Random starting phase
        // Color: mostly white, some with blue/purple tint
        hue: Math.random() > 0.7 ? (Math.random() > 0.5 ? 240 : 270) : 0,
        saturation: Math.random() > 0.7 ? 30 + Math.random() * 40 : 0,
        // Galaxy properties
        isGalaxy: isGalaxy,
        rotation: Math.random() * Math.PI * 2, // Random starting rotation
        rotationSpeed: isGalaxy ? (0.1 + Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1) : 0, // All galaxies rotate slowly
        armCount: Math.random() > 0.5 ? 2 : 3, // 2 or 3 spiral arms
        // Cross star properties
        isCrossStar: isCrossStar,
        crossRotation: Math.random() * Math.PI * 2, // Random rotation for cross stars
        // Planet properties
        isPlanet: isPlanet,
        ringAngle: Math.random() * Math.PI * 2, // Random ring orientation
        ringColor: Math.random() > 0.5 ? 'purple' : 'blue' // Ring color variation
      });
    }
  }
  
  /**
   * Draw the beautiful animated background
   * Includes: gradient nebula, twinkling stars, subtle aurora effect
   * Supports fade-in from black via backgroundOpacity
   * @param {number} timestamp - Current timestamp from RAF
   */
  drawBackground(timestamp) {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const time = timestamp * 0.001; // Convert to seconds
    
    // 1. Always draw solid black base first
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);
    
    // If background opacity is 0, just show black
    if (this.backgroundOpacity <= 0) {
      return;
    }
    
    // Apply background opacity for fade-in effect
    this.ctx.save();
    this.ctx.globalAlpha = this.backgroundOpacity;
    
    // 2. Draw base gradient (dark space) on top of black
    const baseGradient = this.ctx.createLinearGradient(0, 0, 0, height);
    baseGradient.addColorStop(0, '#0a0a12');
    baseGradient.addColorStop(0.5, '#0d0d18');
    baseGradient.addColorStop(1, '#08080f');
    this.ctx.fillStyle = baseGradient;
    this.ctx.fillRect(0, 0, width, height);
    
    // 3. Draw animated nebula clouds
    this.drawNebula(width, height, time);
    
    // 4. Draw twinkling stars
    this.drawBackgroundStars(width, height, time);
    
    // 5. Draw subtle aurora/glow effect
    this.drawAurora(width, height, time);
    
    // 6. Draw soft vignette
    this.drawSoftVignette(width, height);
    
    this.ctx.restore();
  }
  
  /**
   * Draw animated nebula clouds with brand colors
   */
  drawNebula(width, height, time) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    
    // Nebula cloud 1 - Purple/violet
    const cloud1X = width * 0.3 + Math.sin(time * 0.15) * width * 0.1;
    const cloud1Y = height * 0.35 + Math.cos(time * 0.12) * height * 0.08;
    const cloud1Radius = Math.max(width, height) * 0.5;
    
    const nebula1 = this.ctx.createRadialGradient(
      cloud1X, cloud1Y, 0,
      cloud1X, cloud1Y, cloud1Radius
    );
    nebula1.addColorStop(0, 'rgba(139, 92, 246, 0.08)'); // violet-500
    nebula1.addColorStop(0.3, 'rgba(168, 85, 247, 0.05)'); // purple-500
    nebula1.addColorStop(0.6, 'rgba(139, 92, 246, 0.02)');
    nebula1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = nebula1;
    this.ctx.fillRect(0, 0, width, height);
    
    // Nebula cloud 2 - Indigo/blue
    const cloud2X = width * 0.7 + Math.cos(time * 0.1) * width * 0.12;
    const cloud2Y = height * 0.6 + Math.sin(time * 0.08) * height * 0.1;
    const cloud2Radius = Math.max(width, height) * 0.45;
    
    const nebula2 = this.ctx.createRadialGradient(
      cloud2X, cloud2Y, 0,
      cloud2X, cloud2Y, cloud2Radius
    );
    nebula2.addColorStop(0, 'rgba(99, 102, 241, 0.07)'); // indigo-500
    nebula2.addColorStop(0.3, 'rgba(79, 70, 229, 0.04)'); // indigo-600
    nebula2.addColorStop(0.6, 'rgba(99, 102, 241, 0.015)');
    nebula2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = nebula2;
    this.ctx.fillRect(0, 0, width, height);
    
    // Nebula cloud 3 - Cyan accent (subtle)
    const cloud3X = width * 0.5 + Math.sin(time * 0.18) * width * 0.15;
    const cloud3Y = height * 0.25 + Math.cos(time * 0.14) * height * 0.06;
    const cloud3Radius = Math.max(width, height) * 0.35;
    
    const nebula3 = this.ctx.createRadialGradient(
      cloud3X, cloud3Y, 0,
      cloud3X, cloud3Y, cloud3Radius
    );
    nebula3.addColorStop(0, 'rgba(6, 182, 212, 0.04)'); // cyan-500
    nebula3.addColorStop(0.5, 'rgba(6, 182, 212, 0.015)');
    nebula3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = nebula3;
    this.ctx.fillRect(0, 0, width, height);
    
    this.ctx.restore();
  }
  
  /**
   * Draw twinkling background stars and cute swirly galaxies
   * With warp distortion effect when hyperspace is active
   */
  drawBackgroundStars(width, height, time) {
    this.ctx.save();
    
    // Calculate warp distortion if active
    let warpIntensity = 0;
    if (this.starWarpEnabled && this.starWarpStartTime !== null) {
      const elapsed = performance.now() - this.starWarpStartTime;
      warpIntensity = Math.min(Math.pow(elapsed / 800, 2), 1); // Exponential ramp to max 1
    }
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    this.backgroundStars.forEach(star => {
      let x = star.x * width;
      let y = star.y * height;
      
      // Apply warp distortion - stars fly toward viewer from center
      if (warpIntensity > 0) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Determine object size for differential warp effect
        // Larger objects (galaxies, planets, large stars) move MORE dramatically
        let objectSize = star.size;
        let isLargeObject = star.isGalaxy || star.isPlanet || star.isCrossStar || objectSize > 1.5;
        
        // Larger objects get MORE push and scale
        const sizeFactor = isLargeObject ? 2.5 : 1.0;
        
        // Push stars outward exponentially - larger objects pushed MORE
        const warpPush = distance * warpIntensity * 0.8 * sizeFactor;
        x = centerX + Math.cos(angle) * (distance + warpPush);
        y = centerY + Math.sin(angle) * (distance + warpPush);
        
        // CONTINUOUS GROWTH: Stars keep growing as you pass through them
        // Initialize warp progress tracking if not set
        if (!star.warpProgress) {
          star.warpProgress = 0;
        }
        
        // Continuously increase warp progress (stars keep growing)
        star.warpProgress = Math.min(star.warpProgress + 0.02, 2); // Grows to 2x over time
        
        // Scale up stars continuously - they keep growing as you approach and pass through
        const baseScale = isLargeObject ? 6 : 3; // Even larger max scale
        const continuousScale = 1 + star.warpProgress * baseScale;
        star.warpScale = continuousScale;
        
        // FADE OUT as stars grow larger (passing through them)
        // Stars fade out as they get very large (you're passing through them)
        const fadeStart = 0.6; // Start fading at 60% of max growth
        const fadeProgress = Math.max(0, (star.warpProgress - fadeStart) / (2 - fadeStart));
        star.warpFade = 1 - fadeProgress; // Fade from 1 to 0
        
        // Add motion blur effect for large objects at high warp
        star.warpBlur = isLargeObject && warpIntensity > 0.5 ? warpIntensity * 3 : 0;
        
        // Mark star as off-screen if it's gone beyond viewport bounds OR fully faded
        const margin = 200; // Extra margin to ensure stars are truly gone
        const isOutOfBounds = x < -margin || x > width + margin || y < -margin || y > height + margin;
        const isFullyFaded = star.warpFade <= 0.01;
        star.isOffScreen = isOutOfBounds || isFullyFaded;
      } else {
        star.warpScale = 1;
        star.warpBlur = 0;
        star.warpFade = 1;
        star.warpProgress = 0;
        star.isOffScreen = false;
      }
      
      // Skip drawing if star has flown off screen or faded out during warp
      if (star.isOffScreen) {
        return;
      }
      
      // Calculate twinkle effect
      const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);
      let alpha = star.brightness * (0.4 + twinkle * 0.6);
      
      // Apply warp fade to alpha
      if (warpIntensity > 0) {
        alpha *= star.warpFade;
      }
      
      // Draw galaxy, cross star, planet, or regular star
      if (star.isGalaxy) {
        this.drawGalaxy(x, y, star, time, alpha);
      } else if (star.isCrossStar) {
        this.drawCrossStar(x, y, star, time, alpha, twinkle);
      } else if (star.isPlanet) {
        this.drawPlanet(x, y, star, time, alpha, twinkle);
      } else {
        // Draw regular dot star with glow
        if (star.hue === 0) {
          // White star
          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        } else {
          // Colored star
          this.ctx.fillStyle = `hsla(${star.hue}, ${star.saturation}%, 85%, ${alpha})`;
        }
        
        // Apply warp scale
        const warpScale = star.warpScale || 1;
        
        // Draw soft glow for brighter stars
        if (star.brightness > 0.5 && twinkle > 0.6) {
          const glowSize = star.size * 3 * warpScale;
          const glow = this.ctx.createRadialGradient(x, y, 0, x, y, glowSize);
          if (star.hue === 0) {
            glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.4})`);
          } else {
            glow.addColorStop(0, `hsla(${star.hue}, ${star.saturation}%, 85%, ${alpha * 0.4})`);
          }
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          this.ctx.fillStyle = glow;
          this.ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);
        }
        
        // Draw star core with warp scale
        this.ctx.beginPath();
        this.ctx.arc(x, y, star.size * (0.8 + twinkle * 0.4) * warpScale, 0, Math.PI * 2);
        if (star.hue === 0) {
          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        } else {
          this.ctx.fillStyle = `hsla(${star.hue}, ${star.saturation}%, 90%, ${alpha})`;
        }
        this.ctx.fill();
      }
    });
    
    this.ctx.restore();
  }
  
  /**
   * Draw a cute swirly galaxy
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {object} galaxy - Galaxy data object
   * @param {number} time - Current time in seconds
   * @param {number} alpha - Base alpha for rendering
   */
  drawGalaxy(x, y, galaxy, time, alpha) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(galaxy.rotation + time * galaxy.rotationSpeed);
    
    // Apply warp scale
    const warpScale = galaxy.warpScale || 1;
    if (warpScale !== 1) {
      this.ctx.scale(warpScale, warpScale);
    }
    
    // Apply motion blur during warp
    const warpBlur = galaxy.warpBlur || 0;
    if (warpBlur > 0) {
      this.ctx.shadowBlur = warpBlur * 5;
      this.ctx.shadowColor = 'rgba(180, 160, 255, 0.4)';
    }
    
    // Draw bright core
    const coreSize = galaxy.size * 0.25;
    const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
    coreGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
    coreGradient.addColorStop(0.5, `rgba(220, 200, 255, ${alpha * 0.6})`);
    coreGradient.addColorStop(1, `rgba(180, 160, 255, ${alpha * 0.2})`);
    
    this.ctx.fillStyle = coreGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw spiral arms
    this.ctx.globalCompositeOperation = 'screen';
    
    for (let arm = 0; arm < galaxy.armCount; arm++) {
      const armAngle = (Math.PI * 2 / galaxy.armCount) * arm;
      
      // Draw spiral arm as a curved path
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const distance = galaxy.size * t;
        const angle = armAngle + t * Math.PI * 1.5; // 1.5 rotations
        const spiralX = Math.cos(angle) * distance;
        const spiralY = Math.sin(angle) * distance;
        
        if (i === 0) {
          this.ctx.moveTo(spiralX, spiralY);
        } else {
          this.ctx.lineTo(spiralX, spiralY);
        }
      }
      
      // Gradient along the arm
      const armGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.size);
      armGradient.addColorStop(0, `rgba(200, 180, 255, ${alpha * 0.5})`);
      armGradient.addColorStop(0.5, `rgba(168, 85, 247, ${alpha * 0.3})`);
      armGradient.addColorStop(1, `rgba(99, 102, 241, 0)`);
      
      this.ctx.strokeStyle = armGradient;
      this.ctx.lineWidth = galaxy.size * 0.15;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
  
  /**
   * Draw a cross-shaped star (four-pointed star)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {object} star - Star data object
   * @param {number} time - Current time in seconds
   * @param {number} alpha - Base alpha for rendering
   * @param {number} twinkle - Twinkle value (0-1)
   */
  drawCrossStar(x, y, star, time, alpha, twinkle) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(star.crossRotation + time * 0.1); // Slow rotation
    
    // Apply warp scale
    const warpScale = star.warpScale || 1;
    if (warpScale !== 1) {
      this.ctx.scale(warpScale, warpScale);
    }
    
    // Apply motion blur during warp
    const warpBlur = star.warpBlur || 0;
    if (warpBlur > 0) {
      this.ctx.shadowBlur = warpBlur * 5;
      this.ctx.shadowColor = star.hue === 0 
        ? 'rgba(255, 255, 255, 0.4)' 
        : `hsla(${star.hue}, ${star.saturation}%, 85%, 0.4)`;
    }
    
    const size = star.size * (0.8 + twinkle * 0.4);
    const beamLength = size * 2.5;
    const beamWidth = size * 0.4;
    
    // Determine color
    const color = star.hue === 0 
      ? `rgba(255, 255, 255, ${alpha})` 
      : `hsla(${star.hue}, ${star.saturation}%, 90%, ${alpha})`;
    
    // Draw glow around cross
    if (star.brightness > 0.5) {
      const glowSize = beamLength * 1.2;
      const glow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
      if (star.hue === 0) {
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.3})`);
        glow.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.1})`);
      } else {
        glow.addColorStop(0, `hsla(${star.hue}, ${star.saturation}%, 85%, ${alpha * 0.3})`);
        glow.addColorStop(0.5, `hsla(${star.hue}, ${star.saturation}%, 85%, ${alpha * 0.1})`);
      }
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = glow;
      this.ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);
    }
    
    // Draw four beams (cross shape)
    this.ctx.fillStyle = color;
    
    // Vertical beam
    this.ctx.beginPath();
    this.ctx.moveTo(-beamWidth / 2, -beamLength);
    this.ctx.lineTo(beamWidth / 2, -beamLength);
    this.ctx.lineTo(beamWidth / 2, beamLength);
    this.ctx.lineTo(-beamWidth / 2, beamLength);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Horizontal beam
    this.ctx.beginPath();
    this.ctx.moveTo(-beamLength, -beamWidth / 2);
    this.ctx.lineTo(beamLength, -beamWidth / 2);
    this.ctx.lineTo(beamLength, beamWidth / 2);
    this.ctx.lineTo(-beamLength, beamWidth / 2);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Bright center core
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.fillStyle = star.hue === 0 
      ? `rgba(255, 255, 255, ${alpha * 1.2})` 
      : `hsla(${star.hue}, ${star.saturation}%, 95%, ${alpha * 1.2})`;
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  /**
   * Draw a planet with Saturn-like rings
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {object} planet - Planet data object
   * @param {number} time - Current time in seconds
   * @param {number} alpha - Base alpha for rendering
   * @param {number} twinkle - Twinkle value (0-1)
   */
  drawPlanet(x, y, planet, time, alpha, twinkle) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(planet.ringAngle);
    
    // Apply warp scale
    const warpScale = planet.warpScale || 1;
    if (warpScale !== 1) {
      this.ctx.scale(warpScale, warpScale);
    }
    
    // Apply motion blur during warp
    const warpBlur = planet.warpBlur || 0;
    if (warpBlur > 0) {
      this.ctx.shadowBlur = warpBlur * 5;
      this.ctx.shadowColor = planet.hue === 0 
        ? 'rgba(220, 220, 240, 0.4)' 
        : `hsla(${planet.hue}, ${planet.saturation}%, 80%, 0.4)`;
    }
    
    const size = planet.size * (0.9 + twinkle * 0.2); // Subtle twinkle
    
    // Determine planet color
    const planetColor = planet.hue === 0 
      ? `rgba(220, 220, 240, ${alpha})` 
      : `hsla(${planet.hue}, ${planet.saturation}%, 80%, ${alpha})`;
    
    // Draw ring behind planet (back half)
    this.drawPlanetRing(size, alpha, planet.ringColor, true);
    
    // Draw planet body with subtle gradient
    const planetGradient = this.ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
    if (planet.hue === 0) {
      planetGradient.addColorStop(0, `rgba(240, 240, 255, ${alpha})`);
      planetGradient.addColorStop(1, `rgba(180, 180, 200, ${alpha * 0.8})`);
    } else {
      planetGradient.addColorStop(0, `hsla(${planet.hue}, ${planet.saturation}%, 85%, ${alpha})`);
      planetGradient.addColorStop(1, `hsla(${planet.hue}, ${planet.saturation}%, 65%, ${alpha * 0.8})`);
    }
    
    this.ctx.fillStyle = planetGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw ring in front of planet (front half)
    this.drawPlanetRing(size, alpha, planet.ringColor, false);
    
    this.ctx.restore();
  }
  
  /**
   * Draw a planet ring (Saturn-like)
   * @param {number} planetSize - Size of the planet
   * @param {number} alpha - Base alpha for rendering
   * @param {string} ringColor - Ring color ('purple' or 'blue')
   * @param {boolean} isBack - Whether this is the back half of the ring
   */
  drawPlanetRing(planetSize, alpha, ringColor, isBack) {
    const innerRadius = planetSize * 1.3;
    const outerRadius = planetSize * 1.8;
    
    // Ring color based on type
    const ringHue = ringColor === 'purple' ? 270 : 240;
    
    this.ctx.save();
    
    // Create elliptical ring (perspective view)
    this.ctx.scale(1, 0.3); // Flatten for perspective
    
    if (isBack) {
      // Back half - draw bottom arc
      this.ctx.beginPath();
      this.ctx.arc(0, 0, outerRadius, 0, Math.PI);
      this.ctx.arc(0, 0, innerRadius, Math.PI, 0, true);
      this.ctx.closePath();
    } else {
      // Front half - draw top arc
      this.ctx.beginPath();
      this.ctx.arc(0, 0, outerRadius, Math.PI, 0);
      this.ctx.arc(0, 0, innerRadius, 0, Math.PI, true);
      this.ctx.closePath();
    }
    
    // Gradient for ring
    const ringGradient = this.ctx.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius);
    ringGradient.addColorStop(0, `hsla(${ringHue}, 40%, 70%, ${alpha * 0.3})`);
    ringGradient.addColorStop(0.5, `hsla(${ringHue}, 50%, 75%, ${alpha * 0.5})`);
    ringGradient.addColorStop(1, `hsla(${ringHue}, 40%, 65%, ${alpha * 0.2})`);
    
    this.ctx.fillStyle = ringGradient;
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  /**
   * Draw subtle aurora/northern lights effect
   */
  drawAurora(width, height, time) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    
    // Flowing aurora bands
    const auroraY = height * 0.15;
    const auroraHeight = height * 0.25;
    
    // Create flowing wave pattern
    this.ctx.beginPath();
    this.ctx.moveTo(0, auroraY);
    
    for (let x = 0; x <= width; x += 10) {
      const wave1 = Math.sin(x * 0.005 + time * 0.3) * 30;
      const wave2 = Math.sin(x * 0.008 + time * 0.2) * 20;
      const wave3 = Math.sin(x * 0.003 + time * 0.4) * 40;
      const y = auroraY + wave1 + wave2 + wave3;
      this.ctx.lineTo(x, y);
    }
    
    this.ctx.lineTo(width, auroraY + auroraHeight);
    this.ctx.lineTo(0, auroraY + auroraHeight);
    this.ctx.closePath();
    
    // Aurora gradient
    const auroraGradient = this.ctx.createLinearGradient(0, auroraY, 0, auroraY + auroraHeight);
    auroraGradient.addColorStop(0, 'rgba(139, 92, 246, 0.03)');
    auroraGradient.addColorStop(0.3, 'rgba(99, 102, 241, 0.02)');
    auroraGradient.addColorStop(0.6, 'rgba(6, 182, 212, 0.015)');
    auroraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = auroraGradient;
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  /**
   * Draw soft vignette effect
   */
  drawSoftVignette(width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) * 0.8;
    
    const vignette = this.ctx.createRadialGradient(
      centerX, centerY, radius * 0.3,
      centerX, centerY, radius
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, width, height);
  }
  
  /**
   * Main render loop - calls drawing methods based on scene
   */
  render(timestamp) {
    if (!this.isVisible) {
      // Don't render when tab is hidden, but keep RAF scheduled
      this.rafId = requestAnimationFrame((t) => this.render(t));
      return;
    }
    
    this.clear();
    
    // Update background fade-in animation
    if (this.backgroundFadingIn && this.backgroundFadeStart !== null) {
      const elapsed = timestamp - this.backgroundFadeStart;
      const progress = Math.min(elapsed / this.backgroundFadeDuration, 1);
      // Smooth ease-out for gradual reveal
      const eased = 1 - Math.pow(1 - progress, 3);
      this.backgroundOpacity = eased;
      
      if (progress >= 1) {
        this.backgroundFadingIn = false;
        this.backgroundFadeStart = null;
        this.backgroundOpacity = 1;
      }
    }
    
    // Draw beautiful animated background (with fade-in opacity)
    this.drawBackground(timestamp);
    
    // DISABLED: Ring burst effect - button has its own RGB glow
    // if (this.scene === 'burst' && this.ringBurst) {
    //   this.drawRingBurst(timestamp);
    // }
    
    // Update spotlight reveal animation (top to bottom)
    if (this.spotlightRevealing && this.spotlightRevealStart !== null) {
      const elapsed = timestamp - this.spotlightRevealStart;
      const progress = Math.min(elapsed / this.spotlightRevealDuration, 1);
      // Smooth ease-out for natural reveal
      const eased = 1 - Math.pow(1 - progress, 3);
      this.spotlightRevealProgress = eased;
      
      if (progress >= 1) {
        this.spotlightRevealing = false;
        this.spotlightRevealStart = null;
        this.spotlightRevealProgress = 1;
      }
    }
    
    // Update beam fade animation
    if (this.beamFading && this.beamFadeStartTime !== null) {
      const elapsed = timestamp - this.beamFadeStartTime;
      const progress = Math.min(elapsed / this.beamFadeDuration, 1);
      // Smooth ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      this.beamOpacity = 1 - eased;
      
      if (progress >= 1) {
        this.beamFading = false;
        this.beamFadeStartTime = null;
        this.beamOpacity = 0;
      }
    }
    
    // Update UFO beam animation (descend → hold → retract)
    if (this.ufoBeamActive && this.ufoBeamStartTime !== null) {
      const elapsed = timestamp - this.ufoBeamStartTime;
      
      if (this.ufoBeamPhase === 'descending') {
        const progress = Math.min(elapsed / this.ufoBeamDescendDuration, 1);
        // Smooth ease-out for natural descent
        this.ufoBeamProgress = 1 - Math.pow(1 - progress, 3);
        
        if (progress >= 1) {
          this.ufoBeamPhase = 'holding';
          this.ufoBeamStartTime = timestamp;
        }
      } else if (this.ufoBeamPhase === 'holding') {
        const progress = Math.min(elapsed / this.ufoBeamHoldDuration, 1);
        this.ufoBeamProgress = 1; // Stay fully extended
        
        if (progress >= 1) {
          this.ufoBeamPhase = 'retracting';
          this.ufoBeamStartTime = timestamp;
        }
      } else if (this.ufoBeamPhase === 'retracting') {
        const progress = Math.min(elapsed / this.ufoBeamRetractDuration, 1);
        // Smooth ease-in for quick retract
        const eased = progress * progress;
        this.ufoBeamProgress = 1 - eased;
        
        if (progress >= 1) {
          this.ufoBeamPhase = 'idle';
          this.ufoBeamActive = false;
          this.ufoBeamProgress = 0;
        }
      }
    }
    
    // Draw UFO beam if active
    if (this.ufoBeamActive && this.ufoBeamProgress > 0) {
      this.drawUfoBeam();
    }
    
    // Only draw spotlight/beam during stats scene (after button reaches top)
    if (this.scene === 'stats' && this.beamOpacity > 0) {
      this.drawSpotlight();
    }
    
    // Draw flyby rocket if active
    if (this.flybyRocket) {
      this.updateAndDrawFlybyRocket(timestamp);
    }
    
    // Update stats scale animation - buttery smooth with quintic ease-out
    if (this.statsScaling && this.statsScaleStart !== null) {
      const elapsed = timestamp - this.statsScaleStart;
      const progress = Math.min(elapsed / this.statsScaleDuration, 1);
      // Ultra-smooth quintic ease-out: 1 - (1 - t)^5
      // This creates very gradual acceleration at start, smooth deceleration at end
      const eased = 1 - Math.pow(1 - progress, 5);
      this.statsScale = this.statsStartScale + (this.statsEndScale - this.statsStartScale) * eased;
      
      if (progress >= 1) {
        this.statsScaling = false;
        this.statsScaleStart = null;
      }
    }
    
    // Update stats fade in
    if (this.statsFadingIn && this.statsFadeStart !== null) {
      const elapsed = timestamp - this.statsFadeStart;
      const progress = Math.min(elapsed / 400, 1); // 400ms fade in
      this.statsOpacity = progress;
      
      if (progress >= 1) {
        this.statsFadingIn = false;
        this.statsFadeStart = null;
      }
    }
    
    // Update plus sign flash animation
    if (this.statsPlusFlashing && this.statsPlusFlashStart !== null) {
      const elapsed = timestamp - this.statsPlusFlashStart;
      const progress = Math.min(elapsed / this.statsPlusFlashDuration, 1);
      // Flash in then out: sine wave 0 → 1 → 0
      this.statsPlusOpacity = Math.sin(progress * Math.PI);
      this.statsShowPlus = this.statsPlusOpacity > 0.01;
      
      if (progress >= 1) {
        this.statsPlusFlashing = false;
        this.statsPlusFlashStart = null;
        this.statsPlusOpacity = 0;
        this.statsShowPlus = false;
      }
    }
    
    // Update stats warp-off animation (hyperspace transition)
    if (this.statsWarping && this.statsWarpStart !== null) {
      const elapsed = timestamp - this.statsWarpStart;
      const progress = Math.min(elapsed / this.statsWarpDuration, 1);
      // Exponential ease-in for accelerating warp effect
      const eased = progress * progress * progress;
      this.statsWarpProgress = eased;
      
      // Calculate warp effects
      this.statsWarpStretch = 1 + eased * 8; // Stretch horizontally up to 9x
      this.statsWarpOffsetZ = eased * 2000; // Move away in Z-space
      
      // Fade out stats as they warp away
      this.statsOpacity = Math.max(0, 1 - eased * 1.5);
      
      if (progress >= 1) {
        this.statsWarping = false;
        this.statsWarpStart = null;
        this.statsEnabled = false; // Hide stats completely after warp
      }
    }
    
    // Draw stats text on canvas - DISABLED (hidden for now)
    // if (this.statsEnabled && this.statsData && this.statsOpacity > 0) {
    //   this.drawStats(timestamp);
    // }
    
    // Draw electric static border effect
    if (this.electricEnabled) {
      this.updateAndDrawElectric(timestamp);
    }
    
    // Draw shooting star if active
    if (this.shootingStar) {
      this.updateAndDrawShootingStar(timestamp);
    }
    
    // Star warp hyperspace effect - enabled for final sequence
    if (this.starWarpEnabled || this.starWarpFadeOut) {
      this.drawStarWarp(timestamp);
    }
    
    // Update flash alpha based on animation progress
    if (this.flashStartTime !== null) {
      const elapsed = timestamp - this.flashStartTime;
      const progress = Math.min(elapsed / this.flashDuration, 1);
      
      // Sine easing: 0 → 0.6 → 0
      // Use sin to create a pulse that goes up and down
      this.flashAlpha = Math.sin(progress * Math.PI) * 0.6;
      
      // Clear flash state when animation completes
      if (progress >= 1) {
        this.flashStartTime = null;
        this.flashAlpha = 0;
      }
    }
    
    if (this.flashAlpha > 0) {
      this.drawFlash();
    }
    
    // Draw smoke particles for rocket charging effect
    if (this.smokeEnabled || this.smokeParticles.length > 0) {
      this.updateAndDrawSmoke(timestamp);
    }
    
    // Schedule next frame
    this.rafId = requestAnimationFrame((t) => this.render(t));
  }
  
  /**
   * Handle tab visibility changes to pause/resume RAF
   */
  handleVisibilityChange() {
    this.isVisible = !document.hidden;
  }
  
  /**
   * Stop render loop and clean up resources
   */
  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Clear canvas
    this.clear();
  }
  
  /**
   * Set current scene (will be used by drawing methods)
   */
  setScene(name) {
    const validScenes = ['idle', 'intro', 'grow', 'settle', 'burst', 'spotlight', 'stats', 'fade'];
    if (validScenes.includes(name)) {
      this.scene = name;
      
      // Trigger ring burst animation when entering burst scene
      if (name === 'burst' && this.focusRect) {
        this.initRingBurst();
      }
      
      // Clear particles when scene changes away from 'stats'
      if (name !== 'stats' && this.particles.length > 0) {
        this.particles = [];
      }
    }
  }
  
  /**
   * Set focus rectangle for burst/spotlight targeting
   * @param {DOMRect} rect - Bounding rectangle of target element
   */
  setFocusRect(rect) {
    this.focusRect = rect;
  }
  
  /**
   * Initialize ring burst animation
   * Called when scene changes to 'burst'
   */
  initRingBurst() {
    if (!this.focusRect) {
      return;
    }
    
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    
    // Calculate start radius: max(24, focusRect.width/2)
    const startRadius = Math.max(24, this.focusRect.width / 2);
    
    // Calculate end radius: 0.6 * max(canvas.width, canvas.height)
    const endRadius = 0.6 * Math.max(width, height);
    
    // Store burst animation state
    this.ringBurst = {
      startTime: performance.now(),
      startRadius: startRadius,
      endRadius: endRadius,
      duration: 650 // 650ms duration
    };
  }
  
  /**
   * Draw expanding ring burst effect
   * @param {number} timestamp - Current timestamp from RAF
   */
  drawRingBurst(timestamp) {
    if (!this.ringBurst || !this.focusRect) {
      return;
    }
    
    const elapsed = timestamp - this.ringBurst.startTime;
    const progress = Math.min(elapsed / this.ringBurst.duration, 1);
    
    // Cubic ease-out: 1 - (1 - progress)^3
    const eased = 1 - Math.pow(1 - progress, 3);
    
    // Calculate current radius
    const currentRadius = this.ringBurst.startRadius + 
      (this.ringBurst.endRadius - this.ringBurst.startRadius) * eased;
    
    // Calculate center of focus rect
    const centerX = this.focusRect.left + this.focusRect.width / 2;
    const centerY = this.focusRect.top + this.focusRect.height / 2;
    
    // Save context state
    this.ctx.save();
    
    // Apply additive blending
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Create gradient for stroke color (accent gradient)
    const gradient = this.ctx.createLinearGradient(
      centerX - currentRadius, centerY,
      centerX + currentRadius, centerY
    );
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.8)');  // violet
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.8)');   // blue
    
    // Draw ring
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Restore context state
    this.ctx.restore();
    
    // Clear burst state when animation completes
    if (progress >= 1) {
      this.ringBurst = null;
    }
  }
  
  /**
   * Draw subtle spotlight - soft light cone from button to stats
   * Top width matches button exactly, very subtle illumination
   * Supports animated beam opacity for fade-out effect
   */
  drawSpotlight() {
    if (!this.focusRect) {
      return;
    }
    
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const time = performance.now() * 0.001;
    
    // Spotlight originates from button
    const buttonCenterX = this.focusRect.left + this.focusRect.width / 2;
    const buttonBottomY = this.focusRect.top + this.focusRect.height;
    
    // Spotlight ends just at the stats area (higher up)
    const spotlightEndY = height * 0.55; // Moved up from 0.65
    const spotlightHeight = spotlightEndY - buttonBottomY;
    
    // Calculate reveal progress - spotlight expands from top to bottom
    let revealEndY = spotlightEndY;
    if (this.spotlightRevealProgress < 1) {
      // Spotlight only extends to current reveal progress
      revealEndY = buttonBottomY + (spotlightHeight * this.spotlightRevealProgress);
    }
    
    // Top width narrows as beam fades (creates "closing" effect)
    const fadeProgress = 1 - this.beamOpacity;
    const beamTopWidth = this.focusRect.width * 0.5 * (1 - fadeProgress * 0.8); // Narrows to 20% during fade
    
    // Bottom width scales with reveal progress
    const fullBottomWidth = width * 0.7 * (1 - fadeProgress * 0.5);
    const revealRatio = (revealEndY - buttonBottomY) / spotlightHeight;
    const beamBottomWidth = beamTopWidth + (fullBottomWidth - beamTopWidth) * revealRatio;
    
    this.ctx.save();
    this.ctx.globalAlpha = this.beamOpacity;
    
    // Very gentle wobble (reduces during fade)
    const wobble = Math.sin(time * 0.5) * 1.5 * this.beamOpacity;
    
    // Soft light cone - expands as it reveals
    this.ctx.beginPath();
    this.ctx.moveTo(buttonCenterX - beamTopWidth / 2 + wobble, buttonBottomY);
    this.ctx.lineTo(buttonCenterX + beamTopWidth / 2 + wobble, buttonBottomY);
    this.ctx.lineTo(buttonCenterX + beamBottomWidth / 2, revealEndY);
    this.ctx.lineTo(buttonCenterX - beamBottomWidth / 2, revealEndY);
    this.ctx.closePath();
    
    // Very subtle gradient - barely visible
    const gradient = this.ctx.createLinearGradient(buttonCenterX, buttonBottomY, buttonCenterX, spotlightEndY);
    
    // Soft purple/white tint - very low opacity
    gradient.addColorStop(0, 'rgba(180, 160, 220, 0.06)');
    gradient.addColorStop(0.4, 'rgba(200, 180, 230, 0.04)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.02)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // Very soft glow at stats area
    const glowRadius = beamBottomWidth * 0.5;
    const glowGradient = this.ctx.createRadialGradient(
      buttonCenterX, spotlightEndY - 30, 0,
      buttonCenterX, spotlightEndY - 30, glowRadius
    );
    glowGradient.addColorStop(0, 'rgba(180, 160, 220, 0.05)');
    glowGradient.addColorStop(0.6, 'rgba(180, 160, 220, 0.02)');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = glowGradient;
    this.ctx.fillRect(0, 0, width, height);
    
    this.ctx.restore();
  }
  
  /**
   * Start spotlight reveal animation (top to bottom)
   * Syncs with smoke emission for natural effect
   * @param {number} duration - Reveal duration in milliseconds (default: 1200)
   */
  revealSpotlight(duration = 1200) {
    this.spotlightRevealDuration = duration;
    this.spotlightRevealStart = performance.now();
    this.spotlightRevealing = true;
    this.spotlightRevealProgress = 0;
  }
  
  /**
   * Start beam fade-out animation
   * Smoothly fades and narrows the spotlight beam
   * @param {number} duration - Fade duration in milliseconds (default: 800)
   */
  fadeBeam(duration = 800) {
    this.beamFadeDuration = duration;
    this.beamFadeStartTime = performance.now();
    this.beamFading = true;
  }
  
  /**
   * Reset beam opacity (for restarting animations)
   */
  resetBeam() {
    this.beamOpacity = 1;
    this.beamFading = false;
    this.beamFadeStartTime = null;
  }
  
  /**
   * Draw flash overlay effect
   * Renders full-screen white overlay at current flashAlpha
   */
  drawFlash() {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    
    // Save context state
    this.ctx.save();
    
    // Draw full-screen white overlay
    this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
    this.ctx.fillRect(0, 0, width, height);
    
    // Restore context state
    this.ctx.restore();
  }
  
  /**
   * Trigger flash effect
   * Animates flash alpha from 0 → 0.6 → 0 over 180ms using sine easing
   */
  flash() {
    this.flashStartTime = performance.now();
    this.flashDuration = 180; // 180ms duration
  }
  
  /**
   * Enable/disable smoke particles for rocket charging effect
   * @param {boolean} enabled - Whether to enable or disable smoke
   */
  smoke(enabled) {
    this.smokeEnabled = enabled;
    if (!enabled) {
      // Let existing particles fade out naturally
    }
  }
  
  /**
   * Update and draw smoke particles
   * Creates billowing smoke effect emanating from button during charging
   * @param {number} timestamp - Current timestamp from RAF
   */
  updateAndDrawSmoke(timestamp) {
    if (!this.focusRect) return;
    
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const buttonCenterX = this.focusRect.left + this.focusRect.width / 2;
    const buttonBottomY = this.focusRect.top + this.focusRect.height;
    
    // Calculate spotlight dimensions - responsive to viewport
    const spotlightEndY = height * 0.55; // Where spotlight ends
    const spotlightHeight = spotlightEndY - buttonBottomY;
    const spotlightBottomWidth = width * 0.7; // Spotlight width at bottom
    
    // Emit new particles if smoke is enabled - cone-shaped emission matching spotlight
    if (this.smokeEnabled) {
      for (let i = 0; i < this.smokeEmitRate; i++) {
        // Start particles near center with slight spread
        const startSpread = this.focusRect.width * 0.4;
        const startX = buttonCenterX + (Math.random() - 0.5) * startSpread;
        const startY = buttonBottomY + Math.random() * 20;
        
        // Calculate outward velocity based on spotlight cone expansion
        // Particles need to reach spotlight edges at the bottom
        const distanceFromCenter = startX - buttonCenterX;
        
        // Calculate required outward velocity to fill spotlight cone
        // At the bottom, particles should be at spotlightBottomWidth/2 from center
        const targetOutwardDistance = (spotlightBottomWidth / 2) * 1.2; // 20% beyond edges
        const timeToReachBottom = spotlightHeight / 5; // Approximate time based on downward velocity
        const requiredOutwardVelocity = (targetOutwardDistance / timeToReachBottom) * 0.15;
        
        // Base outward velocity proportional to starting position
        const outwardVelocity = distanceFromCenter * 0.03 + requiredOutwardVelocity;
        
        // Add random variation for natural look
        const extraOutward = (Math.random() - 0.5) * 10;
        
        this.smokeParticles.push({
          x: startX,
          y: startY,
          vx: outwardVelocity + extraOutward, // Viewport-responsive outward velocity
          vy: 3 + Math.random() * 4, // Downward velocity
          size: 20 + Math.random() * 35, // 20-55px - bigger particles for better coverage
          opacity: 0.6 + Math.random() * 0.4, // 0.6-1.0 - varied opacity
          life: 1, // 1 = full life, 0 = dead
          decay: 0.007 + Math.random() * 0.005, // Even slower decay for better coverage
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
          outwardAccel: 0.15 // Strong continuous outward acceleration
        });
      }
    }
    
    // Update and draw particles
    this.ctx.save();
    
    // Ensure smoke draws on top with screen blend for brightness
    this.ctx.globalCompositeOperation = 'screen';
    
    this.smokeParticles = this.smokeParticles.filter(p => {
      // Calculate distance from center for outward expansion
      const centerX = buttonCenterX;
      const dx = p.x - centerX;
      const outwardDirection = dx > 0 ? 1 : -1;
      
      // Apply outward acceleration (cone expansion)
      p.vx += outwardDirection * p.outwardAccel;
      
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // Gravity/acceleration downward
      p.vx *= 0.98; // Less air resistance to maintain outward motion
      p.size += 0.5; // Expand as it falls
      p.life -= p.decay;
      p.rotation += p.rotationSpeed;
      
      // Draw if still alive
      if (p.life > 0) {
        const alpha = p.opacity * p.life;
        
        // Draw smoke puff as soft gradient circle - brighter colors
        const gradient = this.ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
        gradient.addColorStop(0.3, `rgba(220, 220, 230, ${alpha * 0.6})`);
        gradient.addColorStop(0.6, `rgba(180, 180, 200, ${alpha * 0.3})`);
        gradient.addColorStop(1, `rgba(150, 150, 170, 0)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        return true; // Keep particle
      }
      return false; // Remove dead particle
    });
    
    this.ctx.restore();
  }
  
  /**
   * Enable/disable twinkle particles
   * @param {boolean} enabled - Whether to enable or disable particles
   */
  twinkle(enabled) {
    this.twinkleEnabled = enabled;
    
    // Initialize particles when enabling
    if (enabled && this.particles.length === 0) {
      this.initParticles();
    }
    
    // Clear particles when disabling
    if (!enabled) {
      this.particles = [];
    }
  }
  
  /**
   * Initialize particle array with maximum 36 particles at random positions
   */
  initParticles() {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const maxParticles = 36;
    
    this.particles = [];
    
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2, // 1-3px
        phase: Math.random() * Math.PI * 2, // Random starting phase
        period: 2000 + Math.random() * 2000 // 2-4s in milliseconds
      });
    }
  }
  
  /**
   * Draw twinkle particles with sine wave opacity animation
   * @param {number} timestamp - Current timestamp from RAF
   */
  drawTwinkle(timestamp) {
    // Only render particles when scene is 'stats' and twinkleEnabled is true
    if (this.scene !== 'stats' || !this.twinkleEnabled || this.particles.length === 0) {
      return;
    }
    
    // Save context state
    this.ctx.save();
    
    // Apply additive blending
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Draw each particle
    this.particles.forEach(particle => {
      // Calculate opacity using sine wave animation
      // opacity = sin(2π * (timestamp / period) + phase)
      // Map from [-1, 1] to [0, 1]
      const cycleProgress = (timestamp / particle.period) % 1;
      const angle = cycleProgress * Math.PI * 2 + particle.phase;
      const opacity = (Math.sin(angle) + 1) / 2; // Map to 0-1 range
      
      // Draw particle as white circle
      this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    // Restore context state
    this.ctx.restore();
  }
  
  /**
   * Draw ambient glow effect with animated brand colors
   * Creates a beautiful, slowly moving gradient background
   * Renders in intro/grow/settle scenes only - disabled during stats for clean black bg
   */
  drawAmbient() {
    // Skip ambient in fade and stats scenes - keep black background clean
    if (this.scene === 'fade' || this.scene === 'stats' || this.scene === 'spotlight') {
      return;
    }
    
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const time = performance.now() * 0.0003; // Slow animation
    
    // Animated center positions for organic movement
    const centerX1 = width * 0.3 + Math.sin(time) * width * 0.1;
    const centerY1 = height * 0.4 + Math.cos(time * 0.7) * height * 0.1;
    const centerX2 = width * 0.7 + Math.cos(time * 0.8) * width * 0.1;
    const centerY2 = height * 0.6 + Math.sin(time * 0.6) * height * 0.1;
    
    const radius = Math.max(width, height) * 0.6;
    
    // First gradient blob - violet
    const gradient1 = this.ctx.createRadialGradient(
      centerX1, centerY1, 0,
      centerX1, centerY1, radius
    );
    gradient1.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
    gradient1.addColorStop(0.5, 'rgba(168, 85, 247, 0.05)');
    gradient1.addColorStop(1, 'rgba(168, 85, 247, 0)');
    
    this.ctx.fillStyle = gradient1;
    this.ctx.fillRect(0, 0, width, height);
    
    // Second gradient blob - indigo/blue
    const gradient2 = this.ctx.createRadialGradient(
      centerX2, centerY2, 0,
      centerX2, centerY2, radius
    );
    gradient2.addColorStop(0, 'rgba(99, 102, 241, 0.12)');
    gradient2.addColorStop(0.5, 'rgba(99, 102, 241, 0.04)');
    gradient2.addColorStop(1, 'rgba(99, 102, 241, 0)');
    
    this.ctx.fillStyle = gradient2;
    this.ctx.fillRect(0, 0, width, height);
    
    // Third subtle blob - cyan accent (very subtle)
    const centerX3 = width * 0.5 + Math.sin(time * 1.2) * width * 0.15;
    const centerY3 = height * 0.3 + Math.cos(time * 0.9) * height * 0.1;
    
    const gradient3 = this.ctx.createRadialGradient(
      centerX3, centerY3, 0,
      centerX3, centerY3, radius * 0.5
    );
    gradient3.addColorStop(0, 'rgba(6, 182, 212, 0.06)');
    gradient3.addColorStop(1, 'rgba(6, 182, 212, 0)');
    
    this.ctx.fillStyle = gradient3;
    this.ctx.fillRect(0, 0, width, height);
  }
  
  /**
   * Initialize star warp particles for EPIC hyperspace effect
   * Creates MASSIVE amount of stars that streak from center outward
   */
  initStarWarp() {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const count = 400; // MASSIVE number of stars for epic effect
    
    this.starWarpParticles = [];
    
    for (let i = 0; i < count; i++) {
      // Random angle from center
      const angle = Math.random() * Math.PI * 2;
      // Random distance from center (start close)
      const distance = Math.random() * 80 + 10;
      
      this.starWarpParticles.push({
        angle: angle,
        distance: distance,
        speed: 4 + Math.random() * 12, // MUCH faster speeds for intense warp
        size: 0.8 + Math.random() * 2.5, // Larger, more visible streaks
        brightness: 0.5 + Math.random() * 0.5, // Brighter stars
        // Color variation: white, blue-white, purple-white
        hue: Math.random() > 0.7 ? (Math.random() > 0.5 ? 240 : 270) : 0,
        saturation: Math.random() > 0.7 ? 60 : 0
      });
    }
    
    this.starWarpStartTime = performance.now();
  }
  
  /**
   * Enable/disable star warp effect
   * @param {boolean} enabled - Whether to enable or disable
   */
  starWarp(enabled) {
    this.starWarpEnabled = enabled;
    
    if (enabled) {
      this.initStarWarp();
      this.starWarpFadeOut = false;
    } else {
      // Start fade out instead of immediate stop
      this.starWarpFadeOut = true;
      this.starWarpFadeStart = performance.now();
    }
  }
  
  /**
   * Draw EPIC star warp hyperspace effect
   * MASSIVE amount of stars streak outward creating intense warp speed illusion
   * @param {number} timestamp - Current timestamp from RAF
   */
  drawStarWarp(timestamp) {
    if (this.starWarpParticles.length === 0) {
      return;
    }
    
    // Handle fade out
    let globalOpacity = 1;
    if (this.starWarpFadeOut) {
      const fadeElapsed = timestamp - this.starWarpFadeStart;
      const fadeDuration = 500; // 500ms fade out
      globalOpacity = Math.max(0, 1 - fadeElapsed / fadeDuration);
      
      // Clear particles when fade complete
      if (globalOpacity <= 0) {
        this.starWarpParticles = [];
        this.starWarpStartTime = null;
        this.starWarpFadeOut = false;
        return;
      }
    }
    
    // Skip if not enabled and not fading
    if (!this.starWarpEnabled && !this.starWarpFadeOut) {
      return;
    }
    
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY) * 1.5;
    
    // Calculate INTENSE acceleration over time (exponential ramp-up)
    const elapsed = timestamp - this.starWarpStartTime;
    const acceleration = Math.min(Math.pow(elapsed / 800, 2), 6); // Exponential ramp, max 6x speed
    
    this.ctx.save();
    this.ctx.globalAlpha = globalOpacity;
    
    // Add additive blending for intense glow effect
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Draw subtle center warp tunnel glow
    const tunnelGlow = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150);
    tunnelGlow.addColorStop(0, `rgba(150, 130, 180, ${0.15 * acceleration / 6})`);
    tunnelGlow.addColorStop(0.5, `rgba(120, 70, 180, ${0.08 * acceleration / 6})`);
    tunnelGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = tunnelGlow;
    this.ctx.fillRect(0, 0, width, height);
    
    this.starWarpParticles.forEach(star => {
      // Update distance with INTENSE acceleration
      star.distance += star.speed * (1 + acceleration * 2);
      
      // Reset star if it goes off screen
      if (star.distance > maxDistance) {
        star.distance = Math.random() * 30 + 5;
        star.angle = Math.random() * Math.PI * 2;
      }
      
      // Calculate current position
      const x = centerX + Math.cos(star.angle) * star.distance;
      const y = centerY + Math.sin(star.angle) * star.distance;
      
      // Calculate previous position for LONG streak
      const streakLength = star.speed * (3 + acceleration * 3);
      const prevDistance = star.distance - streakLength;
      const prevX = centerX + Math.cos(star.angle) * Math.max(prevDistance, 0);
      const prevY = centerY + Math.sin(star.angle) * Math.max(prevDistance, 0);
      
      // Reduced opacity for subtler effect
      const distanceRatio = star.distance / maxDistance;
      const opacity = Math.min(distanceRatio * 1.5, 1) * star.brightness * (0.4 + acceleration / 15);
      
      // Draw streak line with darker, subtler colors
      const gradient = this.ctx.createLinearGradient(prevX, prevY, x, y);
      
      if (star.hue === 0) {
        // Dimmer white/gray streaks
        gradient.addColorStop(0, `rgba(180, 180, 200, 0)`);
        gradient.addColorStop(0.3, `rgba(200, 200, 220, ${opacity * 0.2})`);
        gradient.addColorStop(1, `rgba(220, 220, 240, ${opacity * 0.6})`);
      } else {
        // Darker colored streaks (blue or purple tint)
        gradient.addColorStop(0, `hsla(${star.hue}, ${star.saturation}%, 50%, 0)`);
        gradient.addColorStop(0.3, `hsla(${star.hue}, ${star.saturation}%, 60%, ${opacity * 0.2})`);
        gradient.addColorStop(1, `hsla(${star.hue}, ${star.saturation}%, 70%, ${opacity * 0.6})`);
      }
      
      this.ctx.strokeStyle = gradient;
      // Thinner lines for subtler effect
      this.ctx.lineWidth = star.size * (1.2 + distanceRatio * 1.5 + acceleration * 0.3);
      this.ctx.lineCap = 'round';
      
      this.ctx.beginPath();
      this.ctx.moveTo(prevX, prevY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      
      // Subtle outer glow only for brightest stars at high acceleration
      if (star.brightness > 0.8 && acceleration > 3) {
        this.ctx.strokeStyle = star.hue === 0 
          ? `rgba(200, 200, 220, ${opacity * 0.15})` 
          : `hsla(${star.hue}, ${star.saturation}%, 65%, ${opacity * 0.15})`;
        this.ctx.lineWidth = star.size * (2 + distanceRatio * 2);
        this.ctx.beginPath();
        this.ctx.moveTo(prevX, prevY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
      }
    });
    
    this.ctx.restore();
  }
  
  /**
   * Draw vignette effect darkening edges
   * Alpha adjusts based on scene: 0.4 for grow/settle, 0.2 for others
   */
  drawVignette() {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) * 0.7;
    
    // Determine vignette intensity based on scene
    const isIntenseScene = this.scene === 'grow' || this.scene === 'settle';
    const vignetteAlpha = isIntenseScene ? 0.4 : 0.2;
    
    // Create radial gradient from center (transparent) to edges (dark)
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, radius * 0.3,
      centerX, centerY, radius
    );
    
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteAlpha})`);
    
    // Fill canvas with vignette
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }
  
  /**
   * Draw stats text on canvas - crisp at any scale
   * @param {number} timestamp - Current timestamp from RAF
   */
  drawStats(timestamp) {
    if (!this.statsData) return;
    
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    
    this.ctx.save();
    this.ctx.globalAlpha = this.statsOpacity;
    
    // Apply warp transformation if warping
    if (this.statsWarping && this.statsWarpProgress > 0) {
      // Translate to center for transformation origin
      this.ctx.translate(centerX, centerY);
      
      // Apply horizontal stretch (warp effect)
      this.ctx.scale(this.statsWarpStretch, 1);
      
      // Apply perspective-like skew as text warps away
      const skewAmount = this.statsWarpProgress * 0.3;
      this.ctx.transform(1, 0, skewAmount, 1, 0, 0);
      
      // Translate back
      this.ctx.translate(-centerX, -centerY);
    }
    
    // Calculate font size based on viewport width and scale
    // At scale 1.0, text fills about 70% of viewport width
    // Scale grows from 0.6 to 1.8 over 8 seconds
    const baseFontSize = width * 0.018 * this.statsScale;
    const labelFontSize = Math.max(10, Math.min(baseFontSize, 80));
    const numberFontSize = labelFontSize;
    const spacing = labelFontSize * 1.5;
    
    // Create gradient for text - EXACT match to hero text gradient
    // Matches: bg-gradient-to-r from-purple-400 to-indigo-500
    const gradientWidth = width * 0.4;
    const textGradient = this.ctx.createLinearGradient(
      centerX - gradientWidth, centerY,
      centerX + gradientWidth, centerY
    );
    textGradient.addColorStop(0, '#c084fc'); // purple-400 (from)
    textGradient.addColorStop(1, '#6366f1'); // indigo-500 (to)
    
    // Apply glow if enabled
    if (this.statsGlow) {
      this.ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
      this.ctx.shadowBlur = labelFontSize * 0.8;
    } else {
      this.ctx.shadowBlur = 0;
    }
    
    // Build the full text string to measure
    const items = this.statsData;
    
    // Set font and measure total width
    this.ctx.font = `600 ${labelFontSize}px Inter, system-ui, sans-serif`;
    
    // Calculate total width of all items
    let totalWidth = 0;
    items.forEach((item, i) => {
      totalWidth += this.ctx.measureText(item.label).width;
      this.ctx.font = `700 ${numberFontSize}px Inter, system-ui, sans-serif`;
      totalWidth += this.ctx.measureText(item.value.toString()).width;
      this.ctx.font = `600 ${labelFontSize}px Inter, system-ui, sans-serif`;
      if (this.statsShowPlus) {
        totalWidth += this.ctx.measureText('+').width;
      }
      if (i < items.length - 1) {
        totalWidth += spacing;
      }
    });
    
    // Draw each stat item - centered horizontally
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    let x = centerX - totalWidth / 2;
    
    items.forEach((item, i) => {
      // Label (gradient)
      this.ctx.font = `600 ${labelFontSize}px Inter, system-ui, sans-serif`;
      this.ctx.fillStyle = textGradient;
      this.ctx.fillText(item.label, x, centerY);
      x += this.ctx.measureText(item.label).width;
      
      // Number (white)
      this.ctx.font = `700 ${numberFontSize}px Inter, system-ui, sans-serif`;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(item.value.toString(), x, centerY);
      x += this.ctx.measureText(item.value.toString()).width;
      
      // Plus sign (gradient, only if flashing - with opacity)
      if (this.statsShowPlus && this.statsPlusOpacity > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = this.statsOpacity * this.statsPlusOpacity;
        this.ctx.font = `600 ${labelFontSize}px Inter, system-ui, sans-serif`;
        this.ctx.fillStyle = textGradient;
        // Add glow effect to plus signs when flashing
        this.ctx.shadowColor = 'rgba(168, 85, 247, 0.9)';
        this.ctx.shadowBlur = labelFontSize * 0.5;
        this.ctx.fillText('+', x, centerY);
        this.ctx.restore();
        x += this.ctx.measureText('+').width;
      }
      
      // Add spacing between items
      if (i < items.length - 1) {
        x += spacing;
      }
    });
    
    this.ctx.restore();
  }
  
  /**
   * Show stats on canvas with optional grow animation
   * @param {Array} data - Array of {label, value} objects
   * @param {boolean} grow - Whether to animate scale growth
   */
  showStats(data, grow = false) {
    this.statsData = data;
    this.statsEnabled = true;
    this.statsOpacity = 0;
    this.statsFadingIn = true;
    this.statsFadeStart = performance.now();
    this.statsScale = this.statsStartScale; // Start at static size (1.0)
    this.statsShowPlus = false;  // Plus signs hidden by default
    this.statsPlusOpacity = 0;
    this.statsScaling = false; // Don't start growing yet
  }
  
  /**
   * Start the stats growth animation (call after rocket launches)
   * Uses very smooth easing for buttery animation
   */
  startStatsGrowth() {
    this.statsScaling = true;
    this.statsScaleStart = performance.now();
  }
  
  /**
   * Flash plus signs during counter animation
   * @param {number} duration - Flash duration in ms
   */
  flashPlusSigns(duration = 800) {
    this.statsPlusFlashing = true;
    this.statsPlusFlashStart = performance.now();
    this.statsPlusFlashDuration = duration;
    this.statsShowPlus = true;
  }
  
  /**
   * Start fading in the space background from black
   * @param {number} duration - Fade duration in ms (default 3000)
   */
  fadeInBackground(duration = 3000) {
    this.backgroundFadeDuration = duration;
    this.backgroundFadeStart = performance.now();
    this.backgroundFadingIn = true;
    this.backgroundOpacity = 0;
  }
  
  /**
   * Start the UFO beam animation (descend → hold → retract)
   */
  startUfoBeam() {
    this.ufoBeamActive = true;
    this.ufoBeamPhase = 'descending';
    this.ufoBeamStartTime = performance.now();
    this.ufoBeamProgress = 0;
  }
  
  /**
   * Draw the UFO light beam effect
   * Cone of light from button down to stats area
   */
  drawUfoBeam() {
    if (!this.focusRect) return;
    
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    
    // Beam originates from button
    const buttonCenterX = this.focusRect.left + this.focusRect.width / 2;
    const buttonBottomY = this.focusRect.top + this.focusRect.height;
    
    // Beam extends down based on progress
    const maxBeamLength = height * 0.5;
    const currentBeamLength = maxBeamLength * this.ufoBeamProgress;
    const beamEndY = buttonBottomY + currentBeamLength;
    
    // Beam width expands as it descends
    const topWidth = this.focusRect.width * 0.6;
    const bottomWidth = topWidth + currentBeamLength * 0.8;
    
    this.ctx.save();
    
    // Draw the beam cone
    this.ctx.beginPath();
    this.ctx.moveTo(buttonCenterX - topWidth / 2, buttonBottomY);
    this.ctx.lineTo(buttonCenterX + topWidth / 2, buttonBottomY);
    this.ctx.lineTo(buttonCenterX + bottomWidth / 2, beamEndY);
    this.ctx.lineTo(buttonCenterX - bottomWidth / 2, beamEndY);
    this.ctx.closePath();
    
    // Gradient for UFO beam - ethereal blue/purple
    const gradient = this.ctx.createLinearGradient(buttonCenterX, buttonBottomY, buttonCenterX, beamEndY);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
    gradient.addColorStop(0.3, 'rgba(139, 92, 246, 0.2)');
    gradient.addColorStop(0.7, 'rgba(99, 102, 241, 0.15)');
    gradient.addColorStop(1, 'rgba(200, 200, 255, 0.05)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // Add glow at the bottom of the beam
    if (this.ufoBeamProgress > 0.3) {
      const glowRadius = bottomWidth * 0.4;
      const glowGradient = this.ctx.createRadialGradient(
        buttonCenterX, beamEndY, 0,
        buttonCenterX, beamEndY, glowRadius
      );
      glowGradient.addColorStop(0, `rgba(200, 180, 255, ${0.3 * this.ufoBeamProgress})`);
      glowGradient.addColorStop(0.5, `rgba(168, 85, 247, ${0.15 * this.ufoBeamProgress})`);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = glowGradient;
      this.ctx.fillRect(buttonCenterX - glowRadius, beamEndY - glowRadius * 0.5, glowRadius * 2, glowRadius);
    }
    
    // Subtle beam edge glow
    this.ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 * this.ufoBeamProgress})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  /**
   * Trigger a flyby rocket effect (button flies across screen in background)
   */
  triggerFlybyRocket() {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    
    // Random angle - diagonal across screen
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -50 : width + 50;
    const startY = height * 0.2 + Math.random() * height * 0.3;
    const endX = fromLeft ? width + 50 : -50;
    const endY = height * 0.1 + Math.random() * height * 0.2;
    
    this.flybyRocket = {
      startX,
      startY,
      endX,
      endY,
      progress: 0,
      duration: 1500 + Math.random() * 500, // 1.5-2 seconds
      startTime: performance.now(),
      size: 8 + Math.random() * 4 // 8-12px
    };
  }
  
  /**
   * Update and draw the flyby rocket
   */
  updateAndDrawFlybyRocket(timestamp) {
    if (!this.flybyRocket) return;
    
    const rocket = this.flybyRocket;
    const elapsed = timestamp - rocket.startTime;
    const progress = Math.min(elapsed / rocket.duration, 1);
    
    // Current position
    const x = rocket.startX + (rocket.endX - rocket.startX) * progress;
    const y = rocket.startY + (rocket.endY - rocket.startY) * progress;
    
    // Calculate angle of travel
    const angle = Math.atan2(rocket.endY - rocket.startY, rocket.endX - rocket.startX);
    
    // Fade in/out
    let alpha = 1;
    if (progress < 0.1) alpha = progress / 0.1;
    if (progress > 0.8) alpha = (1 - progress) / 0.2;
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    
    // Draw rocket trail
    const trailGradient = this.ctx.createLinearGradient(-60, 0, 0, 0);
    trailGradient.addColorStop(0, 'rgba(255, 150, 50, 0)');
    trailGradient.addColorStop(0.5, `rgba(255, 100, 30, ${alpha * 0.5})`);
    trailGradient.addColorStop(1, `rgba(255, 200, 100, ${alpha * 0.8})`);
    
    this.ctx.beginPath();
    this.ctx.moveTo(-60, 0);
    this.ctx.lineTo(0, -rocket.size * 0.3);
    this.ctx.lineTo(0, rocket.size * 0.3);
    this.ctx.closePath();
    this.ctx.fillStyle = trailGradient;
    this.ctx.fill();
    
    // Draw rocket body (small glowing dot)
    const bodyGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, rocket.size);
    bodyGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    bodyGlow.addColorStop(0.3, `rgba(168, 85, 247, ${alpha * 0.8})`);
    bodyGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
    
    this.ctx.fillStyle = bodyGlow;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, rocket.size, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
    
    // Clear when done
    if (progress >= 1) {
      this.flybyRocket = null;
    }
  }
  
  /**
   * Enable/disable glow effect on stats
   * @param {boolean} enabled - Whether glow is enabled
   */
  setStatsGlow(enabled) {
    this.statsGlow = enabled;
  }
  
  /**
   * Update a stat value (for counter animation)
   * @param {number} index - Index of stat to update
   * @param {number} value - New value
   */
  updateStatValue(index, value) {
    if (this.statsData && this.statsData[index]) {
      this.statsData[index].value = value;
    }
  }
  
  /**
   * Hide plus signs from stats display
   */
  hidePlusSigns() {
    this.statsShowPlus = false;
    this.statsPlusOpacity = 0;
  }
  
  /**
   * Hide stats from canvas
   */
  hideStats() {
    this.statsEnabled = false;
    this.statsData = null;
  }
  
  /**
   * Start stats warp-off animation (hyperspace transition)
   * Stats stretch and tear away as we enter hyperspace
   * @param {number} duration - Warp duration in milliseconds (default: 1500)
   */
  warpOffStats(duration = 1500) {
    this.statsWarping = true;
    this.statsWarpStart = performance.now();
    this.statsWarpDuration = duration;
    this.statsWarpProgress = 0;
  }
  
  /**
   * Trigger a shooting star across the screen
   * Streaks diagonally from upper area to lower area
   */
  shootingStarEffect() {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    
    // Start from upper left/right area, streak diagonally
    const startFromLeft = Math.random() > 0.5;
    const startX = startFromLeft ? width * 0.1 + Math.random() * width * 0.3 : width * 0.6 + Math.random() * width * 0.3;
    const startY = height * 0.05 + Math.random() * height * 0.2;
    
    // End point - opposite side, lower
    const endX = startFromLeft ? width * 0.7 + Math.random() * width * 0.25 : width * 0.05 + Math.random() * width * 0.25;
    const endY = height * 0.4 + Math.random() * height * 0.3;
    
    this.shootingStar = {
      startX,
      startY,
      endX,
      endY,
      progress: 0,
      duration: 800 + Math.random() * 400, // 800-1200ms
      startTime: performance.now(),
      tailLength: 80 + Math.random() * 60 // 80-140px tail
    };
  }
  
  /**
   * Update and draw the shooting star
   * @param {number} timestamp - Current timestamp from RAF
   */
  updateAndDrawShootingStar(timestamp) {
    if (!this.shootingStar) return;
    
    const star = this.shootingStar;
    const elapsed = timestamp - star.startTime;
    const progress = Math.min(elapsed / star.duration, 1);
    
    // Current position along the path
    const currentX = star.startX + (star.endX - star.startX) * progress;
    const currentY = star.startY + (star.endY - star.startY) * progress;
    
    // Calculate tail start position (behind the star)
    const tailProgress = Math.max(0, progress - 0.15);
    const tailX = star.startX + (star.endX - star.startX) * tailProgress;
    const tailY = star.startY + (star.endY - star.startY) * tailProgress;
    
    // Fade in at start, fade out at end
    let alpha = 1;
    if (progress < 0.1) {
      alpha = progress / 0.1;
    } else if (progress > 0.7) {
      alpha = (1 - progress) / 0.3;
    }
    
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    
    // Draw the glowing tail
    const gradient = this.ctx.createLinearGradient(tailX, tailY, currentX, currentY);
    gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
    gradient.addColorStop(0.3, `rgba(200, 180, 255, ${alpha * 0.3})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.7})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);
    
    this.ctx.beginPath();
    this.ctx.moveTo(tailX, tailY);
    this.ctx.lineTo(currentX, currentY);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
    
    // Draw outer glow
    this.ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.4})`;
    this.ctx.lineWidth = 6;
    this.ctx.stroke();
    
    // Draw bright head of the shooting star
    const headGlow = this.ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 8);
    headGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    headGlow.addColorStop(0.5, `rgba(200, 180, 255, ${alpha * 0.5})`);
    headGlow.addColorStop(1, `rgba(168, 85, 247, 0)`);
    
    this.ctx.fillStyle = headGlow;
    this.ctx.beginPath();
    this.ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
    
    // Clear shooting star when animation completes
    if (progress >= 1) {
      this.shootingStar = null;
    }
  }
  
  /**
   * Enable/disable electric static border effect
   * @param {boolean} enabled - Whether to enable the effect
   */
  electric(enabled) {
    this.electricEnabled = enabled;
    if (!enabled) {
      this.electricBolts = [];
    }
  }
  
  /**
   * Update and draw electric static border effect
   * Sparse, thin, flashy lightning strands along viewport edges
   * @param {number} timestamp - Current timestamp from RAF
   */
  updateAndDrawElectric(timestamp) {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    
    // Spawn multiple strands at once, more frequently for visibility
    if (timestamp - this.electricLastSpawn > this.electricSpawnRate) {
      this.electricLastSpawn = timestamp;
      
      // Spawn 2-3 strands at once (slower)
      const strandCount = 2 + Math.floor(Math.random() * 2);
      
      for (let s = 0; s < strandCount; s++) {
        // Random edge: 0=top, 1=right, 2=bottom, 3=left
        const edge = Math.floor(Math.random() * 4);
        let startX, startY, direction;
        
        // 30% chance this strand whips inward into the screen
        const whipsInward = Math.random() < 0.3;
        
        switch (edge) {
          case 0: // Top edge
            startX = Math.random() * width;
            startY = 2;
            direction = Math.random() > 0.5 ? 1 : -1;
            break;
          case 1: // Right edge
            startX = width - 2;
            startY = Math.random() * height;
            direction = Math.random() > 0.5 ? 1 : -1;
            break;
          case 2: // Bottom edge
            startX = Math.random() * width;
            startY = height - 2;
            direction = Math.random() > 0.5 ? 1 : -1;
            break;
          case 3: // Left edge
            startX = 2;
            startY = Math.random() * height;
            direction = Math.random() > 0.5 ? 1 : -1;
            break;
        }
        
        // Create bolt with segments
        const segmentCount = whipsInward ? (8 + Math.floor(Math.random() * 10)) : (15 + Math.floor(Math.random() * 20));
        const segments = [];
        let x = startX;
        let y = startY;
        
        for (let i = 0; i < segmentCount; i++) {
          const segmentLength = 8 + Math.random() * 20;
          const jitter = (Math.random() - 0.5) * 18;
          
          if (whipsInward) {
            // Whip inward toward center of screen
            if (edge === 0) {
              x += direction * segmentLength * 0.3;
              y += segmentLength; // Move down into screen
            } else if (edge === 2) {
              x += direction * segmentLength * 0.3;
              y -= segmentLength; // Move up into screen
            } else if (edge === 1) {
              x -= segmentLength; // Move left into screen
              y += direction * segmentLength * 0.3;
            } else {
              x += segmentLength; // Move right into screen
              y += direction * segmentLength * 0.3;
            }
            // Add jitter
            x += jitter * 0.3;
            y += jitter * 0.3;
          } else {
            // Normal edge-following behavior
            if (edge === 0 || edge === 2) {
              x += direction * segmentLength;
              y += jitter * 0.5;
            } else {
              y += direction * segmentLength;
              x += jitter * 0.5;
            }
            
            // Keep strands visible along edges
            if (edge === 0) y = Math.max(2, Math.min(50, y));
            if (edge === 2) y = Math.max(height - 50, Math.min(height - 2, y));
            if (edge === 1) x = Math.max(width - 50, Math.min(width - 2, x));
            if (edge === 3) x = Math.max(2, Math.min(50, x));
          }
          
          segments.push({ x, y });
        }
        
        this.electricBolts.push({
          segments,
          life: 1,
          decay: 0.03 + Math.random() * 0.04,
          thickness: 1 + Math.random() * 1.5,
          brightness: 1.0,
          flicker: Math.random() * Math.PI * 2,
          edge: edge,
          whipsInward: whipsInward
        });
      }
    }
    
    // Draw and update bolts
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen'; // Bright additive blend
    
    this.electricBolts = this.electricBolts.filter(bolt => {
      bolt.life -= bolt.decay;
      
      if (bolt.life <= 0) return false;
      
      // Intense flickering effect
      const flicker = 0.6 + 0.4 * Math.sin(performance.now() * 0.08 + bolt.flicker);
      const alpha = Math.min(1, bolt.life * bolt.brightness * flicker * 1.5);
      
      // Draw outer glow first (behind)
      this.ctx.beginPath();
      this.ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
      for (let i = 1; i < bolt.segments.length; i++) {
        this.ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
      }
      this.ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.4})`;
      this.ctx.lineWidth = bolt.thickness * 6;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
      
      // Draw middle glow
      this.ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.7})`;
      this.ctx.lineWidth = bolt.thickness * 3;
      this.ctx.stroke();
      
      // Draw bright white/purple core
      this.ctx.strokeStyle = `rgba(255, 220, 255, ${alpha})`;
      this.ctx.lineWidth = bolt.thickness;
      this.ctx.stroke();
      
      // Spawn visible branch strands
      if (Math.random() < 0.12 && bolt.segments.length > 4) {
        const branchIndex = Math.floor(Math.random() * (bolt.segments.length - 2)) + 1;
        const branchStart = bolt.segments[branchIndex];
        
        this.ctx.beginPath();
        this.ctx.moveTo(branchStart.x, branchStart.y);
        
        let bx = branchStart.x;
        let by = branchStart.y;
        const branchCount = 3 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < branchCount; i++) {
          bx += (Math.random() - 0.5) * 20;
          by += (Math.random() - 0.5) * 20;
          this.ctx.lineTo(bx, by);
        }
        
        // Branch glow
        this.ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.5})`;
        this.ctx.lineWidth = bolt.thickness * 2;
        this.ctx.stroke();
        
        // Branch core
        this.ctx.strokeStyle = `rgba(220, 180, 255, ${alpha * 0.8})`;
        this.ctx.lineWidth = bolt.thickness * 0.7;
        this.ctx.stroke();
      }
      
      return true;
    });
    
    this.ctx.restore();
  }
}

/**
 * Null object pattern for graceful degradation
 */
function createNullCanvas() {
  return {
    setScene: () => {},
    setFocusRect: () => {},
    showStats: () => {},
    setStatsGlow: () => {},
    updateStatValue: () => {},
    hidePlusSigns: () => {},
    hideStats: () => {},
    flash: () => {},
    twinkle: () => {},
    starWarp: () => {},
    resize: () => {},
    stop: () => {}
  };
}

/**
 * Factory function to create canvas engine with error handling
 * @param {HTMLCanvasElement} canvasEl - Canvas element
 * @param {Object} options - Configuration options
 * @returns {CanvasEngine|Object} Canvas engine instance or null object
 */
export function createCineCanvas(canvasEl, options = {}) {
  if (!canvasEl) {
    console.error('[cine] Canvas element not found');
    return createNullCanvas();
  }
  
  const ctx = canvasEl.getContext('2d');
  if (!ctx) {
    console.error('[cine] Failed to get 2D context');
    return createNullCanvas();
  }
  
  return new CanvasEngine(canvasEl, ctx, options);
}
