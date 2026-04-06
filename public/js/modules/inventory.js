// Inventory Module
import { API_BASE } from './constants.js';
import { formatCarStatus } from './navigation.js';
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

export async function loadServices() {
    try {
        const response = await fetch(`${API_BASE}/services`);
        const services = await response.json();
        displayServices(services);
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

export function displayServices(services) {
    const container = document.getElementById('servicesGrid');
    if (!container) return;

    if (!services || services.length === 0) {
        container.innerHTML = `
            <div class="services-empty">
                <h3>No services available</h3>
                <p>We currently do not have any services listed. Please check back soon!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = services.map(service => {
        const mainImage = service.mainImage || (service.images && service.images.length > 0 ? service.images[0] : '/images/no-image.svg');

        return `
        <div class="service-card" style="cursor: pointer;" onclick="showServiceDetail('${service._id}');">
            ${mainImage ? `<img src="${mainImage}" alt="${service.title}" class="service-image" onerror="this.src='/images/no-image.svg'">` : ''}
            <div class="service-card-content">
                <div class="service-icon">
                    <i class="${service.icon || 'fas fa-cog'}"></i>
                </div>
                <h3 class="service-title">${service.title}</h3>
                <p class="service-description">${service.shortDescription}</p>
            </div>
        </div>
        `;
    }).join('');
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
        <div class="car-card" onclick="showCarDetails('${car._id}', '${type}')">
            <img src="${carImage}"
                 alt="${carBrand} ${carModel}"
                 class="car-image"
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
