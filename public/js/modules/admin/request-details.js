// Admin Request Details Module
import { appState, API_BASE, REQUEST_STATUS_OPTIONS } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { formatRequestStatusLabel, formatCurrency } from '../navigation.js';
import { handleApiResponse } from '../auth.js';
// loadClientRequests is called via window to break circular dependency
// (requests.js → calendar.js → request-details.js → requests.js)

export async function showRequestDetails(requestId, requestType = 'rent') {
    if (!appState.authToken) {
        alert('You need to be logged in to view request details.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load request details');
        }

        const request = await response.json();
        const car = request.carId || {};
        const carNameParts = [
            car.year,
            car.brand || car.make,
            car.model
        ].filter(Boolean);
        const carName = carNameParts.length ? carNameParts.join(' ') : 'Vehicle removed';
        const submittedAt = request.createdAt ? new Date(request.createdAt).toLocaleString() : '—';
        const rentalDates = requestType === 'rent' && request.startDate && request.endDate
            ? `${new Date(request.startDate).toLocaleDateString()} → ${new Date(request.endDate).toLocaleDateString()}`
            : null;

        const normalizedStatus = ['new', 'contacted', 'ongoing', 'accepted', 'rejected', 'closed'].includes(request.status)
            ? request.status
            : (request.status === 'pending' ? 'new' : request.status === 'completed' ? 'closed' : 'new');
        const statusLabel = formatRequestStatusLabel(normalizedStatus);
        const statusOptions = REQUEST_STATUS_OPTIONS.map(option => `
            <option value="${option.value}" ${option.value === normalizedStatus ? 'selected' : ''}>
                ${option.label}
            </option>
        `).join('');

        const messageHtml = request.message
            ? `<div class="request-message">${escapeHtml(request.message).replace(/\n/g, '<br>')}</div>`
            : '';

        let basePrice = null;
        let totalPrice = null;
        let rentalDays = 0;

        if (requestType === 'rent' && request.startDate && request.endDate) {
            const start = new Date(request.startDate);
            const end = new Date(request.endDate);
            rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            if (request.customPrice !== null && request.customPrice !== undefined) {
                basePrice = request.customPrice;
            } else if (car.dailyRate) {
                basePrice = car.dailyRate * rentalDays;
            }

            if (basePrice !== null) {
                const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
                totalPrice = basePrice - discountAmount;
            }
        } else if (requestType === 'sale') {
            if (request.customPrice !== null && request.customPrice !== undefined) {
                basePrice = request.customPrice;
            } else if (car.price) {
                basePrice = car.price;
            }

            if (basePrice !== null) {
                const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
                totalPrice = basePrice - discountAmount;
            }
        }

        const priceHtml = totalPrice !== null
            ? `<div class="request-price-section">
                <div class="request-price-header">
                    <h3 class="request-section-title">${requestType === 'rent' ? 'Rental' : 'Sale'} Price Breakdown</h3>
                    <p class="price-section-description">Adjust the ${requestType === 'rent' ? 'rental' : 'sale'} price or apply a discount as needed.</p>
                </div>

                <div class="price-calculation-flow">
                    ${requestType === 'rent' ? `
                    <div class="price-calculation-step">
                        <div class="price-step-label">
                            <span class="price-step-icon">1</span>
                            <span>Daily Rate</span>
                        </div>
                        <div class="price-step-value" data-price-daily-rate="${request._id}" data-value="${car.dailyRate || 0}">${formatCurrency(car.dailyRate || 0)}<span class="price-unit">/day</span></div>
                    </div>

                    <div class="price-calculation-step">
                        <div class="price-step-label">
                            <span class="price-step-icon">2</span>
                            <span>Rental Period</span>
                        </div>
                        <div class="price-step-value" data-price-days="${request._id}" data-value="${rentalDays}">${rentalDays} <span class="price-unit">days</span></div>
                    </div>

                    <div class="price-calculation-arrow">×</div>
                    ` : `
                    <div class="price-calculation-step">
                        <div class="price-step-label">
                            <span class="price-step-icon">1</span>
                            <span>Asking Price</span>
                        </div>
                        <div class="price-step-value" data-price-asking="${request._id}" data-value="${car.price || 0}">${formatCurrency(car.price || 0)}</div>
                    </div>
                    `}

                    <div class="price-calculation-step price-step-base">
                        <div class="price-step-label">
                            <span class="price-step-icon">${requestType === 'rent' ? '3' : '2'}</span>
                            <span>Base Price</span>
                        </div>
                        <div class="price-step-value" data-price-base="${request._id}">${formatCurrency(basePrice)}</div>
                        ${request.customPrice !== null && request.customPrice !== undefined
                            ? `<div class="price-step-note">(Custom price set)</div>`
                            : requestType === 'rent'
                                ? `<div class="price-step-note">(${formatCurrency(car.dailyRate || 0)} × ${rentalDays} days)</div>`
                                : `<div class="price-step-note">(Original asking price)</div>`
                        }
                    </div>

                    ${request.discountPercent && request.discountPercent > 0 ? `
                    <div class="price-calculation-arrow">−</div>
                    <div class="price-calculation-step price-step-discount" id="discount-step-${request._id}">
                        <div class="price-step-label">
                            <span class="price-step-icon">4</span>
                            <span>Discount (${request.discountPercent}%)</span>
                        </div>
                        <div class="price-step-value discount-amount" data-price-discount="${request._id}">-${formatCurrency(basePrice * (request.discountPercent / 100))}</div>
                    </div>
                    ` : `<div class="price-calculation-arrow" id="discount-arrow-${request._id}" style="display: none;">−</div>
                    <div class="price-calculation-step price-step-discount" id="discount-step-${request._id}" style="display: none;">
                        <div class="price-step-label">
                            <span class="price-step-icon">4</span>
                            <span>Discount (<span id="discount-percent-label-${request._id}">0</span>%)</span>
                        </div>
                        <div class="price-step-value discount-amount" data-price-discount="${request._id}">-$0.00</div>
                    </div>`}

                    <div class="price-calculation-arrow price-arrow-final">=</div>

                    <div class="price-calculation-step price-step-total">
                        <div class="price-step-label">
                            <span class="price-step-icon">✓</span>
                            <span>Total Amount</span>
                        </div>
                        <div class="price-step-value price-total-large" data-price-total="${request._id}">${formatCurrency(totalPrice)}</div>
                    </div>
                </div>

                <div class="price-adjustment-section">
                    <h4 class="price-adjustment-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        Price Adjustments
                    </h4>
                    <div class="price-adjustment-controls">
                        <div class="price-input-group">
                            <label for="customPrice-${request._id}">
                                <span>Override Total Price</span>
                                <small>Leave empty to use calculated price</small>
                            </label>
                            <div class="price-input-wrapper">
                                <span class="price-input-prefix">$</span>
                                <input
                                    type="number"
                                    id="customPrice-${request._id}"
                                    class="price-input"
                                    placeholder="Auto-calculated"
                                    value="${request.customPrice !== null && request.customPrice !== undefined ? request.customPrice : ''}"
                                    step="0.01"
                                    min="0"
                                    onchange="updateRequestPrice('${request._id}', this.value, document.getElementById('discountPercent-${request._id}').value)"
                                >
                                ${request.customPrice !== null && request.customPrice !== undefined
                                    ? `<button class="btn-clear-price" onclick="clearCustomPrice('${request._id}')" title="Reset to calculated price">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>`
                                    : ''
                                }
                            </div>
                        </div>
                        <div class="price-input-group">
                            <label for="discountPercent-${request._id}">
                                <span>Apply Discount</span>
                                <small>Percentage discount (0-100%)</small>
                            </label>
                            <div class="price-input-wrapper">
                                <input
                                    type="number"
                                    id="discountPercent-${request._id}"
                                    class="price-input"
                                    placeholder="0"
                                    value="${request.discountPercent || 0}"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    onchange="updateRequestPrice('${request._id}', document.getElementById('customPrice-${request._id}').value, this.value)"
                                >
                                <span class="price-input-suffix">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`
            : '';

        const photos = request.photos || [];
        const photosHtml = photos.length > 0
            ? `<div class="request-photos-section">
                <h4 class="request-section-title">Damage Photos</h4>
                <div class="request-photos-grid" id="requestPhotosGrid-${request._id}">
                    ${photos.map((photo, idx) => `
                        <div class="request-photo-item">
                            <img src="${photo}" alt="Damage photo ${idx + 1}" class="request-photo" onerror="this.style.display='none'">
                            <button class="request-photo-delete" onclick="deleteRequestPhoto('${request._id}', '${idx}')" title="Delete photo">&times;</button>
                        </div>
                    `).join('')}
                </div>
            </div>`
            : '';

        const modalHtml = `
            <div class="request-detail-modal">
                <div class="request-detail-content">
                    <span class="close-request-modal">&times;</span>
                    <div class="request-card">
                        <div class="request-card-header">
                            <div class="request-card-title">
                                <span class="request-car-name">${escapeHtml(carName)}</span>
                                <span class="request-type-badge ${requestType}">${requestType === 'rent' ? 'Rental request' : 'Sale request'}</span>
                            </div>
                            <span class="request-status-badge ${normalizedStatus}">${escapeHtml(statusLabel)}</span>
                        </div>
                        <div class="request-meta-grid">
                            <div class="request-meta-item">
                                <span class="request-meta-label">Client</span>
                                <span class="request-meta-value">${escapeHtml(request.clientName)}</span>
                            </div>
                            <div class="request-meta-item">
                                <span class="request-meta-label">Email</span>
                                <span class="request-meta-value">${escapeHtml(request.clientEmail)}</span>
                            </div>
                            <div class="request-meta-item">
                                <span class="request-meta-label">Phone</span>
                                <span class="request-meta-value">${escapeHtml(request.clientPhone)}</span>
                            </div>
                            <div class="request-meta-item">
                                <span class="request-meta-label">Submitted</span>
                                <span class="request-meta-value">${escapeHtml(submittedAt)}</span>
                            </div>
                            ${rentalDates ? `
                                <div class="request-meta-item">
                                    <span class="request-meta-label">Rental window</span>
                                    <span class="request-meta-value">${escapeHtml(rentalDates)}</span>
                                </div>` : ''}
                            ${requestType === 'rent' && request.fuelLevel ? `
                                <div class="request-meta-item">
                                    <span class="request-meta-label">Fuel Level (at start)</span>
                                    <span class="request-meta-value">${escapeHtml(request.fuelLevel)}</span>
                                </div>` : ''}
                        </div>
                        ${messageHtml}
                        ${priceHtml}

                        ${requestType === 'rent' ? `
                        <div class="request-fuel-section">
                            <label class="request-section-title" for="fuelLevel-${request._id}">Fuel Level at Rental Start</label>
                            <select
                                id="fuelLevel-${request._id}"
                                class="request-fuel-select"
                                onchange="updateFuelLevel('${request._id}', this.value)"
                            >
                                <option value="" ${!request.fuelLevel ? 'selected' : ''}>Not recorded</option>
                                <option value="Empty" ${request.fuelLevel === 'Empty' ? 'selected' : ''}>Empty</option>
                                <option value="1/4" ${request.fuelLevel === '1/4' ? 'selected' : ''}>1/4 Full</option>
                                <option value="1/2" ${request.fuelLevel === '1/2' ? 'selected' : ''}>1/2 Full</option>
                                <option value="3/4" ${request.fuelLevel === '3/4' ? 'selected' : ''}>3/4 Full</option>
                                <option value="Full" ${request.fuelLevel === 'Full' ? 'selected' : ''}>Full</option>
                            </select>
                        </div>
                        ` : ''}

                        <div class="request-notes-section">
                            <label class="request-section-title" for="requestNotes-${request._id}">Notes</label>
                            <textarea
                                id="requestNotes-${request._id}"
                                class="request-notes-textarea"
                                placeholder="Add notes about this rental request..."
                                onblur="saveRequestNotes('${request._id}', this.value)"
                            >${escapeHtml(request.notes || '')}</textarea>
                        </div>

                        <div class="request-photos-upload-section">
                            <div class="request-photos-header">
                                <h4 class="request-section-title">Damage Photos</h4>
                                <label for="requestPhotoUpload-${request._id}" class="btn-camera" title="Take or upload photos">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                    </svg>
                                    Add Photos
                                </label>
                                <input
                                    type="file"
                                    id="requestPhotoUpload-${request._id}"
                                    class="request-photo-upload-input"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    style="display: none;"
                                    onchange="uploadRequestPhotos('${request._id}', this.files)"
                                >
                            </div>
                            ${photosHtml}
                        </div>

                        <div class="request-actions">
                            <label for="status-${request._id}">Update status</label>
                            <select id="status-${request._id}" class="request-status-select" onchange="updateRequestStatus('${request._id}', this.value)">
                                ${statusOptions}
                            </select>
                            ${normalizedStatus === 'accepted' ? `
                                <button class="btn-primary btn-print-contract" onclick="printContract('${request._id}', '${requestType}')" title="Print/Download Contract">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                        <rect x="6" y="14" width="12" height="8"></rect>
                                    </svg>
                                    Print Contract
                                </button>
                            ` : ''}
                            <button class="btn-delete" onclick="deleteRequest('${request._id}', '${requestType}')">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('requestDetailModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'requestDetailModal';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.close-request-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    } catch (error) {
        console.error('Error loading request details:', error);
        alert('Error loading request details. Please try again.');
    }
}

export async function uploadRequestPhotos(requestId, files) {
    if (!files || files.length === 0) return;

    if (!appState.authToken) {
        alert('You need to be logged in to upload photos.');
        return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i]);
    }

    try {
        const response = await fetch(`${API_BASE}/upload/rental-photos/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.authToken}`
            },
            body: formData
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            const data = await response.json();

            const updateResponse = await fetch(`${API_BASE}/admin/requests/${requestId}/photos`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${appState.authToken}`
                },
                body: JSON.stringify({ photos: data.urls })
            });

            if (updateResponse.ok) {
                const requestType = 'rent';
                showRequestDetails(requestId, requestType);
            } else {
                alert('Photos uploaded but failed to save to request. Please refresh.');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Error uploading photos');
        }
    } catch (error) {
        console.error('Error uploading photos:', error);
        alert('Error uploading photos');
    }
}

export async function deleteRequestPhoto(requestId, photoIndex) {
    if (!appState.authToken) {
        alert('You need to be logged in to delete photos.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/photos/${photoIndex}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${appState.authToken}`
            }
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            showRequestDetails(requestId, 'rent');
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Error deleting photo');
        }
    } catch (error) {
        console.error('Error deleting photo:', error);
        alert('Error deleting photo');
    }
}

export async function saveRequestNotes(requestId, notes) {
    if (!appState.authToken) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/notes`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.authToken}`
            },
            body: JSON.stringify({ notes })
        });

        if (!response.ok) {
            console.error('Failed to save notes');
        }
    } catch (error) {
        console.error('Error saving notes:', error);
    }
}

export async function updateRequestPrice(requestId, customPrice, discountPercent) {
    if (!appState.authToken) {
        return;
    }

    try {
        const priceValue = customPrice === '' || customPrice === null || customPrice === undefined
            ? null
            : parseFloat(customPrice);
        const discountValue = discountPercent === '' || discountPercent === null || discountPercent === undefined
            ? 0
            : parseFloat(discountPercent);

        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/price`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.authToken}`
            },
            body: JSON.stringify({
                customPrice: priceValue,
                discountPercent: discountValue
            })
        });

        if (response.ok) {
            updatePriceDisplay(requestId, priceValue, discountValue);

            const requestType = document.querySelector('.request-type-badge.rent') ? 'rent' : 'sale';
            if (requestType && window._loadClientRequests) {
                window._loadClientRequests(requestType);
            }

            setTimeout(() => {
                showRequestDetails(requestId, requestType || 'rent');
            }, 100);
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Error updating price');
        }
    } catch (error) {
        console.error('Error updating price:', error);
        alert('Error updating price. Please try again.');
    }
}

export function updatePriceDisplay(requestId, customPrice, discountPercent) {
    const dailyRateEl = document.querySelector(`[data-price-daily-rate="${requestId}"]`);
    const daysEl = document.querySelector(`[data-price-days="${requestId}"]`);
    const askingPriceEl = document.querySelector(`[data-price-asking="${requestId}"]`);
    const basePriceEl = document.querySelector(`[data-price-base="${requestId}"]`);
    const discountEl = document.querySelector(`[data-price-discount="${requestId}"]`);
    const totalPriceEl = document.querySelector(`[data-price-total="${requestId}"]`);

    let basePrice;
    if (dailyRateEl && daysEl) {
        const dailyRate = parseFloat(dailyRateEl.dataset.value || 0);
        const days = parseInt(daysEl.dataset.value || 0);
        basePrice = customPrice !== null && customPrice !== undefined ? customPrice : (dailyRate * days);
    } else if (askingPriceEl) {
        const askingPrice = parseFloat(askingPriceEl.dataset.value || 0);
        basePrice = customPrice !== null && customPrice !== undefined ? customPrice : askingPrice;
    } else {
        return;
    }

    const discount = parseFloat(discountPercent || 0);
    const discountAmount = basePrice * (discount / 100);
    const totalPrice = basePrice - discountAmount;

    if (basePriceEl) {
        basePriceEl.textContent = formatCurrency(basePrice);
        const noteEl = basePriceEl.parentElement.querySelector('.price-step-note');
        if (noteEl) {
            if (customPrice !== null && customPrice !== undefined) {
                noteEl.textContent = '(Custom price set)';
            } else if (dailyRateEl && daysEl) {
                const dailyRate = parseFloat(dailyRateEl.dataset.value || 0);
                const days = parseInt(daysEl.dataset.value || 0);
                noteEl.textContent = `(${formatCurrency(dailyRate)} × ${days} days)`;
            } else {
                noteEl.textContent = '(Original asking price)';
            }
        }
    }

    const discountStep = document.getElementById(`discount-step-${requestId}`);
    const discountArrow = document.getElementById(`discount-arrow-${requestId}`);

    if (discount > 0) {
        if (discountStep) {
            discountStep.style.display = 'flex';
            if (discountEl) {
                discountEl.textContent = `-${formatCurrency(discountAmount)}`;
            }
            const discountLabel = discountStep.querySelector('.price-step-label');
            const discountPercentLabel = document.getElementById(`discount-percent-label-${requestId}`);
            if (discountLabel) {
                discountLabel.innerHTML = `<span class="price-step-icon">4</span><span>Discount (${discount}%)</span>`;
            }
            if (discountPercentLabel) {
                discountPercentLabel.textContent = discount;
            }
        }
        if (discountArrow) {
            discountArrow.style.display = 'flex';
        }
    } else {
        if (discountStep) {
            discountStep.style.display = 'none';
        }
        if (discountArrow) {
            discountArrow.style.display = 'none';
        }
    }

    if (totalPriceEl) {
        totalPriceEl.textContent = formatCurrency(totalPrice);
    }
}

export async function clearCustomPrice(requestId) {
    if (!appState.authToken) {
        return;
    }

    const discountInput = document.getElementById(`discountPercent-${requestId}`);
    const discountValue = discountInput ? discountInput.value : 0;

    await updateRequestPrice(requestId, null, discountValue);
}

export async function printContract(requestId, requestType = 'rent') {
    if (!appState.authToken) {
        alert('You need to be logged in to print contracts.');
        return;
    }

    try {
        const endpoint = requestType === 'rent'
            ? `${API_BASE}/admin/requests/${requestId}/contract/pdf`
            : `${API_BASE}/admin/requests/${requestId}/sales-contract/pdf`;
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${appState.authToken}`
            }
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            const htmlContent = await response.text();

            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                alert('Please allow popups to view the contract, or use the download option.');
                const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rental-contract-${requestId}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                return;
            }

            printWindow.document.write(htmlContent);
            printWindow.document.close();

            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            };
        } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Error response:', errorText);
            alert('Error generating contract. Please try again.');
        }
    } catch (error) {
        console.error('Error generating contract:', error);
        alert('Error generating contract. Please check your connection and try again.');
    }
}

export async function updateFuelLevel(requestId, fuelLevel) {
    if (!appState.authToken) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/fuel-level`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.authToken}`
            },
            body: JSON.stringify({ fuelLevel })
        });

        if (response.ok) {
            const requestType = document.querySelector('.request-type-badge.rent') ? 'rent' : 'sale';
            setTimeout(() => {
                showRequestDetails(requestId, requestType || 'rent');
            }, 100);
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Error updating fuel level');
        }
    } catch (error) {
        console.error('Error updating fuel level:', error);
        alert('Error updating fuel level. Please try again.');
    }
}

export async function printRentalContract(requestId) {
    return printContract(requestId, 'rent');
}

// Global window assignments for onclick handlers
window.uploadRequestPhotos = uploadRequestPhotos;
window.deleteRequestPhoto = deleteRequestPhoto;
window.saveRequestNotes = saveRequestNotes;
window.printContract = printContract;
window.printRentalContract = printRentalContract;
window.updateRequestPrice = updateRequestPrice;
window.clearCustomPrice = clearCustomPrice;
window.updateFuelLevel = updateFuelLevel;
