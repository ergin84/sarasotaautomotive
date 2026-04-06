// Admin Cars Module
import { appState, API_BASE, VEHICLE_OPTIONS } from '../constants.js';
import { handleApiResponse } from '../auth.js';
import { showCustomConfirm } from '../modals.js';
import { loadAdminCars } from './dashboard.js';
import { loadCarsForSale, loadCarsForRent } from '../inventory.js';

export async function loadBrands() {
    try {
        const response = await fetch(`${API_BASE}/brands`);
        const brands = await response.json();
        const brandSelect = document.getElementById('carBrand');
        brandSelect.innerHTML = '<option value="">Select Brand</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.name;
            option.textContent = brand.name;
            brandSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading brands:', error);
    }
}

export async function loadModels(brandName) {
    try {
        const response = await fetch(`${API_BASE}/brands/${encodeURIComponent(brandName)}/models`);
        const models = await response.json();
        const modelSelect = document.getElementById('carModel');
        modelSelect.innerHTML = '<option value="">Select Model</option>';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

export function populateVehicleOptions() {
    const container = document.getElementById('vehicleOptionsContainer');
    container.innerHTML = '';
    VEHICLE_OPTIONS.forEach(option => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = option.value || option;
        checkbox.name = 'vehicleOptions';
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(option.label || option));
        container.appendChild(label);
    });
}

export function openCarForm(type, carId = null) {
    const modal = document.getElementById('carFormModal');
    const form = document.getElementById('carForm');
    const title = document.getElementById('carFormTitle');

    hideCarFormError();
    form.reset();
    document.getElementById('carId').value = carId || '';
    document.getElementById('carType').value = type;
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imagePreviewRent').innerHTML = '';

    loadBrands();
    if (type === 'sale') {
        populateVehicleOptions();
    }

    const saleFields = document.getElementById('saleCarFields');
    const rentFields = document.getElementById('rentCarFields');

    const saleRequiredFields = saleFields.querySelectorAll('[required]');
    const rentRequiredFields = rentFields.querySelectorAll('[required]');

    if (type === 'rent') {
        saleFields.style.display = 'none';
        rentFields.style.display = 'block';
        title.textContent = carId ? 'Edit Rental Car' : 'Add Rental Car';

        saleRequiredFields.forEach(field => {
            field.removeAttribute('required');
            field.setAttribute('data-was-required', 'true');
        });
        rentRequiredFields.forEach(field => {
            field.setAttribute('required', 'required');
        });
    } else {
        saleFields.style.display = 'block';
        rentFields.style.display = 'none';
        title.textContent = carId ? 'Edit Car' : 'Add Car for Sale';

        rentRequiredFields.forEach(field => {
            field.removeAttribute('required');
            field.setAttribute('data-was-required', 'true');
        });
        saleRequiredFields.forEach(field => {
            field.setAttribute('required', 'required');
        });
    }

    document.getElementById('carBrand').addEventListener('change', function() {
        if (this.value) {
            loadModels(this.value);
        }
    });

    if (carId) {
        loadCarForEdit(carId);
    }

    modal.style.display = 'block';
}

export async function loadCarForEdit(carId) {
    try {
        const response = await fetch(`${API_BASE}/cars/${carId}`);
        const car = await response.json();

        document.getElementById('carBrand').value = car.brand || car.make || '';
        if (car.brand || car.make) {
            await loadModels(car.brand || car.make);
            setTimeout(() => {
                document.getElementById('carModel').value = car.model || '';
            }, 100);
        }
        document.getElementById('carDescription').value = car.description || '';

        if (car.type === 'sale') {
            document.getElementById('carModelVersion').value = car.modelVersion || '';
            document.getElementById('carMileage').value = car.mileage || '';
            document.getElementById('carGearbox').value = car.gearbox || '';
            if (car.firstRegistrationDate) {
                const date = new Date(car.firstRegistrationDate);
                document.getElementById('carFirstRegistration').value = date.toISOString().split('T')[0];
            }
            document.getElementById('carFuelType').value = car.fuelType || '';
            document.getElementById('carPower').value = car.power || '';
            document.getElementById('carPrice').value = car.price || '';

            if (car.vehicleOptions && Array.isArray(car.vehicleOptions)) {
                car.vehicleOptions.forEach(option => {
                    const checkbox = document.querySelector(`input[name="vehicleOptions"][value="${option}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            if (car.images && Array.isArray(car.images)) {
                displayImagePreviews(car.images, 'imagePreview');
            } else if (car.image) {
                displayImagePreviews([car.image], 'imagePreview');
            }
        } else {
            document.getElementById('carGearboxRent').value = car.gearbox || '';
            document.getElementById('carFuelTypeRent').value = car.fuelType || '';
            document.getElementById('carNumPersons').value = car.numPersons || '';
            document.getElementById('carDailyRate').value = car.dailyRate || '';

            if (car.images && Array.isArray(car.images)) {
                displayImagePreviews(car.images, 'imagePreviewRent');
            } else if (car.image) {
                displayImagePreviews([car.image], 'imagePreviewRent');
            }
        }
    } catch (error) {
        console.error('Error loading car:', error);
    }
}

export function displayImagePreviews(imageUrls, previewId = 'imagePreview') {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    const existingItems = preview.querySelectorAll('[data-existing="true"]');
    existingItems.forEach(item => item.remove());

    imageUrls.forEach((url, index) => {
        createImagePreviewItem(preview, url, index, true, previewId);
    });
}

export function createImagePreviewItem(container, source, index, isExisting = false, containerId = 'imagePreview') {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.setAttribute('data-index', index);
    if (isExisting) {
        item.setAttribute('data-existing', 'true');
    } else {
        item.setAttribute('data-new', 'true');
    }

    const img = document.createElement('img');
    img.src = source;
    img.className = 'image-preview-img';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';

    const controls = document.createElement('div');
    controls.className = 'image-preview-controls';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'image-preview-btn image-preview-btn-up';
    btnUp.setAttribute('aria-label', 'Move image up');
    btnUp.addEventListener('click', (e) => {
        e.preventDefault();
        moveImageUp(item, containerId);
    });

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'image-preview-btn image-preview-btn-down';
    btnDown.setAttribute('aria-label', 'Move image down');
    btnDown.addEventListener('click', (e) => {
        e.preventDefault();
        moveImageDown(item, containerId);
    });

    const btnMain = document.createElement('button');
    btnMain.type = 'button';
    btnMain.className = 'image-preview-btn image-preview-btn-main';
    btnMain.setAttribute('aria-label', 'Mark as main image');
    btnMain.addEventListener('click', (e) => {
        e.preventDefault();
        markMainImage(item, containerId);
    });

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'image-preview-btn image-preview-btn-delete';
    btnDelete.setAttribute('aria-label', 'Delete image');
    btnDelete.addEventListener('click', (e) => {
        e.preventDefault();
        deleteImage(item, containerId);
    });

    controls.appendChild(btnUp);
    controls.appendChild(btnDown);
    controls.appendChild(btnMain);
    controls.appendChild(btnDelete);

    item.appendChild(img);
    item.appendChild(controls);
    container.appendChild(item);
}

export function moveImageUp(item, containerId) {
    const container = document.getElementById(containerId);
    const items = Array.from(container.querySelectorAll('.image-preview-item'));
    const currentIndex = items.indexOf(item);

    if (currentIndex > 0) {
        const prevItem = items[currentIndex - 1];
        container.insertBefore(item, prevItem);
        updateImageIndices(container);
    }
}

export function moveImageDown(item, containerId) {
    const container = document.getElementById(containerId);
    const items = Array.from(container.querySelectorAll('.image-preview-item'));
    const currentIndex = items.indexOf(item);

    if (currentIndex < items.length - 1) {
        const nextItem = items[currentIndex + 1];
        container.insertBefore(nextItem, item);
        updateImageIndices(container);
    }
}

export function markMainImage(item, containerId) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.image-preview-item');

    items.forEach(i => i.classList.remove('main-image'));
    item.classList.add('main-image');
}

export function deleteImage(item, containerId) {
    item.remove();
    const container = document.getElementById(containerId);
    updateImageIndices(container);
}

export function updateImageIndices(container) {
    const items = container.querySelectorAll('.image-preview-item');
    items.forEach((item, index) => {
        item.setAttribute('data-index', index);
    });
}

export function getOrderedImages(containerId) {
    const container = document.getElementById(containerId);
    const items = Array.from(container.querySelectorAll('.image-preview-item'));

    return items.map(item => ({
        src: item.querySelector('.image-preview-img').src,
        isMain: item.classList.contains('main-image'),
        isNew: item.hasAttribute('data-new'),
        isExisting: item.hasAttribute('data-existing')
    }));
}

export async function uploadImages(imageFiles) {
    if (!imageFiles || imageFiles.length === 0) {
        return [];
    }

    const formData = new FormData();
    Array.from(imageFiles).forEach(file => {
        formData.append('images', file);
    });

    try {
        const response = await fetch(`${API_BASE}/upload/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.authToken}`
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            return data.urls || [];
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Error uploading images');
        }
    } catch (error) {
        console.error('Error uploading images:', error);
        throw error;
    }
}

export function showCarFormError(message) {
    const errorDiv = document.getElementById('carFormError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        alert(message);
    }
}

export function hideCarFormError() {
    const errorDiv = document.getElementById('carFormError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

export async function handleCarFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    hideCarFormError();

    const carId = document.getElementById('carId').value;
    const type = document.getElementById('carType').value;

    if (type === 'sale') {
        const rentFields = document.getElementById('rentCarFields');
        rentFields.querySelectorAll('[required]').forEach(field => {
            field.removeAttribute('required');
        });
    } else {
        const saleFields = document.getElementById('saleCarFields');
        saleFields.querySelectorAll('[required]').forEach(field => {
            field.removeAttribute('required');
        });
    }

    const brand = document.getElementById('carBrand').value.trim();
    const model = document.getElementById('carModel').value.trim();

    if (!brand) {
        showCarFormError('Please select a brand');
        return;
    }

    if (!model) {
        showCarFormError('Please select a model');
        return;
    }

    let uploadedImageUrls = [];
    try {
        const imageInput = type === 'sale' ? document.getElementById('carImages') : document.getElementById('carImagesRent');
        if (imageInput && imageInput.files.length > 0) {
            uploadedImageUrls = await uploadImages(imageInput.files);
        }
    } catch (error) {
        showCarFormError('Error uploading images: ' + error.message);
        return;
    }

    const previewId = type === 'sale' ? 'imagePreview' : 'imagePreviewRent';
    const orderedImages = getOrderedImages(previewId);

    const carData = {
        brand: brand,
        model: model,
        type: type,
        status: 'available',
        description: document.getElementById('carDescription').value || ''
    };

    const finalImages = [];
    let mainImageUrl = null;

    orderedImages.forEach((imgInfo, index) => {
        const url = imgInfo.src;
        if (!url.startsWith('data:')) {
            finalImages.push(url);
            if (imgInfo.isMain) {
                mainImageUrl = url;
            }
        }
    });

    uploadedImageUrls.forEach(url => {
        finalImages.push(url);
    });

    if (finalImages.length > 0) {
        carData.images = finalImages;
        carData.image = mainImageUrl || finalImages[0];
    }

    if (type === 'sale') {
        const mileage = document.getElementById('carMileage').value;
        const gearbox = document.getElementById('carGearbox').value;
        const fuelType = document.getElementById('carFuelType').value;
        const price = document.getElementById('carPrice').value;

        if (!mileage) {
            showCarFormError('Please enter mileage');
            return;
        }
        if (!gearbox) {
            showCarFormError('Please select gearbox');
            return;
        }
        if (!fuelType) {
            showCarFormError('Please select fuel type');
            return;
        }
        if (!price) {
            showCarFormError('Please enter price');
            return;
        }

        carData.modelVersion = document.getElementById('carModelVersion').value || '';
        carData.mileage = parseInt(mileage) || 0;
        carData.gearbox = gearbox;
        const firstReg = document.getElementById('carFirstRegistration').value;
        if (firstReg) {
            carData.firstRegistrationDate = new Date(firstReg);
        }
        carData.fuelType = fuelType;
        const power = document.getElementById('carPower').value;
        if (power) carData.power = parseInt(power);
        carData.price = parseFloat(price) || 0;

        const selectedOptions = Array.from(document.querySelectorAll('input[name="vehicleOptions"]:checked'))
            .map(cb => cb.value);
        carData.vehicleOptions = selectedOptions;
    } else {
        const gearbox = document.getElementById('carGearboxRent').value;
        const fuelType = document.getElementById('carFuelTypeRent').value;
        const numPersons = document.getElementById('carNumPersons').value;
        const dailyRate = document.getElementById('carDailyRate').value;

        if (!gearbox) {
            showCarFormError('Please select gearbox');
            return;
        }
        if (!fuelType) {
            showCarFormError('Please select fuel type');
            return;
        }
        if (!numPersons) {
            showCarFormError('Please enter number of persons');
            return;
        }
        if (!dailyRate) {
            showCarFormError('Please enter price per day');
            return;
        }

        carData.gearbox = gearbox;
        carData.fuelType = fuelType;
        carData.numPersons = parseInt(numPersons) || 0;
        carData.dailyRate = parseFloat(dailyRate) || 0;
    }

    if (!appState.authToken) {
        showCarFormError('You must be logged in to save a car. Please log in first.');
        return;
    }

    try {
        const url = carId ? `${API_BASE}/cars/${carId}` : `${API_BASE}/cars`;
        const method = carId ? 'PUT' : 'POST';

        console.log('Saving car:', { url, method, carData, authToken: appState.authToken ? 'present' : 'missing' });

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.authToken}`
            },
            body: JSON.stringify(carData)
        });

        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 500));
            showCarFormError('Server returned an error. Status: ' + response.status + '. Check console for details.');
            return;
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            hideCarFormError();
            document.getElementById('carFormModal').style.display = 'none';
            setTimeout(() => {
                loadAdminCars(type);
                if (type === 'sale') {
                    loadCarsForSale();
                } else {
                    loadCarsForRent();
                }
            }, 100);
        } else {
            console.error('Car save error:', data);
            const errorMsg = data.message || data.error || 'Unknown error. Please check console for details.';
            showCarFormError('Error saving car: ' + errorMsg);
        }
    } catch (error) {
        console.error('Error saving car:', error);
        showCarFormError('Error saving car: ' + error.message);
    }
}

export async function editCar(carId, type) {
    openCarForm(type, carId);
}

export async function deleteCar(carId, type) {
    const confirmed = await showCustomConfirm(
        'Delete Car',
        'Are you sure you want to delete this car? This action cannot be undone.',
        null,
        'danger'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE}/cars/${carId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (response.ok) {
            loadAdminCars(type);
            if (type === 'sale') {
                loadCarsForSale();
            } else {
                loadCarsForRent();
            }
        } else {
            alert('Error deleting car');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting car');
    }
}

export async function markAsSold(carId) {
    try {
        const response = await fetch(`${API_BASE}/cars/${carId}/sold`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (response.ok) {
            loadAdminCars('sale');
            loadCarsForSale();
        } else {
            alert('Error marking car as sold');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error marking car as sold');
    }
}

export async function markAsPending(carId) {
    try {
        const response = await fetch(`${API_BASE}/cars/${carId}/pending`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (response.ok) {
            loadAdminCars('sale');
            loadCarsForSale();
        } else {
            alert('Error marking car as pending');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error marking car as pending');
    }
}

// Global window assignments for onclick handlers
window.editCar = editCar;
window.deleteCar = deleteCar;
window.markAsSold = markAsSold;
window.markAsPending = markAsPending;
