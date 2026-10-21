const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.mobile-menu-button');
const navLinks = document.querySelector('.nav-links');

const waFloat = document.querySelector('.whatsapp-float');
const pageFooter = document.querySelector('body > footer');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canTuck = header && !document.body.classList.contains('room-page');
let lastScrollY = window.scrollY;
let footerInView = false;
let scrollFrame = 0;

function updateHeader() {
    scrollFrame = 0;
    const y = window.scrollY;
    // Read layout before any class/style writes.
    const footerTop = footerInView ? pageFooter.getBoundingClientRect().top : Infinity;
    if (header) {
        header.classList.toggle('scrolled', y > 24);
        // Home page: tuck the header while reading down, bring it back on any scroll up.
        if (canTuck && Math.abs(y - lastScrollY) > 6) {
            header.classList.toggle('is-tucked', y > lastScrollY && y > window.innerHeight * 0.6 && !reduceMotion.matches && !header.classList.contains('menu-open'));
            lastScrollY = y;
        }
    }
    // Dock the WhatsApp button on top of the footer so it never covers footer text.
    if (waFloat) {
        const lift = Math.max(0, window.innerHeight - footerTop);
        waFloat.style.translate = lift ? `0 ${-lift}px` : '';
    }
}

function requestHeaderUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
}

updateHeader();
window.addEventListener('scroll', requestHeaderUpdate, { passive: true });
window.addEventListener('resize', requestHeaderUpdate, { passive: true });

if (waFloat && pageFooter && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
        footerInView = entry.isIntersecting;
        requestHeaderUpdate();
    }).observe(pageFooter);
}

if (menuButton && header && navLinks) {
    const setMenu = open => {
        header.classList.toggle('menu-open', open);
        header.classList.remove('is-tucked');
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };

    menuButton.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setMenu(false));
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && header.classList.contains('menu-open')) {
            setMenu(false);
            menuButton.focus();
        }
    });
}

// Scroll-spy: mark the nav link whose section crosses the middle of the viewport.
const spyLinks = navLinks ? [...navLinks.querySelectorAll('a[href^="#"]')] : [];
if ('IntersectionObserver' in window && spyLinks.length) {
    const spy = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const link = spyLinks.find(item => item.hash === `#${entry.target.id}`);
            if (link) link.classList.toggle('is-active', entry.isIntersecting);
        });
    }, { rootMargin: '-45% 0px -54% 0px' });
    spyLinks.forEach(link => {
        const target = document.getElementById(link.hash.slice(1));
        if (target) spy.observe(target);
    });
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealItems.length) {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealItems.forEach(item => revealObserver.observe(item));
} else {
    revealItems.forEach(item => item.classList.add('is-visible'));
}

document.querySelectorAll('[data-year]').forEach(year => {
    year.textContent = new Date().getFullYear();
});

const galleryImages = [...document.querySelectorAll('.room-gallery .gallery-item img')];
if (galleryImages.length) {
    const dialog = document.createElement('dialog');
    dialog.className = 'image-lightbox';
    dialog.setAttribute('aria-label', 'Room photo viewer');
    dialog.innerHTML = `
        <div class="lightbox-toolbar">
            <span class="lightbox-caption" aria-live="polite"></span>
            <div class="lightbox-controls">
                <button type="button" data-action="previous" aria-label="Previous photo">‹</button>
                <button type="button" data-action="next" aria-label="Next photo">›</button>
                <button type="button" data-action="zoom-out" aria-label="Zoom out">−</button>
                <button type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
                <button type="button" data-action="reset" aria-label="Reset zoom">↺</button>
                <button type="button" data-action="close" aria-label="Close photo viewer">×</button>
            </div>
        </div>
        <div class="lightbox-viewport"><img alt="" draggable="false"></div>`;
    document.body.append(dialog);

    const viewport = dialog.querySelector('.lightbox-viewport');
    const fullImage = viewport.querySelector('img');
    const caption = dialog.querySelector('.lightbox-caption');
    const pointers = new Map();
    const state = { index: 0, zoom: 1, x: 0, y: 0 };
    let lastTrigger = null;
    let gesture = null;

    function renderZoom() {
        fullImage.style.setProperty('--zoom', state.zoom);
        fullImage.style.setProperty('--pan-x', `${state.x}px`);
        fullImage.style.setProperty('--pan-y', `${state.y}px`);
    }

    function resetZoom() {
        state.zoom = 1;
        state.x = 0;
        state.y = 0;
        renderZoom();
    }

    function showImage(index) {
        state.index = (index + galleryImages.length) % galleryImages.length;
        const source = galleryImages[state.index];
        fullImage.src = source.currentSrc || source.src;
        fullImage.alt = source.alt;
        caption.textContent = `${state.index + 1} / ${galleryImages.length} · ${source.alt}`;
        resetZoom();
    }

    function zoomAt(nextZoom, clientX, clientY) {
        const zoom = Math.min(5, Math.max(1, nextZoom));
        const rect = viewport.getBoundingClientRect();
        const pointX = clientX - rect.left - rect.width / 2;
        const pointY = clientY - rect.top - rect.height / 2;
        const ratio = zoom / state.zoom;
        state.x = zoom === 1 ? 0 : pointX - (pointX - state.x) * ratio;
        state.y = zoom === 1 ? 0 : pointY - (pointY - state.y) * ratio;
        state.zoom = zoom;
        renderZoom();
    }

    galleryImages.forEach((img, index) => {
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'gallery-trigger';
        trigger.setAttribute('aria-label', `View and zoom ${img.alt}`);
        img.parentNode.insertBefore(trigger, img);
        trigger.append(img);
        trigger.addEventListener('click', () => {
            lastTrigger = trigger;
            showImage(index);
            dialog.showModal();
            dialog.querySelector('[data-action="close"]').focus();
        });
    });

    dialog.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', () => {
            switch (button.dataset.action) {
                case 'close': dialog.close(); break;
                case 'previous': showImage(state.index - 1); break;
                case 'next': showImage(state.index + 1); break;
                case 'zoom-in': zoomAt(state.zoom * 1.5, viewport.getBoundingClientRect().left + viewport.clientWidth / 2, viewport.getBoundingClientRect().top + viewport.clientHeight / 2); break;
                case 'zoom-out': zoomAt(state.zoom / 1.5, viewport.getBoundingClientRect().left + viewport.clientWidth / 2, viewport.getBoundingClientRect().top + viewport.clientHeight / 2); break;
                case 'reset': resetZoom(); break;
            }
        });
    });

    viewport.addEventListener('wheel', event => {
        event.preventDefault();
        zoomAt(state.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15), event.clientX, event.clientY);
    }, { passive: false });
    viewport.addEventListener('dblclick', event => {
        zoomAt(state.zoom > 1 ? 1 : 2.5, event.clientX, event.clientY);
    });

    function startGesture() {
        const active = [...pointers.values()];
        if (active.length === 1) {
            gesture = { x: active[0].x, y: active[0].y, panX: state.x, panY: state.y };
        } else if (active.length === 2) {
            const [a, b] = active;
            gesture = {
                distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
                centerX: (a.x + b.x) / 2,
                centerY: (a.y + b.y) / 2,
                zoom: state.zoom,
                panX: state.x,
                panY: state.y
            };
        }
    }

    viewport.addEventListener('pointerdown', event => {
        viewport.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        viewport.classList.add('is-dragging');
        startGesture();
    });
    viewport.addEventListener('pointermove', event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const active = [...pointers.values()];
        if (active.length === 1 && state.zoom > 1) {
            state.x = gesture.panX + active[0].x - gesture.x;
            state.y = gesture.panY + active[0].y - gesture.y;
        } else if (active.length === 2) {
            const [a, b] = active;
            const centerX = (a.x + b.x) / 2;
            const centerY = (a.y + b.y) / 2;
            state.zoom = Math.min(5, Math.max(1, gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.distance));
            const ratio = state.zoom / gesture.zoom;
            const rect = viewport.getBoundingClientRect();
            const viewCenterX = rect.left + rect.width / 2;
            const viewCenterY = rect.top + rect.height / 2;
            state.x = state.zoom === 1 ? 0 : centerX - viewCenterX - (gesture.centerX - viewCenterX - gesture.panX) * ratio;
            state.y = state.zoom === 1 ? 0 : centerY - viewCenterY - (gesture.centerY - viewCenterY - gesture.panY) * ratio;
        }
        renderZoom();
    });
    function endPointer(event) {
        pointers.delete(event.pointerId);
        if (!pointers.size) viewport.classList.remove('is-dragging');
        startGesture();
    }
    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);

    dialog.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(state.index - 1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); showImage(state.index + 1); }
        if (event.key === '+' || event.key === '=') { event.preventDefault(); dialog.querySelector('[data-action="zoom-in"]').click(); }
        if (event.key === '-') { event.preventDefault(); dialog.querySelector('[data-action="zoom-out"]').click(); }
    });
    dialog.addEventListener('close', () => {
        pointers.clear();
        viewport.classList.remove('is-dragging');
        lastTrigger?.focus();
    });
}
