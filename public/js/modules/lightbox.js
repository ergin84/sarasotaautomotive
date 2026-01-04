// Lightbox Module

// State
let currentLightboxIndex = 0;
let lightboxImages = [];

// Open lightbox
function openImageLightbox(images, startIndex = 0) {
    lightboxImages = images || [];
    currentLightboxIndex = startIndex;
    const lightbox = document.getElementById('imageLightbox');
    
    if (lightbox && lightboxImages.length > 0) {
        updateLightboxImage();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close lightbox
function closeLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Update lightbox image
function updateLightboxImage() {
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');
    
    if (lightboxImage && lightboxImages.length > 0) {
        lightboxImage.src = lightboxImages[currentLightboxIndex];
        lightboxImage.alt = `Car image ${currentLightboxIndex + 1} of ${lightboxImages.length}`;
        
        if (lightboxCounter) {
            lightboxCounter.textContent = `${currentLightboxIndex + 1} of ${lightboxImages.length}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = currentLightboxIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = currentLightboxIndex === lightboxImages.length - 1;
        }
    }
}

// Next image
function nextLightboxImage() {
    if (currentLightboxIndex < lightboxImages.length - 1) {
        currentLightboxIndex++;
        updateLightboxImage();
    }
}

// Previous image
function prevLightboxImage() {
    if (currentLightboxIndex > 0) {
        currentLightboxIndex--;
        updateLightboxImage();
    }
}

// Initialize lightbox controls
function initializeLightbox() {
    console.log('initializeLightbox called');
    // Close button
    const closeBtn = document.getElementById('lightboxCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
        console.log('Close button listener added');
    }
    
    // Navigation buttons
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', prevLightboxImage);
        console.log('Prev button listener added');
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', nextLightboxImage);
        console.log('Next button listener added');
    }
    
    // Click outside to close
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
        console.log('Lightbox click listener added');
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('imageLightbox');
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                prevLightboxImage();
            } else if (e.key === 'ArrowRight') {
                nextLightboxImage();
            }
        }
    });
    console.log('Keyboard navigation added');
}

// Make functions globally available
window.openImageLightbox = openImageLightbox;
window.closeLightbox = closeLightbox;
window.nextLightboxImage = nextLightboxImage;
window.prevLightboxImage = prevLightboxImage;
window.initializeLightbox = initializeLightbox;

console.log('Lightbox module loaded');
