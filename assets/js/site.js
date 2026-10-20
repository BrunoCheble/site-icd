// Igreja Cidade de David: the menu, the verses, the ministries' pages and the reveal on scroll (no framework).
(() => {
    const nav = document.getElementById('nav');
    const links = document.getElementById('nav-links');
    const toggle = document.getElementById('nav-toggle');

    // The top bar turns white once the video is passed.
    const solid = () => nav.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.6);
    solid();
    window.addEventListener('scroll', solid, { passive: true });

    // Menu on phones.
    toggle.addEventListener('click', () => {
        const open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open);
        nav.classList.toggle('is-solid', open || window.scrollY > window.innerHeight * 0.6);
    });
    links.addEventListener('click', (event) => {
        if (event.target.closest('a')) { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); solid(); }
    });

    // The section on screen, marked in the menu.
    const sections = [...links.querySelectorAll('a')].map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const mark = new IntersectionObserver((entries) => {
        entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
            links.querySelectorAll('a').forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((section) => mark.observe(section));

    // Verses: one after the other, every 7 seconds, or by the arrows and dots.
    const verses = [...document.querySelectorAll('.verse')];
    const dots = document.querySelector('.verses-dots');
    let current = 0;
    let timer;
    const show = (n) => {
        current = (n + verses.length) % verses.length;
        verses.forEach((verse, i) => verse.classList.toggle('is-active', i === current));
        [...dots.children].forEach((dot, i) => dot.classList.toggle('is-active', i === current));
        clearInterval(timer);
        timer = setInterval(() => show(current + 1), 7000);
    };
    verses.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `${i + 1}`);
        dot.addEventListener('click', () => show(i));
        dots.appendChild(dot);
    });
    document.querySelectorAll('[data-verse]').forEach((arrow) => arrow.addEventListener('click', () => show(current + Number(arrow.dataset.verse))));
    show(0);

    // The ministries' pages and the biography; the phone's back button closes them.
    const open = (id) => {
        const dialog = document.getElementById(id);
        if (!dialog) return;
        dialog.showModal();
        dialog.querySelector('.dlg-body').scrollTop = 0;
        document.body.classList.add('has-dialog');
        history.pushState({ dialog: id }, '');
    };
    document.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-open]');
        if (opener) open(opener.dataset.open);
        if (event.target.closest('[data-close]')) history.back();
    });
    document.querySelectorAll('.dlg').forEach((dialog) => {
        dialog.addEventListener('close', () => document.body.classList.remove('has-dialog'));
        // A click outside the window closes it.
        dialog.addEventListener('click', (event) => { if (event.target === dialog) history.back(); });
        dialog.addEventListener('cancel', (event) => { event.preventDefault(); history.back(); });
        // One section open at a time.
        dialog.querySelectorAll('details').forEach((details) => details.addEventListener('toggle', () => {
            if (details.open) dialog.querySelectorAll('details[open]').forEach((other) => { if (other !== details) other.open = false; });
        }));
    });
    window.addEventListener('popstate', () => document.querySelectorAll('.dlg[open]').forEach((dialog) => dialog.close()));

    // Cards and blocks appear as the page scrolls.
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((element) => reveal.observe(element));
})();
