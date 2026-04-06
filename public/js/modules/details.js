// Car/Service Detail Modals Module
import { API_BASE } from './constants.js';
import { escapeHtml } from './utils.js';
import { formatCarStatus, formatCurrency, showPage, updateActiveNavForPage } from './navigation.js';
import { openImageLightbox } from './lightbox.js';

export async function showCarDetails(carId, type) {
    try {
        const response = await fetch(`${API_BASE}/cars/${carId}`);
        if (!response.ok) {
            throw new Error('Car not found');
        }

        const car = await response.json();
        const modal = document.getElementById('carModal');
        const detailsContainer = document.getElementById('carDetailContent');

        if (!modal || !detailsContainer) {
            return;
        }

        const carBrand = car.brand || car.make || '';
        const carModel = car.model || '';
        const carYear = car.year || '';
        const carTitle = `${carYear ? `${carYear} ` : ''}${carBrand} ${carModel}`.trim() || 'Vehicle Details';

        const rawImages = Array.isArray(car.images) ? car.images.filter(Boolean) : [];
        if (car.image && rawImages.length === 0) {
            rawImages.push(car.image);
        }
        const images = rawImages.length > 0 ? rawImages : ['/images/no-image.svg'];

        const specs = [];
        const registrationYear = car.firstRegistrationDate ? (() => {
            const date = new Date(car.firstRegistrationDate);
            return Number.isFinite(date.getTime()) ? date.getFullYear() : null;
        })() : null;
        const hasCarValue = value => value !== null && value !== undefined && value !== '';

        if (hasCarValue(car.mileage)) specs.push({ label: 'Mileage', value: `${Number(car.mileage).toLocaleString()} miles` });
        if (hasCarValue(car.gearbox)) specs.push({ label: 'Gearbox', value: car.gearbox });
        if (hasCarValue(car.fuelType)) specs.push({ label: 'Fuel Type', value: car.fuelType });
        if (hasCarValue(car.power)) specs.push({ label: 'Power', value: `${car.power} HP` });
        if (hasCarValue(registrationYear)) specs.push({ label: 'First Registration', value: registrationYear });
        if (hasCarValue(car.modelVersion)) specs.push({ label: 'Model Version', value: car.modelVersion });
        if (hasCarValue(car.year)) specs.push({ label: 'Year', value: car.year });

        const optionsHtml = Array.isArray(car.vehicleOptions) && car.vehicleOptions.length > 0
            ? `<div class="car-spec-grid car-options-grid">
                    <div class="car-spec-item car-options-item">
                        <span class="car-spec-label">Options</span>
                        <ul class="car-options-list">
                            ${car.vehicleOptions.map(option => `<li>${escapeHtml(option)}</li>`).join('')}
                        </ul>
                    </div>
               </div>`
            : '';

        const specGridHtml = specs.length
            ? `<div class="car-spec-grid">
                ${specs.map(spec => `
                    <div class="car-spec-item">
                        <span class="car-spec-label">${escapeHtml(spec.label)}</span>
                        <span class="car-spec-value">${escapeHtml(String(spec.value))}</span>
                    </div>
                `).join('')}
            </div>`
            : '';

        const thumbnailsHtml = images.length > 1
            ? `<div class="car-detail-thumbnails">
                    ${images.map((imgUrl, index) => `
                        <button type="button" class="car-detail-thumb ${index === 0 ? 'active' : ''}" data-image="${escapeHtml(imgUrl)}" data-index="${index}" aria-label="View image ${index + 1}">
                            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(`${carTitle} thumbnail ${index + 1}`)}" onerror="this.src='/images/no-image.svg'">
                        </button>
                    `).join('')}
               </div>`
            : '';

        const formattedPrice = type === 'rent'
            ? `${formatCurrency(car.dailyRate)}/day`
            : formatCurrency(car.price);

        const requestIntro = type === 'rent'
            ? 'Let us know your preferred dates and we will confirm availability.'
            : 'Share your contact details and we will get back to you with more information.';

        const rentDateFields = type === 'rent'
            ? `
                <div class="request-form-row">
                    <input type="date" name="startDate" required>
                    <input type="date" name="endDate" required>
                </div>
                <div class="request-form-row">
                    <label for="fuelLevel" style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.9); font-size: 0.9rem;">Fuel Level at Rental Start</label>
                    <select name="fuelLevel" id="fuelLevel" required style="width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; color: var(--text-white);">
                        <option value="">Select fuel level</option>
                        <option value="Empty">Empty</option>
                        <option value="1/4">1/4 Full</option>
                        <option value="1/2">1/2 Full</option>
                        <option value="3/4">3/4 Full</option>
                        <option value="Full">Full</option>
                    </select>
                </div>
            `
            : '';

        const messagePlaceholder = type === 'rent'
            ? 'Tell us about your rental needs (optional)'
            : 'Let us know how we can help (optional)';

        const descriptionHtml = car.description
            ? `<div class="car-detail-description">${escapeHtml(car.description).replace(/\n/g, '<br>')}</div>`
            : '';

        detailsContainer.innerHTML = `
            <div class="car-detail-layout">
                <div class="car-detail-gallery">
                    <div class="car-detail-main-image">
                        <img src="${escapeHtml(images[0])}" alt="${escapeHtml(carTitle)}" id="carDetailMainImage" onerror="this.src='/images/no-image.svg'">
                    </div>
                    ${thumbnailsHtml}
                </div>
                <div class="car-detail-info">
                    <div class="car-detail-header">
                        <div class="car-detail-meta">
                            <span class="car-detail-badge">${type === 'rent' ? 'Rental car' : 'Vehicle for sale'}</span>
                            <span class="car-detail-badge status-${car.status || 'unknown'}">${formatCarStatus(car.status)}</span>
                        </div>
                        <h2 class="car-detail-title">${escapeHtml(carTitle)}</h2>
                        <div class="car-detail-price">
                            ${escapeHtml(formattedPrice)}
                            <span>${type === 'rent' ? 'per day' : 'asking price'}</span>
                        </div>
                    </div>
                    ${specGridHtml}
                    ${optionsHtml}
                    ${descriptionHtml}
                    <div class="car-request-actions">
                        <button class="btn-primary" id="openRequestFormBtn">Request Information</button>
                        <div class="car-request-success" id="carRequestSuccess"></div>
                        <div class="car-request-error" id="carRequestError"></div>
                        <div class="car-request-panel" id="carRequestPanel">
                            <h3>Send us your request</h3>
                            <p>${escapeHtml(requestIntro)}</p>
                            <form id="carRequestForm" class="car-request-form" novalidate>
                                <input type="hidden" name="carId" value="${escapeHtml(carId)}">
                                <input type="hidden" name="requestType" value="${escapeHtml(type)}">
                                <div class="request-form-row">
                                    <input type="text" name="clientName" placeholder="Your Name" required>
                                    <input type="email" name="clientEmail" placeholder="Your Email" required>
                                </div>
                                <div class="request-form-row">
                                    <input type="tel" name="clientPhone" placeholder="Your Phone" required>
                                </div>
                                ${rentDateFields}
                                <textarea name="message" rows="4" placeholder="${escapeHtml(messagePlaceholder)}"></textarea>
                                <button type="submit" class="btn-primary">Send Request</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const mainImage = detailsContainer.querySelector('#carDetailMainImage');
        const thumbnails = detailsContainer.querySelectorAll('.car-detail-thumb');

        let currentImageIndex = 0;

        const updateMainImage = (newImage) => {
            if (mainImage && newImage) {
                mainImage.src = newImage;
                currentImageIndex = images.indexOf(newImage);
            }
            thumbnails.forEach(btn => {
                if (btn.getAttribute('data-image') === newImage) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        };

        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const newImage = thumb.getAttribute('data-image');
                updateMainImage(newImage);
            });
        });

        if (mainImage) {
            mainImage.addEventListener('click', () => {
                openImageLightbox(images, currentImageIndex);
            });
        }

        const requestButton = detailsContainer.querySelector('#openRequestFormBtn');
        const requestPanel = detailsContainer.querySelector('#carRequestPanel');
        const requestForm = detailsContainer.querySelector('#carRequestForm');
        const successAlert = detailsContainer.querySelector('#carRequestSuccess');
        const errorAlert = detailsContainer.querySelector('#carRequestError');

        if (requestButton && requestPanel) {
            requestButton.addEventListener('click', () => {
                requestPanel.classList.toggle('active');
                if (requestPanel.classList.contains('active')) {
                    requestPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }

        if (requestForm) {
            requestForm.addEventListener('submit', (event) => {
                event.preventDefault();
                submitCarRequest(requestForm, successAlert, errorAlert);
            });
        }

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading car details:', error);
        alert('Error loading car details');
    }
}

export async function showServiceDetail(serviceId) {
    try {
        console.log('showServiceDetail called with:', serviceId);
        const response = await fetch(`${API_BASE}/services/${serviceId}`);
        console.log('API response:', response);
        if (!response.ok) {
            throw new Error('Service not found');
        }

        const service = await response.json();
        console.log('Service data:', service);

        const titleElement = document.getElementById('serviceDetailTitle');
        const imagesElement = document.getElementById('serviceDetailImages');
        const shortElement = document.getElementById('serviceDetailShort');
        const fullElement = document.getElementById('serviceDetailFull');
        const relatedElement = document.getElementById('relatedServicesGrid');
        const relatedSection = document.getElementById('relatedServicesSection');

        if (!titleElement) {
            console.error('Service detail elements not found');
            return;
        }

        titleElement.textContent = service.title;
        if (shortElement) {
            shortElement.textContent = service.shortDescription;
        }
        if (fullElement) {
            fullElement.innerHTML = service.fullDescription;
        }

        const allImages = [];
        if (service.mainImage && !allImages.includes(service.mainImage)) {
            allImages.push(service.mainImage);
        }
        if (service.images && Array.isArray(service.images)) {
            service.images.forEach(img => {
                if (img && !allImages.includes(img)) {
                    allImages.push(img);
                }
            });
        }

        let imagesHtml = '';
        if (allImages.length > 0) {
            imagesHtml += `<img src="${allImages[0]}" alt="${service.title}" class="service-detail-image service-detail-main-image" style="cursor: pointer;" onerror="this.src='/images/no-image.svg'">`;

            if (allImages.length > 1) {
                imagesHtml += `<div class="service-detail-thumbnails">`;
                allImages.forEach((img, index) => {
                    imagesHtml += `<img src="${img}" alt="${service.title} ${index + 1}" class="service-detail-thumbnail" data-index="${index}" onerror="this.src='/images/no-image.svg'">`;
                });
                imagesHtml += `</div>`;
            }
        } else {
            imagesHtml = `<img src="/images/no-image.svg" alt="${service.title}" class="service-detail-image">`;
        }

        if (imagesElement) {
            imagesElement.innerHTML = imagesHtml;

            const mainImage = imagesElement.querySelector('.service-detail-main-image');
            const thumbnails = imagesElement.querySelectorAll('.service-detail-thumbnail');

            if (mainImage) {
                mainImage.addEventListener('click', () => {
                    openImageLightbox(allImages, 0);
                });
            }

            thumbnails.forEach(thumb => {
                thumb.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'), 10);
                    openImageLightbox(allImages, index);
                });
            });
        }

        if (relatedElement) {
            try {
                const allServicesResponse = await fetch(`${API_BASE}/services`);
                if (allServicesResponse.ok) {
                    const allServices = await allServicesResponse.json();
                    const relatedServices = allServices.filter(s => s._id !== serviceId).slice(0, 3);

                    if (relatedServices.length > 0 && relatedSection) {
                        relatedSection.style.display = 'block';
                        relatedElement.innerHTML = relatedServices.map(relService => {
                            const relMainImage = relService.mainImage || (relService.images && relService.images.length > 0 ? relService.images[0] : '/images/no-image.svg');
                            return `
                            <div class="service-card" onclick="showServiceDetail('${relService._id}');" style="cursor: pointer;">
                                ${relMainImage ? `<img src="${relMainImage}" alt="${relService.title}" class="service-image" onerror="this.src='/images/no-image.svg'">` : ''}
                                <div class="service-card-content">
                                    <div class="service-icon">
                                        <i class="${relService.icon || 'fas fa-cog'}"></i>
                                    </div>
                                    <h3 class="service-title">${relService.title}</h3>
                                    <p class="service-description">${relService.shortDescription}</p>
                                </div>
                            </div>
                            `;
                        }).join('');
                    } else if (relatedSection) {
                        relatedSection.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Error loading related services:', error);
            }
        }

        console.log('About to call showPage with service-detail');
        showPage('service-detail');
        console.log('showPage called, current page:', 'service-detail');
        updateActiveNavForPage('services');
    } catch (error) {
        console.error('Error loading service details:', error);
        alert('Error loading service details');
    }
}

export async function submitCarRequest(formElement, successAlert, errorAlert) {
    if (!formElement) return;

    if (successAlert) {
        successAlert.textContent = '';
        successAlert.classList.remove('visible');
    }
    if (errorAlert) {
        errorAlert.textContent = '';
        errorAlert.classList.remove('visible');
    }

    const formData = new FormData(formElement);
    const payload = {
        carId: (formData.get('carId') || '').trim(),
        requestType: (formData.get('requestType') || '').trim(),
        clientName: (formData.get('clientName') || '').trim(),
        clientEmail: (formData.get('clientEmail') || '').trim(),
        clientPhone: (formData.get('clientPhone') || '').trim(),
        message: (formData.get('message') || '').trim()
    };

    if (!payload.carId || !payload.requestType) {
        if (errorAlert) {
            errorAlert.textContent = 'Missing request details. Please reload and try again.';
            errorAlert.classList.add('visible');
        }
        return;
    }

    if (!payload.clientName || !payload.clientEmail || !payload.clientPhone) {
        if (errorAlert) {
            errorAlert.textContent = 'Please provide your name, email, and phone number.';
            errorAlert.classList.add('visible');
        }
        return;
    }

    if (payload.requestType === 'rent') {
        const startDate = (formData.get('startDate') || '').trim();
        const endDate = (formData.get('endDate') || '').trim();

        if (!startDate || !endDate) {
            if (errorAlert) {
                errorAlert.textContent = 'Please select both a start and end date.';
                errorAlert.classList.add('visible');
            }
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            if (errorAlert) {
                errorAlert.textContent = 'Start date must be before the end date.';
                errorAlert.classList.add('visible');
            }
            return;
        }

        payload.startDate = startDate;
        payload.endDate = endDate;
    }

    try {
        const response = await fetch(`${API_BASE}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            if (successAlert) {
                successAlert.textContent = 'Thank you! Your request has been sent.';
                successAlert.classList.add('visible');
            }

            const requestTypeField = formElement.querySelector('input[name="requestType"]');
            const carIdField = formElement.querySelector('input[name="carId"]');
            const savedType = requestTypeField ? requestTypeField.value : payload.requestType;
            const savedCarId = carIdField ? carIdField.value : payload.carId;

            formElement.reset();

            if (requestTypeField) requestTypeField.value = savedType;
            if (carIdField) carIdField.value = savedCarId;

            const requestPanel = formElement.closest('.car-request-panel');
            if (requestPanel) {
                requestPanel.classList.remove('active');
            }
        } else {
            let errorData = {};
            let rawBody = '';
            try {
                rawBody = await response.text();
                errorData = rawBody ? JSON.parse(rawBody) : {};
            } catch {
                errorData = {};
            }
            console.error('Request submission failed:', {
                status: response.status,
                statusText: response.statusText,
                body: rawBody || '(no body)'
            });
            if (errorAlert) {
                const errorMessage = errorData.message || errorData.error || `Unable to submit your request. Server responded with status ${response.status}.`;
                errorAlert.textContent = errorMessage;
                errorAlert.classList.add('visible');
            }
        }
    } catch (error) {
        console.error('Error submitting request:', error);
        if (errorAlert) {
            errorAlert.textContent = 'Unable to submit your request. Please try again later.';
            errorAlert.classList.add('visible');
        }
    }
}

// Global window assignments for onclick handlers
window.showCarDetails = showCarDetails;
window.showServiceDetail = showServiceDetail;
