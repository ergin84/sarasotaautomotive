// Admin Dashboard Module
import { appState, API_BASE } from '../constants.js';
import { formatCarStatus } from '../navigation.js';
import { showPage } from '../navigation.js';


export async function loadAdminDashboard() {
    if (!appState.authToken) {
        showPage('admin-login');
        return;
    }

    loadDashboardStats();
    loadAdminCars('sale');
    // loadClientRequests is called from init.js after admin loads
}

export async function loadDashboardStats() {
    console.log('loadDashboardStats called');

    const retryLoad = (retries = 3, delay = 100) => {
        const tryLoad = async (attempt = 0) => {
            const statElements = {
                totalSale: document.getElementById('stat-total-sale'),
                availableSale: document.getElementById('stat-available-sale'),
                sold: document.getElementById('stat-sold'),
                rent: document.getElementById('stat-rent'),
                services: document.getElementById('stat-services'),
                newRequests: document.getElementById('stat-new-requests')
            };

            if (!statElements.totalSale) {
                if (attempt < retries) {
                    console.log(`Dashboard stats elements not found, retry ${attempt + 1}/${retries}...`);
                    setTimeout(() => tryLoad(attempt + 1), delay);
                    return;
                } else {
                    console.error('Dashboard stats elements not found after retries');
                    return;
                }
            }

            return statElements;
        };
        return tryLoad();
    };

    try {
        const statElements = await retryLoad();
        if (!statElements) return;

        console.log('Loading dashboard stats from API...');
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (response.ok) {
            const stats = await response.json();
            console.log('Dashboard stats received:', stats);

            const newRentRequests = stats.requests?.rent?.new ?? 0;
            const newSaleRequests = stats.requests?.sale?.new ?? 0;
            const servicesCount = stats.services?.total ?? 0;
            const updates = [
                { el: statElements.totalSale, value: stats.carsForSale?.total ?? 0 },
                { el: statElements.availableSale, value: stats.carsForSale?.available ?? 0 },
                { el: statElements.sold, value: stats.carsForSale?.sold ?? 0 },
                { el: statElements.rent, value: stats.rentCars?.total ?? 0 },
                { el: statElements.services, value: servicesCount },
                { el: statElements.newRequests, value: newRentRequests + newSaleRequests }
            ];

            updates.forEach(({ el, value }) => {
                if (el) {
                    el.textContent = String(value);
                    console.log(`Updated ${el.id} to ${value}`);
                }
            });

            console.log('All stats updated successfully');
        } else {
            const errorText = await response.text();
            console.error('Failed to load dashboard stats:', response.status, response.statusText, errorText);
            if (statElements) {
                Object.values(statElements).forEach(el => {
                    if (el) el.textContent = '0';
                });
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        const statIds = ['stat-total-sale', 'stat-available-sale', 'stat-sold', 'stat-rent', 'stat-new-requests'];
        statIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
    }
}

export async function loadAdminCars(type) {
    try {
        const response = await fetch(`${API_BASE}/cars/${type}`, {
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (response.ok) {
            const cars = await response.json();
            const containerId = type === 'sale' ? 'saleCarsList' : 'rentCarsList';
            displayAdminCars(cars, containerId, type);
        }
    } catch (error) {
        console.error('Error loading admin cars:', error);
    }
}

export function displayAdminCars(cars, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (cars.length === 0) {
        container.innerHTML = '<p style="color: #ccc;">No cars found.</p>';
        return;
    }

    container.innerHTML = cars.map(car => {
        const carBrand = car.brand || car.make || '';
        const carModel = car.model || '';
        const carYear = car.year || '';
        const carName = carYear ? `${carYear} ${carBrand} ${carModel}` : `${carBrand} ${carModel}`;

        let priceText = '';
        if (type === 'rent') {
            priceText = (car.dailyRate !== null && car.dailyRate !== undefined)
                ? `$${car.dailyRate}/day`
                : 'Price not set';
        } else {
            priceText = (car.price !== null && car.price !== undefined)
                ? `$${car.price.toLocaleString()}`
                : 'Price not set';
        }

        let mileageText = '';
        if (type === 'sale' && car.mileage !== null && car.mileage !== undefined) {
            mileageText = ` | ${car.mileage.toLocaleString()} miles`;
        } else if (type === 'rent' && car.numPersons !== null && car.numPersons !== undefined) {
            mileageText = ` | ${car.numPersons} persons`;
        }

        const isSale = type === 'sale';
        const isSold = car.status === 'sold';
        const isPending = car.status === 'pending';

        return `
        <div class="admin-car-item">
            <div>
                <h4>${carName}</h4>
                <p>${priceText}${mileageText} |
                   <span class="status-${car.status}">${formatCarStatus(car.status)}</span></p>
            </div>
            <div class="admin-car-actions">
                <button class="btn-edit" onclick="editCar('${car._id}', '${type}')">Edit</button>
                ${isSale ? `
                    <button class="btn-pending" onclick="markAsPending('${car._id}')" ${isPending ? 'disabled' : ''}>Mark Pending</button>
                    <button class="btn-sold" onclick="markAsSold('${car._id}')" ${isSold ? 'disabled' : ''}>Mark Sold</button>
                ` : ''}
                <button class="btn-delete" onclick="deleteCar('${car._id}', '${type}')">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}
