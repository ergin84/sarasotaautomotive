// Admin Services Module
import { appState, API_BASE } from '../constants.js';
import { handleApiResponse } from '../auth.js';
import { closeModal } from '../modals.js';
import { createImagePreviewItem } from './cars.js';

export async function loadAdminServices() {
    try {
        const response = await fetch(`${API_BASE}/services/admin/all`, {
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (response.ok) {
            const services = await response.json();
            displayAdminServices(services);
        }
    } catch (error) {
        console.error('Error loading admin services:', error);
    }
}

export function displayAdminServices(services) {
    const container = document.getElementById('servicesList');
    if (!container) return;

    if (!services || services.length === 0) {
        container.innerHTML = '<p style="color: #ccc;">No services found.</p>';
        return;
    }

    container.innerHTML = services.map(service => {
        return `
        <div class="admin-service-item">
            <div>
                <h4>${service.title}</h4>
                <p>${service.shortDescription.substring(0, 100)}${service.shortDescription.length > 100 ? '...' : ''}</p>
                <p style="font-size: 0.85rem; color: #999;">Order: ${service.order} | ${service.isActive ? 'Active' : 'Inactive'}</p>
            </div>
            <div class="admin-service-actions">
                <button class="btn-edit" onclick="editService('${service._id}')">Edit</button>
                <button class="btn-delete" onclick="deleteService('${service._id}')">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}

export function openServiceForm(serviceId = null) {
    const form = document.getElementById('serviceForm');
    const modal = document.getElementById('serviceFormModal');
    const title = modal?.querySelector('.modal-title');
    const preview = document.getElementById('serviceImagePreview');

    if (!form || !modal || !title) return;

    if (serviceId) {
        title.textContent = 'Edit Service';
        form.dataset.serviceId = serviceId;
        if (preview) preview.innerHTML = '';
        loadServiceForEdit(serviceId);
    } else {
        title.textContent = 'Add New Service';
        delete form.dataset.serviceId;
        form.reset();
        if (preview) preview.innerHTML = '';
        const imageInput = document.getElementById('serviceImages');
        if (imageInput) imageInput.value = '';
    }

    modal.style.display = 'flex';
}

export async function loadServiceForEdit(serviceId) {
    try {
        const response = await fetch(`${API_BASE}/services/${serviceId}`, {
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (response.ok) {
            const service = await response.json();
            document.getElementById('serviceTitle').value = service.title || '';
            document.getElementById('serviceShortDesc').value = service.shortDescription || '';
            document.getElementById('serviceFullDesc').value = service.fullDescription || '';
            document.getElementById('serviceIcon').value = service.icon || '';
            document.getElementById('serviceOrder').value = service.order || 0;
            document.getElementById('serviceIsActive').checked = service.isActive !== false;

            const preview = document.getElementById('serviceImagePreview');
            if (preview && service.images && service.images.length > 0) {
                preview.innerHTML = '';
                displayServiceImagePreviews(service.images, 'serviceImagePreview');
            }
        } else {
            alert('Error loading service details');
        }
    } catch (error) {
        console.error('Error loading service for edit:', error);
        alert('Error loading service');
    }
}

export async function handleServiceFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('serviceForm');
    const serviceId = form.dataset.serviceId;
    const method = serviceId ? 'PUT' : 'POST';
    const url = serviceId ? `${API_BASE}/services/${serviceId}` : `${API_BASE}/services`;

    const preview = document.getElementById('serviceImagePreview');
    const imageItems = preview?.querySelectorAll('.image-preview-item') || [];
    const images = Array.from(imageItems).map(item => {
        const img = item.querySelector('img');
        return img?.src || '';
    }).filter(Boolean);

    const formData = {
        title: document.getElementById('serviceTitle').value,
        shortDescription: document.getElementById('serviceShortDesc').value,
        fullDescription: document.getElementById('serviceFullDesc').value,
        icon: document.getElementById('serviceIcon').value || 'fas fa-cog',
        images: images,
        mainImage: images.length > 0 ? images[0] : null,
        order: parseInt(document.getElementById('serviceOrder').value) || 0,
        isActive: document.getElementById('serviceIsActive').checked
    };

    try {
        const imageInput = document.getElementById('serviceImages');
        if (imageInput?.files && imageInput.files.length > 0) {
            try {
                const newImageUrls = await uploadServiceImages(imageInput.files);
                formData.images = [...(formData.images || []), ...newImageUrls];
                formData.mainImage = formData.mainImage || (newImageUrls.length > 0 ? newImageUrls[0] : null);
            } catch (uploadError) {
                alert('Error uploading images: ' + uploadError.message);
                return;
            }
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${appState.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (await handleApiResponse(response) === false) return;

        if (response.ok) {
            closeModal('serviceFormModal');
            document.getElementById('serviceImages').value = '';
            loadAdminServices();
            alert(serviceId ? 'Service updated successfully' : 'Service created successfully');
        } else {
            const data = await response.json();
            alert(data.message || 'Error saving service');
        }
    } catch (error) {
        console.error('Error saving service:', error);
        alert('Error saving service');
    }
}

export async function editService(serviceId) {
    openServiceForm(serviceId);
}

export async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await fetch(`${API_BASE}/services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${appState.authToken}`
            }
        });

        if (await handleApiResponse(response) === false) return;

        if (response.ok) {
            loadAdminServices();
            alert('Service deleted successfully');
        } else {
            const data = await response.json();
            alert(data.message || 'Error deleting service');
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        alert('Error deleting service');
    }
}

// Service Image Handling
let uploadedServiceImageUrls = [];

export function handleServiceImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('serviceImagePreview');
    if (!preview) return;

    const startIndex = preview.querySelectorAll('.image-preview-item').length;

    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (fileEvent) => {
            createImagePreviewItem(preview, fileEvent.target.result, startIndex + index, false, 'serviceImagePreview');
        };
        reader.readAsDataURL(file);
    });
}

export function displayServiceImagePreviews(imageUrls, previewId = 'serviceImagePreview') {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    const existingItems = preview.querySelectorAll('[data-existing="true"]');
    existingItems.forEach(item => item.remove());

    imageUrls.forEach((url, index) => {
        createImagePreviewItem(preview, url, index, true, previewId);
    });
}

export async function uploadServiceImages(imageFiles) {
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

// Global window assignments for onclick handlers
window.editService = editService;
window.deleteService = deleteService;
