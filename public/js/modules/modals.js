// Modals Module

export function initializeModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close-modal');

    closeButtons.forEach(btn => {
        if (btn.getAttribute('data-modal')) {
            btn.addEventListener('click', () => {
                closeModal(btn.getAttribute('data-modal'));
            });
        } else {
            btn.addEventListener('click', () => {
                modals.forEach(modal => modal.style.display = 'none');
            });
        }
    });

    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// Custom Confirmation Modal
let confirmationResolve = null;

export function showCustomConfirm(title, message, details = null, iconType = 'warning') {
    return new Promise((resolve) => {
        confirmationResolve = resolve;

        const modal = document.getElementById('confirmationModal');
        const modalTitle = document.getElementById('confirmationModalTitle');
        const modalMessage = document.getElementById('confirmationModalMessage');
        const modalDetails = document.getElementById('confirmationModalDetails');
        const modalIcon = document.getElementById('confirmationModalIcon');
        const confirmBtn = document.getElementById('confirmationModalConfirm');
        const cancelBtn = document.getElementById('confirmationModalCancel');
        const closeBtn = document.getElementById('confirmationModalClose');

        modalTitle.textContent = title || 'Confirm Action';
        modalMessage.textContent = message || '';

        modalIcon.className = `custom-modal-icon ${iconType}`;

        if (details && Array.isArray(details) && details.length > 0) {
            modalDetails.innerHTML = '<ul>' + details.map(detail => `<li>${detail}</li>`).join('') + '</ul>';
            modalDetails.style.display = 'block';
        } else {
            modalDetails.style.display = 'none';
        }

        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newCloseBtn = closeBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

        newConfirmBtn.addEventListener('click', () => {
            hideCustomConfirm();
            if (confirmationResolve) {
                confirmationResolve(true);
                confirmationResolve = null;
            }
        });

        newCancelBtn.addEventListener('click', () => {
            hideCustomConfirm();
            if (confirmationResolve) {
                confirmationResolve(false);
                confirmationResolve = null;
            }
        });

        newCloseBtn.addEventListener('click', () => {
            hideCustomConfirm();
            if (confirmationResolve) {
                confirmationResolve(false);
                confirmationResolve = null;
            }
        });

        modal.addEventListener('click', function backdropClick(e) {
            if (e.target === modal) {
                hideCustomConfirm();
                modal.removeEventListener('click', backdropClick);
                if (confirmationResolve) {
                    confirmationResolve(false);
                    confirmationResolve = null;
                }
            }
        });

        modal.classList.add('active');
    });
}

export function hideCustomConfirm() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Global window assignments for onclick handlers
window.closeModal = closeModal;
window.openModal = openModal;
