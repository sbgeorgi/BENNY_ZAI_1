const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.mobile-menu-button');
const navLinks = document.querySelector('.nav-links');

function updateHeader() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 24);
}

if (header) {
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
}

if (menuButton && header && navLinks) {
    menuButton.addEventListener('click', () => {
        const open = header.classList.toggle('menu-open');
        menuButton.setAttribute('aria-expanded', String(open));
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            header.classList.remove('menu-open');
            menuButton.setAttribute('aria-expanded', 'false');
        });
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
    }, { threshold: 0.12 });
    revealItems.forEach(item => revealObserver.observe(item));
} else {
    revealItems.forEach(item => item.classList.add('is-visible'));
}

document.querySelectorAll('[data-year]').forEach(year => {
    year.textContent = new Date().getFullYear();
});

if (window.MangroveCopy) {
    window.MangroveCopy.load().then(window.MangroveCopy.apply);
}
