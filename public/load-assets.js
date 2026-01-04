// Automatic asset loader - switches between dev and minified assets
(function() {
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const useMinified = !isDev && typeof USE_MINIFIED !== 'undefined' ? USE_MINIFIED : !isDev;
    
    if (useMinified) {
        // Load minified assets for production
        const stylesheet = document.getElementById('main-stylesheet');
        if (stylesheet && stylesheet.href.includes('styles.css')) {
            stylesheet.href = stylesheet.href.replace('styles.css', 'styles.min.css');
        }
        
        const script = document.createElement('script');
        script.src = '/app.min.js';
        script.defer = true;
        document.head.appendChild(script);
    } else {
        // Load regular assets for development
        const script = document.createElement('script');
        script.src = '/app.js';
        script.defer = true;
        document.head.appendChild(script);
    }
})();
