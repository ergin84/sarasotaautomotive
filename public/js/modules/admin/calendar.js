// Admin Rental Calendar Module
import { appState, API_BASE } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { formatRequestStatusLabel } from '../navigation.js';
import { handleApiResponse } from '../auth.js';
import { showRequestDetails } from './request-details.js';

// Calendar state
let currentCalendarMonth = new Date();
currentCalendarMonth.setDate(1);
currentCalendarMonth.setHours(0, 0, 0, 0);
let calendarRentalRequests = [];
let calendarCars = [];

export function initializeRentalCalendarView() {
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarView = document.getElementById('rental-calendar-view');
    const listView = document.getElementById('rental-list-view');

    if (calendarViewBtn && listViewBtn) {
        calendarViewBtn.addEventListener('click', () => {
            calendarViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            if (calendarView) calendarView.style.display = 'block';
            if (listView) listView.style.display = 'none';
            loadRentalCalendarView();
        });

        listViewBtn.addEventListener('click', () => {
            listViewBtn.classList.add('active');
            calendarViewBtn.classList.remove('active');
            if (calendarView) calendarView.style.display = 'none';
            if (listView) listView.style.display = 'block';
        });
    }

    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            const year = currentCalendarMonth.getFullYear();
            const month = currentCalendarMonth.getMonth();
            currentCalendarMonth = new Date(year, month - 1, 1);
            currentCalendarMonth.setHours(0, 0, 0, 0);
            loadRentalCalendarView();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            const year = currentCalendarMonth.getFullYear();
            const month = currentCalendarMonth.getMonth();
            currentCalendarMonth = new Date(year, month + 1, 1);
            currentCalendarMonth.setHours(0, 0, 0, 0);
            loadRentalCalendarView();
        });
    }

    loadRentalCalendarView();
}

export async function loadRentalCalendarView() {
    if (!appState.authToken) {
        const tableauContainer = document.getElementById('rentalCalendarTableau');
        if (tableauContainer) {
            tableauContainer.innerHTML = '<div class="calendar-error">Please log in to view the calendar.</div>';
        }
        return;
    }

    const tableauContainer = document.getElementById('rentalCalendarTableau');
    if (!tableauContainer) return;

    tableauContainer.innerHTML = '<div class="calendar-loading">Loading calendar...</div>';

    try {
        let carsResponse;
        try {
            carsResponse = await fetch(`${API_BASE}/cars/rent`, {
                headers: { 'Authorization': `Bearer ${appState.authToken}` }
            });
        } catch (fetchError) {
            console.error('Network error fetching cars:', fetchError);
            throw new Error('Unable to connect to server. Please check if the server is running.');
        }

        if (await handleApiResponse(carsResponse) === false) {
            tableauContainer.innerHTML = '<div class="calendar-error">Authentication required. Please log in again.</div>';
            return;
        }

        if (!carsResponse.ok) {
            const errorText = await carsResponse.text().catch(() => 'Unknown error');
            console.error('Failed to load cars response:', carsResponse.status, errorText);
            throw new Error(`Failed to load cars: ${carsResponse.status}`);
        }

        calendarCars = await carsResponse.json();

        let requestsResponse;
        try {
            requestsResponse = await fetch(`${API_BASE}/admin/requests?type=rent&limit=1000`, {
                headers: { 'Authorization': `Bearer ${appState.authToken}` }
            });
        } catch (fetchError) {
            console.error('Network error fetching requests:', fetchError);
            throw new Error('Unable to connect to server. Please check if the server is running.');
        }

        if (await handleApiResponse(requestsResponse) === false) {
            tableauContainer.innerHTML = '<div class="calendar-error">Authentication required. Please log in again.</div>';
            return;
        }

        if (!requestsResponse.ok) {
            const errorText = await requestsResponse.text().catch(() => 'Unknown error');
            console.error('Failed to load requests response:', requestsResponse.status, errorText);
            throw new Error(`Failed to load rental requests: ${requestsResponse.status}`);
        }

        const result = await requestsResponse.json();
        calendarRentalRequests = Array.isArray(result) ? result : (result.data || []);

        calendarRentalRequests = calendarRentalRequests.filter(req => {
            if (!req.startDate || !req.endDate) return false;
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            return !isNaN(start.getTime()) && !isNaN(end.getTime());
        });

        renderCalendarTableau();
    } catch (error) {
        console.error('Error loading calendar view:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            cars: calendarCars?.length,
            requests: calendarRentalRequests?.length
        });

        let errorMessage = 'Error loading calendar. Please try again.';
        if (error.message) {
            if (error.message.includes('Failed to fetch') || error.message.includes('Unable to connect')) {
                errorMessage = 'Unable to connect to server. Please check your connection and ensure the server is running.';
            } else if (error.message.includes('401') || error.message.includes('Authentication')) {
                errorMessage = 'Authentication required. Please log in again.';
            } else {
                errorMessage = `Error loading calendar: ${error.message}`;
            }
        }

        tableauContainer.innerHTML = `<div class="calendar-error">${errorMessage}</div>`;
    }
}

export function renderCalendarTableau() {
    const tableauContainer = document.getElementById('rentalCalendarTableau');
    const monthTitle = document.getElementById('calendarMonthTitle');

    if (!tableauContainer) {
        console.error('Calendar tableau container not found');
        return;
    }

    try {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        if (monthTitle) {
            monthTitle.textContent = `${monthNames[currentCalendarMonth.getMonth()]} ${currentCalendarMonth.getFullYear()}`;
        }

        const year = currentCalendarMonth.getFullYear();
        const month = currentCalendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const relevantRequests = calendarRentalRequests.filter(req => {
            if (!req.startDate || !req.endDate) return false;
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            return (start <= monthEnd && end >= monthStart);
        });

        let html = '<div class="calendar-tableau-wrapper">';

        html += '<div class="calendar-row calendar-header-row">';
        html += '<div class="calendar-car-header">Car</div>';
        html += '<div class="calendar-dates-header">';
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
            html += `<div class="calendar-date-header ${dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : ''}">`;
            html += `<span class="date-number">${day}</span>`;
            html += `<span class="date-name">${dayName}</span>`;
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        if (calendarCars.length === 0) {
            html += '<div class="calendar-empty">No rental cars available</div>';
        } else {
            calendarCars.forEach(car => {
                const carName = [
                    car.year,
                    car.brand || car.make,
                    car.model
                ].filter(Boolean).join(' ') || 'Unknown Car';

                const carRequests = relevantRequests.filter(req => {
                    const reqCarId = typeof req.carId === 'object' ? req.carId._id || req.carId : req.carId;
                    const carId = typeof car._id === 'string' ? car._id : car._id.toString();
                    return reqCarId === carId || reqCarId?.toString() === carId;
                });

                const sortedCarRequests = [...carRequests].sort((a, b) => {
                    const dateA = new Date(a.startDate);
                    const dateB = new Date(b.startDate);
                    return dateA - dateB;
                });

                const monthStartDate = new Date(year, month, 1);
                const monthEndDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

                const visibleRequestsForCar = [];
                const carRowAssignments = [];

                sortedCarRequests.forEach((request) => {
                    const startDate = new Date(request.startDate);
                    const endDate = new Date(request.endDate);
                    const reqStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const reqEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    reqEnd.setHours(23, 59, 59, 999);

                    if (reqEnd >= monthStartDate && reqStart <= monthEndDate) {
                        const conflictingRows = new Set();

                        for (let i = 0; i < visibleRequestsForCar.length; i++) {
                            const other = visibleRequestsForCar[i];

                            if (reqStart <= other.reqEnd && other.reqStart <= reqEnd) {
                                conflictingRows.add(carRowAssignments[i]);
                            }
                        }

                        let rowIndex = 0;
                        while (conflictingRows.has(rowIndex)) {
                            rowIndex++;
                        }

                        visibleRequestsForCar.push({
                            request,
                            reqStart,
                            reqEnd
                        });
                        carRowAssignments.push(rowIndex);
                    }
                });

                const maxRowsForCar = carRowAssignments.length > 0 ? Math.max(...carRowAssignments) + 1 : 1;
                const barHeight = 28;
                const barSpacing = 6;
                const containerMinHeight = Math.max(50, (maxRowsForCar * barHeight) + ((maxRowsForCar - 1) * barSpacing) + 12);

                html += '<div class="calendar-row calendar-car-row">';
                html += `<div class="calendar-car-name">${escapeHtml(carName)}</div>`;
                html += `<div class="calendar-dates-row calendar-booking-container" data-car-id="${car._id}" style="min-height: ${containerMinHeight}px;">`;

                for (let day = 1; day <= daysInMonth; day++) {
                    const currentDate = new Date(year, month, day);
                    const dayOfWeek = currentDate.getDay();
                    let cellClass = 'calendar-date-cell';
                    if (dayOfWeek === 0 || dayOfWeek === 6) cellClass += ' weekend';
                    html += `<div class="${cellClass}"></div>`;
                }

                if (visibleRequestsForCar.length > 0) {
                    const barHeight = 28;
                    const barSpacing = 6;

                    const maxRows = carRowAssignments.length > 0 ? Math.max(...carRowAssignments) + 1 : 1;
                    const totalBarSpace = barHeight + barSpacing;
                    const totalHeight = (maxRows * barHeight) + ((maxRows - 1) * barSpacing);
                    const baseOffsetPx = -totalHeight / 2 + barHeight / 2;

                    visibleRequestsForCar.forEach((item, idx) => {
                        const { request, reqStart, reqEnd } = item;
                        const rowIndex = carRowAssignments[idx] || 0;

                        let startDay = Math.max(1, reqStart >= monthStartDate ? reqStart.getDate() : 1);
                        let endDay = Math.min(daysInMonth, reqEnd <= monthEndDate ? reqEnd.getDate() : daysInMonth);

                        if (reqStart < monthStartDate) {
                            startDay = 1;
                        }
                        if (reqEnd > monthEndDate) {
                            endDay = daysInMonth;
                        }

                        const rowOffsetPx = rowIndex * totalBarSpace;
                        const topOffsetPx = baseOffsetPx + rowOffsetPx;

                        const cellWidth = 100 / daysInMonth;
                        const leftPercent = ((startDay - 1) * cellWidth);
                        const widthPercent = ((endDay - startDay + 1) * cellWidth);

                        let leftAdjust = 0;
                        let widthAdjust = 0;

                        if (reqStart >= monthStartDate && reqStart.getMonth() === month && reqStart.getFullYear() === year) {
                            leftAdjust = cellWidth * 0.5;
                            widthAdjust -= cellWidth * 0.5;
                        }

                        if (reqEnd <= monthEndDate && reqEnd.getMonth() === month && reqEnd.getFullYear() === year) {
                            widthAdjust -= cellWidth * 0.5;
                        }

                        const finalLeft = leftPercent + leftAdjust;
                        const finalWidth = widthPercent + widthAdjust;

                        const startDate = new Date(request.startDate);
                        const endDate = new Date(request.endDate);
                        const rawStatus = request.status || 'new';
                        const normalizedStatus = ['new', 'contacted', 'ongoing', 'accepted', 'rejected', 'closed'].includes(rawStatus)
                            ? rawStatus
                            : (rawStatus === 'pending' ? 'new' : rawStatus === 'completed' ? 'closed' : 'new');
                        const statusClass = normalizedStatus;
                        const clientName = escapeHtml(request.clientName);
                        const startDateStr = startDate.toLocaleDateString();
                        const endDateStr = endDate.toLocaleDateString();
                        const requestId = request._id || request.id;

                        html += `<div class="booking-bar status-${statusClass}"
                            style="left: ${finalLeft}%; width: ${finalWidth}%; top: calc(50% + ${topOffsetPx}px); transform: translateY(-50%);"
                            data-request-id="${requestId}"
                            data-request-type="rent"
                            title="${clientName} - ${startDateStr} to ${endDateStr} (${formatRequestStatusLabel(statusClass)})">
                            <span class="booking-bar-label">${clientName}</span>
                        </div>`;
                    });
                }

                html += '</div>';
                html += '</div>';
            });
        }

        html += '</div>';
        tableauContainer.innerHTML = html;

        calendarCars.forEach(car => {
            const container = tableauContainer.querySelector(`[data-car-id="${car._id}"]`);
            if (container) {
                const bars = container.querySelectorAll('.booking-bar');
                if (bars.length > 0) {
                    const rowPositions = Array.from(bars).map(bar => {
                        const style = bar.getAttribute('style') || '';
                        const topMatch = style.match(/top:\s*([-\d.]+)px/);
                        return topMatch ? parseFloat(topMatch[1]) : 0;
                    });

                    const uniqueRows = new Set();
                    rowPositions.forEach(pos => {
                        const barHeight = 28;
                        const barSpacing = 6;
                        const totalBarSpace = barHeight + barSpacing;
                        const row = Math.round((pos + (totalBarSpace * 10)) / totalBarSpace);
                        uniqueRows.add(row);
                    });

                    const maxRows = Math.max(uniqueRows.size || 1, 1);
                    const neededHeight = Math.max(50, (maxRows * 28) + ((maxRows - 1) * 6) + 12);
                    container.style.minHeight = `${neededHeight}px`;
                }
            }
        });

        tableauContainer.querySelectorAll('.booking-bar').forEach(bar => {
            bar.addEventListener('click', (e) => {
                const requestId = bar.getAttribute('data-request-id');
                const requestType = bar.getAttribute('data-request-type') || 'rent';
                if (requestId) {
                    showRequestDetails(requestId, requestType);
                }
            });
        });
    } catch (error) {
        console.error('Error rendering calendar tableau:', error);
        console.error('Error stack:', error.stack);
        tableauContainer.innerHTML = `<div class="calendar-error">Error rendering calendar: ${error.message || 'Unknown error'}</div>`;
    }
}
