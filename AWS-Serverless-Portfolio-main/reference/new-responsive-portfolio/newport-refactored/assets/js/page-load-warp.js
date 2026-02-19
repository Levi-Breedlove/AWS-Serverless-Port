/**
 * Page Load Fade-In Effect
 * Simple fade-in animation when landing on the main page
 */

(function() {
  // Clear any hash on initial page load to prevent auto-scrolling
  if (window.location.hash && !sessionStorage.getItem('allowHash')) {
    history.replaceState(null, '', window.location.pathname);
  }
  
  // Add CSS to hide body initially and set up transition
  const style = document.createElement('style');
  style.textContent = `
    body {
      opacity: 0;
      transition: opacity 0.8s ease-out;
    }
    body.loaded {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
  
  // Ensure page starts at top
  window.scrollTo(0, 0);
  
  // Fade in when DOM is ready
  function fadeIn() {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      document.body.classList.add('loaded');
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fadeIn);
  } else {
    fadeIn();
  }
})();
