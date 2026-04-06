// Admin Requests Module
import { appState, API_BASE, REQUEST_STATUS_OPTIONS, REQUESTS_PER_PAGE } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { formatRequestStatusLabel, formatCurrency } from '../navigation.js';
import { handleApiResponse } from '../auth.js';
import { showCustomConfirm } from '../modals.js';
import { loadDashboardStats } from './dashboard.js';
import { loadRentalCalendarView } from './calendar.js';
import { showRequestDetails } from './request-details.js';

export async function loadClientRequests(targetType = 'all') {
    if (!appState.authToken) return;

    const typesToLoad = targetType === 'all' ? ['rent', 'sale'] : [targetType];

    try {
        const headers = { 'Authorization': `Bearer ${appState.authToken}` };

        await Promise.all(typesToLoad.map(async (type) => {
            const pagination = appState.requestPaginationState[type] || { page: 1, totalPages: 1, total: 0 };
            const params = new URLSearchParams({
                type,
                page: pagination.page.toString(),
                limit: REQUESTS_PER_PAGE.toString()
            });

            const response = await fetch(`${API_BASE}/admin/requests?${params.toString()}`, { headers });
            if (await handleApiResponse(response) === false) {
                return;
            }

            if (!response.ok) {
                console.error(`Error loading ${type} requests:`, response.statusText);
                return;
            }

            const result = normalizeRequestResult(await response.json());

            if (result.totalPages > 0 && result.page > result.totalPages) {
                appState.requestPaginationState[type].page = result.totalPages;
                await loadClientRequests(type);
                return;
            }

            displayClientRequests(result, type);
        }));
    } catch (error) {
        console.error('Error loading client requests:', error);
    }
}

export function normalizeRequestResult(result) {
    if (Array.isArray(result)) {
        return {
            data: result,
            total: result.length,
            page: 1,
            totalPages: 1,
            limit: REQUESTS_PER_PAGE
        };
    }

    return {
        data: Array.isArray(result.data) ? result.data : [],
        total: typeof result.total === 'number' ? result.total : (Array.isArray(result.data) ? result.data.length : 0),
        page: result.page || 1,
        totalPages: result.totalPages || 1,
        limit: result.limit || REQUESTS_PER_PAGE
    };
}

export function displayClientRequests(result, type) {
    const { data, total, page, totalPages } = result;
    appState.requestPaginationState[type] = {
        page,
        totalPages: totalPages || 1,
        total
    };

    const containerId = type === 'rent' ? 'rentalRequestsList' : 'saleRequestsList';
    const counterId = type === 'rent' ? 'rentalRequestsCount' : 'saleRequestsCount';
    const container = document.getElementById(containerId);
    const counter = document.getElementById(counterId);

    if (counter) {
        counter.textContent = total;
    }

    if (!container) return;

    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `<p class="request-empty">No ${type === 'rent' ? 'rental' : 'sale'} requests yet.</p>`;
        renderRequestPagination(type);
        return;
    }

    container.innerHTML = data.map(request => {
        const car = request.carId || {};
        const carNameParts = [
            car.year,
            car.brand || car.make,
            car.model
        ].filter(Boolean);
        const carName = carNameParts.length ? carNameParts.join(' ') : 'Vehicle removed';
        const submittedAt = request.createdAt ? new Date(request.createdAt).toLocaleString() : '—';
        const rentalDates = type === 'rent' && request.startDate && request.endDate
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

        return `
            <div class="request-card">
                <div class="request-card-header">
                    <div class="request-card-title">
                        <span class="request-car-name">${escapeHtml(carName)}</span>
                        <span class="request-type-badge ${type}">${type === 'rent' ? 'Rental request' : 'Sale request'}</span>
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
                    ${(() => {
                        let priceHtml = '';
                        if (type === 'rent' && request.startDate && request.endDate) {
                            const start = new Date(request.startDate);
                            const end = new Date(request.endDate);
                            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                            let basePrice = request.customPrice !== null && request.customPrice !== undefined
                                ? request.customPrice
                                : (car.dailyRate ? car.dailyRate * days : 0);
                            const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
                            const totalPrice = basePrice - discountAmount;
                            if (totalPrice > 0) {
                                priceHtml = `
                                    <div class="request-meta-item">
                                        <span class="request-meta-label">Total Price</span>
                                        <span class="request-meta-value request-price">${formatCurrency(totalPrice)}</span>
                                    </div>`;
                            }
                        } else if (type === 'sale') {
                            let basePrice = request.customPrice !== null && request.customPrice !== undefined
                                ? request.customPrice
                                : (car.price || 0);
                            const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
                            const totalPrice = basePrice - discountAmount;
                            if (totalPrice > 0) {
                                priceHtml = `
                                    <div class="request-meta-item">
                                        <span class="request-meta-label">Sale Price</span>
                                        <span class="request-meta-value request-price">${formatCurrency(totalPrice)}</span>
                                    </div>`;
                            }
                        }
                        return priceHtml;
                    })()}
                </div>
                ${messageHtml}
                <div class="request-actions">
                    <button class="btn-primary" onclick="showRequestDetails('${request._id}', '${type}')" style="margin-right: 10px;">View Details</button>
                    <label for="status-${request._id}">Update status</label>
                    <select id="status-${request._id}" class="request-status-select" onchange="updateRequestStatus('${request._id}', this.value)">
                        ${statusOptions}
                    </select>
                    <button class="btn-delete" onclick="deleteRequest('${request._id}', '${type}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    renderRequestPagination(type);
}

export function renderRequestPagination(type) {
    const paginationState = appState.requestPaginationState[type];
    const containerId = type === 'rent' ? 'rentalRequestsPagination' : 'saleRequestsPagination';
    const container = document.getElementById(containerId);
    if (!container || !paginationState) return;

    const { page, totalPages, total } = paginationState;

    if (total <= REQUESTS_PER_PAGE) {
        container.innerHTML = '';
        container.style.display = total > 0 ? 'flex' : 'none';
        return;
    }

    container.style.display = 'flex';

    const start = (page - 1) * REQUESTS_PER_PAGE + 1;
    const end = Math.min(page * REQUESTS_PER_PAGE, total);

    container.innerHTML = `
        <button class="pagination-button" onclick="changeRequestPage('${type}', 'prev')" ${page === 1 ? 'disabled' : ''}>&lt; Prev</button>
        <span class="pagination-info">Showing ${start}-${end} of ${total} • Page ${page} of ${totalPages}</span>
        <button class="pagination-button" onclick="changeRequestPage('${type}', 'next')" ${page === totalPages ? 'disabled' : ''}>Next &gt;</button>
    `;
}

export function changeRequestPage(type, direction) {
    const state = appState.requestPaginationState[type];
    if (!state) return;

    let newPage = state.page;
    if (direction === 'prev') {
        newPage = Math.max(1, state.page - 1);
    } else if (direction === 'next') {
        newPage = Math.min(state.totalPages, state.page + 1);
    } else if (typeof direction === 'number') {
        newPage = Math.min(Math.max(direction, 1), state.totalPages);
    }

    if (newPage === state.page) return;
    appState.requestPaginationState[type].page = newPage;
    loadClientRequests(type);
}

export async function updateRequestStatus(requestId, newStatus, forceAccept = false) {
    if (!appState.authToken) {
        alert('You need to be logged in as admin to update request status.');
        return;
    }

    if (newStatus === 'accepted' && !forceAccept) {
        try {
            const requestResponse = await fetch(`${API_BASE}/admin/requests/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${appState.authToken}`
                }
            });

            if (!requestResponse.ok) {
                alert('Error loading request details');
                return;
            }

            const currentRequest = await requestResponse.json();

            if (currentRequest.requestType === 'rent' && currentRequest.startDate && currentRequest.endDate) {
                const overlapResponse = await fetch(`${API_BASE}/admin/requests/${requestId}/check-overlap`, {
                    headers: {
                        'Authorization': `Bearer ${appState.authToken}`
                    }
                });

                if (overlapResponse.ok) {
                    const overlapData = await overlapResponse.json();
                    if (overlapData.hasOverlap && overlapData.conflictingRequests && overlapData.conflictingRequests.length > 0) {
                        const conflictTitle = 'Overlapping Accepted Request';
                        const conflictMessage = `WARNING: This request overlaps with ${overlapData.conflictingRequests.length} already accepted request(s) for the same car.`;
                        const conflictDetailsList = overlapData.conflictingRequests.map(req => {
                            const startDate = new Date(req.startDate).toLocaleDateString();
                            const endDate = new Date(req.endDate).toLocaleDateString();
                            return `${req.clientName} (${startDate} to ${endDate})`;
                        });

                        const forceConfirm = await showCustomConfirm(
                            conflictTitle,
                            conflictMessage,
                            conflictDetailsList,
                            'warning'
                        );
                        if (!forceConfirm) {
                            const selectElement = document.getElementById(`status-${requestId}`);
                            if (selectElement) {
                                const prevStatus = currentRequest.status || 'new';
                                selectElement.value = prevStatus;
                            }
                            return;
                        }
                        forceAccept = true;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking overlaps:', error);
        }
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.authToken}`
            },
            body: JSON.stringify({ status: newStatus, force: forceAccept })
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            const updatedRequest = await response.json();
            const requestType = updatedRequest?.requestType || 'rent';

            loadClientRequests(requestType);

            const rentalRequestsSection = document.getElementById('rental-requests');
            const calendarView = document.getElementById('rental-calendar-view');
            if (requestType === 'rent' && rentalRequestsSection && rentalRequestsSection.style.display !== 'none') {
                if (calendarView && calendarView.style.display !== 'none') {
                    loadRentalCalendarView();
                }
            }

            loadDashboardStats();
        } else {
            const data = await response.json().catch(() => ({}));

            if (response.status === 409 && data.conflictingRequests && data.conflictingRequests.length > 0) {
                const conflictTitle = 'Overlapping Accepted Request';
                const conflictMessage = `WARNING: This request overlaps with ${data.conflictingRequests.length} already accepted request(s) for the same car.`;
                const conflictDetailsList = data.conflictingRequests.map(req => {
                    const startDate = new Date(req.startDate).toLocaleDateString();
                    const endDate = new Date(req.endDate).toLocaleDateString();
                    return `${req.clientName} (${startDate} to ${endDate})`;
                });

                const forceConfirm = await showCustomConfirm(
                    conflictTitle,
                    conflictMessage,
                    conflictDetailsList,
                    'warning'
                );
                if (forceConfirm) {
                    return updateRequestStatus(requestId, newStatus, true);
                } else {
                    const selectElement = document.getElementById(`status-${requestId}`);
                    if (selectElement) {
                        try {
                            const requestResponse = await fetch(`${API_BASE}/admin/requests/${requestId}`, {
                                headers: {
                                    'Authorization': `Bearer ${appState.authToken}`
                                }
                            });
                            if (requestResponse.ok) {
                                const currentRequest = await requestResponse.json();
                                selectElement.value = currentRequest.status || 'new';
                            }
                        } catch (e) {
                            console.error('Error resetting dropdown:', e);
                        }
                    }
                    return;
                }
            }

            alert(data.message || 'Error updating request status');
        }
    } catch (error) {
        console.error('Error updating request status:', error);
        alert('Error updating request status');
    }
}

export async function deleteRequest(requestId, type) {
    if (!appState.authToken) {
        alert('You need to be logged in as admin to delete requests.');
        return;
    }

    const confirmed = await showCustomConfirm(
        'Delete Request',
        'Are you sure you want to delete this request? This action cannot be undone.',
        null,
        'danger'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${appState.authToken}`
            }
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            const deletedType = data?.request?.requestType || type;
            loadClientRequests(deletedType);
            loadDashboardStats();
        } else {
            alert('Error deleting request');
        }
    } catch (error) {
        console.error('Error deleting request:', error);
        alert('Error deleting request');
    }
}

// Global window assignments for onclick handlers
window.updateRequestStatus = updateRequestStatus;
window.deleteRequest = deleteRequest;
window.changeRequestPage = changeRequestPage;
window.showRequestDetails = showRequestDetails;
// Exposed for request-details.js to call without circular import
window._loadClientRequests = loadClientRequests;
