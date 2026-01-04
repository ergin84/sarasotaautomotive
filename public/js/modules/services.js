// Services Module
import { API_BASE } from './constants.js';
import { escapeHtml } from './utils.js';
import { openImageLightbox } from './lightbox.js';
import { showPage } from './navigation.js';

export async function loadPublicServices() {
    try {
        const response = await fetch(`${API_BASE}/services`);
        if (!response.ok) {
            throw new Error('Failed to load services');
        }
        const services = await response.json();
        displayPublicServices(services);
    } catch (error) {
        console.error('Error loading services:', error);
        const servicesGrid = document.getElementById('servicesGrid');
        if (servicesGrid) {
            servicesGrid.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; width: 100%; padding: 2rem;">Unable to load services. Please try again later.</p>';
        }
    }
}

function displayPublicServices(services) {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;

    if (services.length === 0) {
        servicesGrid.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; width: 100%; padding: 2rem;">No services available at the moment.</p>';
        return;
    }

    servicesGrid.innerHTML = services.map(service => {
        const mainImageUrl = service.mainImage || (service.images && service.images.length > 0 ? service.images[0] : null);
        const hasImage = !!mainImageUrl;
        
        return `
        <div class="service-card" onclick="window.showServiceDetail('${service._id}')">
            <div class="service-image">
                ${hasImage ? `
                    <img src="${escapeHtml(mainImageUrl)}" alt="${escapeHtml(service.title)}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                ` : `
                    <i class="${escapeHtml(service.icon || 'fas fa-cog')}" style="font-size: 48px; color: var(--accent-color);"></i>
                `}
            </div>
            <div class="service-content">
                <h3 class="service-title">${escapeHtml(service.title)}</h3>
                <p class="service-subtitle">${escapeHtml(service.shortDescription)}</p>
            </div>
        </div>
    `}).join('');
}

export async function showServiceDetail(serviceId) {
    try {
        const response = await fetch(`${API_BASE}/services/${serviceId}`);
        if (!response.ok) {
            throw new Error('Service not found');
        }

        const service = await response.json();
        
        showPage('service-detail');
        
        const images = service.images && service.images.length > 0 ? service.images : [];
        const mainImage = service.mainImage || (images.length > 0 ? images[0] : null);
        
        const mainImageEl = document.getElementById('serviceDetailMainImage');
        if (mainImageEl && mainImage) {
            mainImageEl.src = mainImage;
            mainImageEl.loading = 'eager';
        }
        
        const titleEl = document.getElementById('serviceDetailTitle');
        if (titleEl) {
            titleEl.textContent = service.title || 'Service';
        }
        
        const descEl = document.getElementById('serviceDetailDescription');
        if (descEl) {
            descEl.innerHTML = `<p>${(service.fullDescription || '').replace(/\n/g, '<br>')}</p>`;
        }
        
        if (images.length > 1) {
            const thumbsContainer = document.getElementById('serviceDetailThumbnails');
            if (thumbsContainer) {
                thumbsContainer.innerHTML = images.map((img, index) => `
                    <button type="button" class="service-detail-thumb ${index === 0 ? 'active' : ''}" 
                            data-image="${escapeHtml(img)}" 
                            onclick="window.switchServiceImage('${escapeHtml(img)}')"
                            aria-label="View image ${index + 1}">
                        <img src="${escapeHtml(img)}" alt="Service thumbnail ${index + 1}" onerror="this.src='/images/no-image.svg'">
                    </button>
                `).join('');
            }
        }
        
        if (mainImageEl && images.length > 0) {
            mainImageEl.style.cursor = 'pointer';
            mainImageEl.onclick = () => openImageLightbox(images, images.indexOf(mainImage));
        }
        
    } catch (error) {
        console.error('Error loading service detail:', error);
        alert('Error loading service details');
    }
}

export function switchServiceImage(imageUrl) {
    const mainImageEl = document.getElementById('serviceDetailMainImage');
    if (mainImageEl) {
        mainImageEl.src = imageUrl;
    }
    
    document.querySelectorAll('.service-detail-thumb').forEach(thumb => {
        if (thumb.getAttribute('data-image') === imageUrl) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}
