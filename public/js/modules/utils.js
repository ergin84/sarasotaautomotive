// Utility Functions

// Escape HTML to prevent XSS
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format car status
export function formatCarStatus(status) {
    if (status === 'sold') return 'SOLD OUT';
    if (status === 'coming_soon') return 'COMING SOON';
    return (status || '').toUpperCase();
}

// Format currency
export function formatCurrency(value) {
    if (value === null || value === undefined || value === '') {
        return 'Price not set';
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
        return value;
    }
    return `$${number.toLocaleString()}`;
}

// Format request status label
export function formatRequestStatusLabel(status) {
    const REQUEST_STATUS_OPTIONS = [
        { value: 'new', label: 'New' },
        { value: 'contacted', label: 'Client contacted' },
        { value: 'ongoing', label: 'Ongoing process' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'closed', label: 'Closed' }
    ];
    
    const option = REQUEST_STATUS_OPTIONS.find(opt => opt.value === status);
    if (option) {
        return option.label;
    }
    if (status === 'pending') return 'New';
    if (status === 'completed') return 'Closed';
    return status || '';
}

// Build telephone href
export function buildTelHref(phoneNumber) {
    if (!phoneNumber) return '';

    const trimmed = phoneNumber.trim();
    if (!trimmed) return '';

    let normalized = trimmed.replace(/[^0-9+]/g, '');
    if (normalized.startsWith('+')) {
        const rest = normalized.slice(1).replace(/[^0-9]/g, '');
        normalized = rest ? `+${rest}` : '';
    } else {
        normalized = normalized.replace(/[^0-9]/g, '');
    }

    return normalized ? `tel:${normalized}` : '';
}

// Build directions URL
export function buildDirectionsUrl(address) {
    if (!address) return '';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

// Hex to RGB conversion
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// RGB to Hex conversion
export function rgbToHex(r, g, b) {
    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Parse RGBA string
export function parseRgba(rgbaString) {
    const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1
        };
    }
    return null;
}

// Format privacy policy text
export function formatPrivacyPolicy(text) {
    if (!text) return '';
    
    return text
        .split('\n\n')
        .map(para => {
            const trimmed = para.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('## ')) {
                return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
            }
            if (trimmed.startsWith('# ')) {
                return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
            }
            return `<p>${formatParagraphContent(trimmed)}</p>`;
        })
        .filter(para => para)
        .join('\n');
}

// Format paragraph content
export function formatParagraphContent(text) {
    let formatted = text;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, (_, content) => `<strong>${escapeHtml(content)}</strong>`);
    formatted = formatted.replace(/__(.*?)__/g, (_, content) => `<strong>${escapeHtml(content)}</strong>`);
    
    const parts = formatted.split(/(<strong>.*?<\/strong>)/);
    return parts.map(part => {
        if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
            return part;
        }
        return escapeHtml(part);
    }).join('');
}

// Format strong text
export function formatStrongText(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}
