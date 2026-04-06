// Utils Module

export function updateMetaTags(settings) {
    if (settings.metaDescription) {
        const metaDesc = document.getElementById('metaDescription');
        if (metaDesc) metaDesc.setAttribute('content', settings.metaDescription);
    }

    if (settings.metaKeywords) {
        const metaKeywords = document.getElementById('metaKeywords');
        if (metaKeywords) metaKeywords.setAttribute('content', settings.metaKeywords);
    }

    if (settings.ogTitle) {
        const ogTitle = document.getElementById('ogTitle');
        if (ogTitle) ogTitle.setAttribute('content', settings.ogTitle);

        const twitterTitle = document.getElementById('twitterTitle');
        if (twitterTitle) twitterTitle.setAttribute('content', settings.ogTitle);
    }

    if (settings.ogDescription) {
        const ogDesc = document.getElementById('ogDescription');
        if (ogDesc) ogDesc.setAttribute('content', settings.ogDescription);

        const twitterDesc = document.getElementById('twitterDescription');
        if (twitterDesc) twitterDesc.setAttribute('content', settings.ogDescription);
    }

    if (settings.ogImage) {
        const ogImg = document.getElementById('ogImage');
        if (ogImg) {
            const imageUrl = settings.ogImage.startsWith('http')
                ? settings.ogImage
                : window.location.origin + settings.ogImage;
            ogImg.setAttribute('content', imageUrl);
        }

        const twitterImg = document.getElementById('twitterImage');
        if (twitterImg) {
            const imageUrl = settings.ogImage.startsWith('http')
                ? settings.ogImage
                : window.location.origin + settings.ogImage;
            twitterImg.setAttribute('content', imageUrl);
        }
    }

    if (settings.twitterCard) {
        const twitterCard = document.getElementById('twitterCard');
        if (twitterCard) twitterCard.setAttribute('content', settings.twitterCard);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);

    const twitterUrl = document.querySelector('meta[name="twitter:url"]');
    if (twitterUrl) twitterUrl.setAttribute('content', window.location.href);
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

export function buildDirectionsUrl(address) {
    if (!address) return '';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
