// Cars Module
import { API_BASE } from './constants.js';
import { formatCarStatus, escapeHtml } from './utils.js';
import { openImageLightbox } from './lightbox.js';
import { showPage, updateActiveNavForPage } from './navigation.js';

export async function loadCarsForSale() {
    try {
        const response = await fetch(`${API_BASE}/cars/sale`);
        const cars = await response.json();
        displayCars(cars, 'carsForSale', 'sale');
    } catch (error) {
        console.error('Error loading cars:', error);
    }
}

export async function loadCarsForRent() {
    try {
        const response = await fetch(`${API_BASE}/cars/rent`);
        const cars = await response.json();
        displayCars(cars, 'carsForRent', 'rent');
    } catch (error) {
        console.error('Error loading rental cars:', error);
    }
}

export function displayCars(cars, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (cars.length === 0) {
        container.innerHTML = `
            <div class="inventory-empty">
                <h3 class="inventory-empty-title">No cars available right now</h3>
                <p class="inventory-empty-text">We currently do not have cars in this section. Contact us and we will evaluate a solution tailored for you.</p>
                <a href="#" class="inventory-empty-button" data-page="contact">Contact Us</a>
            </div>
        `;

        const contactCta = container.querySelector('.inventory-empty-button');
        if (contactCta) {
            contactCta.addEventListener('click', (event) => {
                event.preventDefault();
                showPage('contact');
                updateActiveNavForPage('contact');
            });
        }
        return;
    }

    container.innerHTML = cars.map(car => {
        const carImage = (car.images && car.images.length > 0) 
            ? car.images[0] 
            : (car.image || '/images/no-image.svg');
        
        const carBrand = car.brand || car.make || '';
        const carModel = car.model || '';
        const carYear = car.year || '';
        
        return `
        <div class="car-card" onclick="window.showCarDetails('${car._id}', '${type}')">
            <img src="${carImage}" 
                 alt="${carBrand} ${carModel}" 
                 class="car-image"
                 loading="lazy"
                 onerror="this.src='/images/no-image.svg'">
            <div class="car-info">
                <h3 class="car-title">${carYear ? carYear + ' ' : ''}${carBrand} ${carModel}</h3>
                <div class="car-details">
                    ${car.mileage ? `<p>Mileage: ${car.mileage.toLocaleString()} miles</p>` : ''}
                    ${car.description ? `<p>${car.description.substring(0, 100)}${car.description.length > 100 ? '...' : ''}</p>` : ''}
                </div>
                <div class="car-price">
                    ${type === 'rent' ? `$${car.dailyRate}/day` : `$${car.price ? car.price.toLocaleString() : 'N/A'}`}
                </div>
                <span class="car-status status-${car.status}">${formatCarStatus(car.status)}</span>
            </div>
        </div>
        `;
    }).join('');
}

export async function showCarDetails(carId, type) {
    // Full implementation remains in app.js for now
    // This will be migrated later
    console.log('Show car details:', carId, type);
}
