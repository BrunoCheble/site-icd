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
    const open = (id, replace = false) => {
        const dialog = document.getElementById(id);
        if (!dialog) return;
        document.querySelectorAll('.dlg[open]').forEach((other) => other.close());
        dialog.showModal();
        dialog.querySelector('.dlg-body').scrollTop = 0;
        markSection(dialog);
        document.body.classList.add('has-dialog');
        if (replace) history.replaceState({ dialog: id }, '');
        else history.pushState({ dialog: id }, '');
    };
    // The section being read, marked in the window's index.
    const markSection = (dialog) => {
        const body = dialog.querySelector('.dlg-body');
        const parts = [...body.querySelectorAll('.dlg-part')];
        const top = body.getBoundingClientRect().top + 80;
        const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;
        const here = atEnd ? parts.at(-1) : parts.filter((part) => part.getBoundingClientRect().top <= top).at(-1) || parts[0];
        dialog.querySelectorAll('.dlg-toc a').forEach((link) => {
            const on = here && link.dataset.goto === here.id;
            link.classList.toggle('is-current', on);
            if (on) link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    };
    document.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-open]');
        if (opener) open(opener.dataset.open);
        const next = event.target.closest('[data-switch]');
        if (next) open(next.dataset.switch, true);
        const goto = event.target.closest('[data-goto]');
        if (goto) {
            event.preventDefault();
            document.getElementById(goto.dataset.goto)?.scrollIntoView({ block: 'start' });
        }
        if (event.target.closest('[data-close]')) history.back();
    });
    document.querySelectorAll('.dlg').forEach((dialog) => {
        dialog.addEventListener('close', () => { if (!document.querySelector('.dlg[open]')) document.body.classList.remove('has-dialog'); });
        // A click outside the window closes it.
        dialog.addEventListener('click', (event) => { if (event.target === dialog) history.back(); });
        dialog.addEventListener('cancel', (event) => { event.preventDefault(); history.back(); });
        dialog.querySelector('.dlg-body').addEventListener('scroll', () => markSection(dialog), { passive: true });
    });
    window.addEventListener('popstate', () => document.querySelectorAll('.dlg[open]').forEach((dialog) => dialog.close()));

    // Members' announcements, from the church's system. Asked once, only when the section comes near, never twice at
    // the same time, and kept in this browser for 10 minutes (the system caches them too).
    const ads = document.getElementById('announcements');
    if (ads) {
        const KEY = 'icd-announcements-v2';
        const KEEP = 10 * 60 * 1000;
        const list = ads.querySelector('.ads');
        const filters = ads.querySelector('.ads-filters');
        const icons = { resume: 'fa-file-alt', service: 'fa-tools', donation: 'fa-hand-holding-heart', product: 'fa-tag' };
        const names = { resume: 'Currículo', service: 'Serviço', donation: 'Doação', product: 'Produto' };
        const escape = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const safeUrl = (url) => (/^https?:\/\//i.test(url || '') ? url : (url ? 'https://' + url : ''));
        let loading = null;
        let all = [];

        const card = (ad) => {
            // Every announcement has a picture in the same format (the system gives the default one when none was sent).
            const media = ad.image_url
                ? `<div class="ad-media"><img src="${escape(ad.image_url)}" alt="" loading="lazy"><span class="ad-type">${escape(names[ad.type] || ad.type_name)}</span></div>`
                : `<div class="ad-media"><i class="fas ${icons[ad.type] || 'fa-bullhorn'}"></i><span class="ad-type">${escape(names[ad.type] || ad.type_name)}</span></div>`;
            const actions = [
                ad.whatsapp ? `<a class="is-whatsapp" href="${escape(ad.whatsapp)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : '',
                ad.link ? `<a class="is-link" href="${escape(safeUrl(ad.link))}" target="_blank" rel="noopener nofollow"><i class="fas fa-external-link-alt"></i> Link</a>` : '',
                ad.pdf_url ? `<a class="is-link" href="${escape(ad.pdf_url)}" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> PDF</a>` : '',
            ].join('');
            return `<article class="ad">${media}<div class="ad-body"><h3>${escape(ad.title)}</h3><p class="ad-text">${escape(ad.description)}</p>
                <button type="button" class="ad-more" hidden>Ver mais</button><div class="ad-actions">${actions}</div></div></article>`;
        };
        const render = (type) => {
            const shown = type ? all.filter((ad) => ad.type === type) : all;
            list.innerHTML = shown.length ? shown.map(card).join('')
                : `<div class="ads-empty"><i class="fas fa-bullhorn"></i>Ainda não há anúncios. Seja o primeiro a anunciar!</div>`;
            // "Ver mais" only where the text is cut.
            list.querySelectorAll('.ad').forEach((ad) => {
                const text = ad.querySelector('.ad-text');
                const more = ad.querySelector('.ad-more');
                if (text.scrollHeight > text.clientHeight + 2) more.hidden = false;
                more.addEventListener('click', () => { const open = ad.classList.toggle('is-open'); more.textContent = open ? 'Ver menos' : 'Ver mais'; });
            });
            filters.querySelectorAll('button').forEach((button) => button.classList.toggle('is-active', (button.dataset.type || '') === (type || '')));
        };
        const show = (data) => {
            all = data;
            const types = [...new Set(all.map((ad) => ad.type))];
            filters.hidden = types.length < 2;
            filters.innerHTML = ['', ...types].map((type) => `<button type="button" data-type="${type}">${type ? escape(names[type] || type) : 'Todos'}</button>`).join('');
            filters.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => render(button.dataset.type)));
            render('');
        };
        const load = () => {
            if (loading) return loading;
            try {
                const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
                if (saved && Date.now() - saved.at < KEEP) { show(saved.data); return (loading = Promise.resolve()); }
            } catch (e) { /* no storage here: asked to the system */ }
            loading = fetch(ads.dataset.api, { headers: { Accept: 'application/json' } })
                .then((response) => { if (!response.ok) throw new Error(response.status); return response.json(); })
                .then(({ data }) => {
                    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* not kept */ }
                    show(data);
                })
                .catch(() => { list.innerHTML = '<div class="ads-empty"><i class="fas fa-wifi"></i>Não foi possível carregar os anúncios agora.</div>'; });
            return loading;
        };
        const near = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) { near.disconnect(); load(); }
        }, { rootMargin: '400px 0px' });
        near.observe(ads);
    }

    // Cards and blocks appear as the page scrolls.
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((element) => reveal.observe(element));
})();
