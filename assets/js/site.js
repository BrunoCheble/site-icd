// Igreja Cidade de David: the menu, the verses, the ministries' pages and the reveal on scroll (no framework).
(() => {
    const nav = document.getElementById('nav');
    const links = document.getElementById('nav-links');
    const toggle = document.getElementById('nav-toggle');

    // The top bar turns white once the video is passed.
    // Over the hero (the page's top): the bar is see-through, and its logo and the floating social links stay hidden
    // (the hero shows them large).
    const solid = () => {
        const below = window.scrollY > window.innerHeight * 0.6;
        nav.classList.toggle('is-solid', below);
        document.body.classList.toggle('at-top', !below);
    };
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

    // Members' announcements, from the church's system. Asked once per visit, only when the section comes near: the
    // copy kept in this browser shows at once and the current list replaces it when it changed (an approval shows on
    // the next visit). Not asked again within a minute (the system caches them too).
    const ads = document.getElementById('announcements');
    if (ads) {
        const KEY = 'icd-announcements-v3';
        const FRESH = 60 * 1000;
        const list = ads.querySelector('.board');
        const filters = ads.querySelector('.board-filters');
        const escape = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const safeUrl = (url) => (/^https?:\/\//i.test(url || '') ? url : (url ? 'https://' + url : ''));
        let loading = null;
        let all = [];

        const stars = (value) => [1, 2, 3, 4, 5].map((n) => `<i class="${value >= n - .25 ? 'fas fa-star' : value >= n - .75 ? 'fas fa-star-half-alt' : 'far fa-star'}"></i>`).join('');
        const card = (ad) => {
            // The category's picture (always: a donation's or a sale's photos go apart, as thumbnails that open a
            // gallery), its fields as tags, the ways to reach whoever announced, the members' stars, and a private
            // comment for the church's team.
            const photos = ad.photos || [];
            const media = `<div class="post-media"><img src="${escape(ad.image_url)}" alt="" loading="lazy"><span class="post-type">${escape(ad.type_name)}</span></div>`;
            const thumbs = photos.length ? `<div class="post-photos">${photos.map((url, i) => `<button type="button" data-gallery="${escape(ad.id)}" data-at="${i}" aria-label="Ver foto ${i + 1}"><img src="${escape(url)}" alt="" loading="lazy"></button>`).join('')}</div>` : '';
            const tags = (ad.details || []).map((line) => `<span title="${escape(line.label)}">${escape(line.short || line.value)}</span>`).join('');
            const actions = [
                ad.whatsapp ? `<a class="is-whatsapp" href="${escape(ad.whatsapp)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : '',
                ad.link ? `<a class="is-link" href="${escape(safeUrl(ad.link))}" target="_blank" rel="noopener nofollow"><i class="fas fa-external-link-alt"></i> Link</a>` : '',
                ad.pdf_url ? `<a class="is-link" href="${escape(ad.pdf_url)}" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> Currículo</a>` : '',
            ].join('');
            const rating = ad.rating || { count: 0 };
            const score = rating.count
                ? `<span class="post-stars" title="Avaliação dos membros">${stars(rating.average)} <b>${String(rating.average).replace('.', ',')}</b> <small>(${rating.count})</small></span>`
                : '<span class="post-stars is-empty">Ainda sem avaliações</span>';
            const talk = ad.ratings_url
                ? `<div class="post-score">${score}<button type="button" class="post-rate" data-rate="${escape(ad.id)}"><i class="far fa-star"></i> Avaliar</button></div>
                   <button type="button" class="post-comment" data-comment="${escape(ad.id)}"><i class="fas fa-lock"></i> Comentário privado para a equipa</button>`
                : '';
            return `<article class="post">${media}<div class="post-body"><h3>${escape(ad.title)}</h3><p class="post-text">${escape(ad.description)}</p>
                <button type="button" class="post-more" hidden>Ver mais</button>${thumbs}${tags ? `<div class="post-tags">${tags}</div>` : ''}
                <div class="post-actions">${actions}</div><div class="post-talk">${talk}</div></div></article>`;
        };
        // The row goes round by itself: the cards are repeated enough times to fill it, and once a whole set has
        // passed it jumps back by that set (they look the same, so it never ends). It stops while the mouse is over
        // it, while it is touched or dragged, and on a focused card; with few cards (or reduced motion) it stands still.
        const SPEED = 35; // px per second
        const still = window.matchMedia('(prefers-reduced-motion: reduce)');
        let shownCards = [];
        let setWidth = 0;
        let pos = 0;
        let resumeAt = 0;
        let frame = null;
        let visible = false;
        let last = 0;
        const hold = () => { resumeAt = Infinity; };
        const release = (delay = 2500) => { resumeAt = performance.now() + delay; };
        const wrap = () => {
            if (!setWidth) return;
            if (list.scrollLeft >= setWidth) list.scrollLeft -= setWidth;
            else if (list.scrollLeft <= 0) list.scrollLeft += setWidth;
        };
        const tick = (now) => {
            frame = null;
            if (!setWidth || !visible) return;
            const dt = Math.min(now - (last || now), 100);
            last = now;
            if (now >= resumeAt && !still.matches) {
                if (resumeAt) { pos = list.scrollLeft; resumeAt = 0; }
                pos += (SPEED * dt) / 1000;
                if (pos >= setWidth) pos -= setWidth;
                list.scrollLeft = pos;
            }
            frame = requestAnimationFrame(tick);
        };
        const run = () => { if (!frame && setWidth && visible) { last = 0; frame = requestAnimationFrame(tick); } };
        const loop = () => {
            setWidth = 0;
            list.classList.add('is-static');
            list.querySelectorAll('[data-copy]').forEach((copy) => copy.remove());
            const cards = [...list.querySelectorAll('.post')];
            if (cards.length < 2) return;
            const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
            const width = cards.reduce((sum, ad) => sum + ad.offsetWidth + gap, 0);
            list.classList.remove('is-static');
            if (width <= list.clientWidth) { list.classList.add('is-static'); return; }
            // Copies: hidden from screen readers and out of the tab order; "Ver mais" works on them too.
            const copies = Math.ceil(list.clientWidth / width) + 1;
            for (let n = 0; n < copies; n++) {
                cards.forEach((ad) => {
                    const copy = ad.cloneNode(true);
                    copy.dataset.copy = '';
                    copy.setAttribute('aria-hidden', 'true');
                    copy.querySelectorAll('a, button').forEach((el) => el.setAttribute('tabindex', '-1'));
                    list.appendChild(copy);
                });
            }
            list.querySelectorAll('.post').forEach(more);
            setWidth = width;
            pos = list.scrollLeft = 0;
            run();
        };
        // "Ver mais" only where the text is cut.
        const more = (ad) => {
            const text = ad.querySelector('.post-text');
            const button = ad.querySelector('.post-more');
            if (button.dataset.ready) return;
            button.dataset.ready = '1';
            if (text.scrollHeight > text.clientHeight + 2) button.hidden = false;
            button.addEventListener('click', () => { const open = ad.classList.toggle('is-open'); button.textContent = open ? 'Ver menos' : 'Ver mais'; });
        };
        list.addEventListener('mouseenter', hold);
        list.addEventListener('mouseleave', () => release(600));
        list.addEventListener('pointerdown', hold);
        list.addEventListener('touchstart', hold, { passive: true });
        list.addEventListener('touchend', () => release());
        list.addEventListener('focusin', hold);
        list.addEventListener('focusout', () => release());
        list.addEventListener('scroll', () => { if (resumeAt) wrap(); }, { passive: true });
        new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run(); }).observe(list);
        let resized;
        window.addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => shownCards.length && loop(), 200); });

        const render = (type) => {
            shownCards = type ? all.filter((ad) => ad.type === type) : all;
            list.innerHTML = shownCards.length ? shownCards.map(card).join('')
                : `<div class="board-empty"><i class="fas fa-bullhorn"></i>Ainda não há anúncios. Seja o primeiro a anunciar!</div>`;
            list.querySelectorAll('.post').forEach(more);
            loop();
            filters.querySelectorAll('button').forEach((button) => button.classList.toggle('is-active', (button.dataset.type || '') === (type || '')));
        };
        // The ones about to expire first; those without an end date last (newest first among equals, as the system sends them).
        const ending = (ad) => ad.expires_at ? String(ad.expires_at).slice(0, 10) : '9999-12-31';
        const show = (data) => {
            all = [...data].sort((a, b) => ending(a).localeCompare(ending(b)));
            const types = [...new Set(all.map((ad) => ad.type))];
            filters.hidden = types.length < 2;
            const name = (type) => all.find((ad) => ad.type === type)?.type_name || type;
            filters.innerHTML = ['', ...types].map((type) => `<button type="button" data-type="${escape(type)}">${type ? escape(name(type)) : 'Todos'}</button>`).join('');
            filters.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => render(button.dataset.type)));
            render('');
        };
        const load = () => {
            if (loading) return loading;
            let saved = null;
            try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* no storage here */ }
            if (saved) show(saved.data);
            if (saved && Date.now() - saved.at < FRESH) return (loading = Promise.resolve());
            loading = fetch(ads.dataset.api, { headers: { Accept: 'application/json' }, cache: 'no-cache' })
                .then((response) => { if (!response.ok) throw new Error(response.status); return response.json(); })
                .then(({ data }) => {
                    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* not kept */ }
                    if (!saved || JSON.stringify(saved.data) !== JSON.stringify(data)) show(data);
                })
                .catch(() => {
                    if (!saved) list.innerHTML = '<div class="board-empty"><i class="fas fa-wifi"></i>Não foi possível carregar os anúncios agora.</div>';
                });
            return loading;
        };
        // On a card (the copies of the endless row too): the photos open in a gallery; "Avaliar" and the private
        // comment open the form, which asks for the member's NIF.
        const dialog = document.getElementById('comment-dialog');
        const form = dialog?.querySelector('form');
        const message = dialog?.querySelector('.cmt-msg');
        const gallery = document.getElementById('photo-dialog');
        // The site's own forms to announce and to become a member, sent to the church's system (members by the NIF;
        // both wait for the team). Errors show under their fields.
        const API = new URL(ads.dataset.api).origin + '/api/public';
        const announceBox = document.getElementById('announce-dialog');
        const prayerBox = document.getElementById('prayer-dialog');
        const memberBox = document.getElementById('member-dialog');
        const ICONS = { service: 'fa-tools', lessons: 'fa-graduation-cap', resume: 'fa-file-alt', job: 'fa-briefcase', donation: 'fa-hand-holding-heart', sale: 'fa-tag' };
        const send = async (url, body) => {
            const json = !(body instanceof FormData);
            const response = await fetch(url, { method: 'POST', headers: json ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' }, body: json ? JSON.stringify(body) : body });
            return { response, answer: await response.json().catch(() => ({})) };
        };
        const clearErrors = (box) => {
            box.querySelectorAll('.field-error').forEach((error) => error.remove());
            box.querySelectorAll('.has-error').forEach((field) => field.classList.remove('has-error'));
            const note = box.querySelector('.cmt-msg');
            note.textContent = '';
            note.className = 'cmt-msg';
        };
        const fieldError = (field, text) => {
            field.classList.add('has-error');
            const error = document.createElement('p');
            error.className = 'field-error';
            error.textContent = text;
            field.appendChild(error);
        };
        // The system's errors ("details.area", "photos.1"…) under their fields; the first one's field is returned.
        const showErrors = (box, errors) => {
            clearErrors(box);
            let first = null;
            Object.entries(errors || {}).forEach(([key, list]) => {
                const field = box.querySelector(`[data-error-for="${key.replace(/\.\d+$/, '')}"]`);
                if (!field) { box.querySelector('.cmt-msg').textContent = list[0]; box.querySelector('.cmt-msg').className = 'cmt-msg is-error'; return; }
                if (!field.querySelector('.field-error')) fieldError(field, list[0]);
                first = first || field;
            });
            return first;
        };
        const failed = (box, response) => {
            const note = box.querySelector('.cmt-msg');
            note.className = 'cmt-msg is-error';
            note.textContent = response?.status === 429 ? 'Foram enviados muitos pedidos seguidos. Tente de novo daqui a um minuto.'
                : 'Não foi possível enviar agora. Verifique a ligação à internet e tente de novo.';
        };
        const openBox = (box) => {
            [dialog, announceBox, memberBox, prayerBox].forEach((other) => other !== box && other?.open && other.close());
            hold();
            if (!box.open) box.showModal();
        };
        const done = (box, answer) => {
            box.querySelector('.form-body').hidden = true;
            box.querySelector('form > .cmt-actions').hidden = true;
            box.querySelector('.steps')?.setAttribute('hidden', '');
            const panel = box.querySelector('.form-done');
            panel.querySelector('h3').textContent = answer.title || 'Obrigado!';
            panel.querySelector('.done-text').textContent = answer.message || '';
            const note = panel.querySelector('.done-note');
            if (note && 'note' in answer) note.textContent = answer.note || '';
            panel.hidden = false;
        };
        const restart = (box) => {
            box.querySelector('form').reset();
            clearErrors(box);
            box.querySelector('.form-body').hidden = false;
            box.querySelector('form > .cmt-actions').hidden = false;
            box.querySelector('.steps')?.removeAttribute('hidden');
            box.querySelector('.form-done').hidden = true;
        };

        // ---- Announce ----
        const aForm = announceBox?.querySelector('form');
        const nifState = aForm?.querySelector('.nif-state');
        let categories = null;
        let photos = [];
        let checkedNif = '';
        const loadCategories = () => (categories = categories || fetch(API + '/announcement-categories', { headers: { Accept: 'application/json' } })
            .then((response) => response.json()).then(({ data }) => data).catch(() => { categories = null; return {}; }));
        const fieldHtml = (name, field) => {
            const label = `<span class="lbl">${escape(field.label)}${field.required ? '' : ' <em>(opcional)</em>'}</span>`;
            const attrs = `name="details[${escape(name)}]"${field.required ? ' required' : ''}`;
            if (field.type === 'select' || field.type === 'yesno') {
                const options = field.type === 'yesno' ? { 1: 'Sim', 0: 'Não' } : field.options;
                return `<label class="cmt-field" data-error-for="details.${escape(name)}">${label}<select ${attrs}><option value="">Escolha…</option>${Object.entries(options).map(([value, text]) => `<option value="${escape(value)}">${escape(text)}</option>`).join('')}</select></label>`;
            }
            return `<label class="cmt-field" data-error-for="details.${escape(name)}">${label}<input ${attrs} maxlength="${field.max || 120}" placeholder="${escape(field.placeholder || '')}"></label>`;
        };
        // Examples of a title and a description, by category.
        const HINTS = {
            service: ['Ex. Pintor profissional', 'Ex. Faço pinturas de interiores e exteriores, com acabamento cuidado. Orçamento sem compromisso.'],
            lessons: ['Ex. Explicações de Matemática', 'Ex. Explicações para o 2.º e 3.º ciclo e secundário, com preparação para testes e exames.'],
            resume: ['Ex. Procuro trabalho em restauração', 'Ex. Tenho experiência em atendimento ao público e estou disponível para começar de imediato.'],
            job: ['Ex. Ajudante de cozinha', 'Ex. Restaurante em Sintra procura ajudante de cozinha para o turno do almoço. Damos formação.'],
            donation: ['Ex. Roupa de bebé', 'Ex. Roupa dos 0 aos 12 meses, em bom estado. É só combinar a recolha.'],
            sale: ['Ex. Bicicleta de criança', 'Ex. Bicicleta para 6 a 9 anos, pouco usada, com rodinhas.'],
        };
        // Three places for photos: the ones chosen (with a button to take them out), then one to add more.
        const renderPhotos = () => {
            const slots = [0, 1, 2].map((i) => (photos[i]
                ? `<span class="photo-slot"><img src="${URL.createObjectURL(photos[i])}" alt=""><button type="button" data-unpick="${i}" aria-label="Remover foto"><i class="fas fa-times"></i></button></span>`
                : i === photos.length ? '<button type="button" class="photo-slot is-add" data-add-photo><i class="fas fa-plus"></i><span>Adicionar foto</span></button>' : '<span class="photo-slot is-empty"></span>'));
            aForm.querySelector('.photo-slots').innerHTML = slots.join('');
        };
        const chooseCategory = async (key) => {
            const category = (await loadCategories())[key];
            if (!category) return;
            aForm.querySelector('.cat-fields').innerHTML = Object.entries(category.fields).map(([name, field]) => fieldHtml(name, field)).join('');
            aForm.querySelectorAll('[data-after-category]').forEach((part) => { part.hidden = false; });
            aForm.querySelector('[data-before-category]').hidden = true;
            const [title, text] = HINTS[key] || ['', ''];
            aForm.elements.title.placeholder = title;
            aForm.elements.description.placeholder = text;
            aForm.querySelector('.photo-field').hidden = !category.photos;
            aForm.querySelector('.pdf-field').hidden = !category.pdf;
            aForm.querySelector('.sale-note').hidden = !category.limit;
            if (!category.photos) photos = [];
            renderPhotos();
        };
        // Back to the start: only the NIF and the categories.
        const resetAnnounce = () => {
            photos = [];
            checkedNif = '';
            nifState.hidden = true;
            aForm.querySelector('.cat-fields').innerHTML = '';
            aForm.querySelectorAll('[data-after-category], .photo-field, .pdf-field, .sale-note').forEach((part) => { part.hidden = true; });
            aForm.querySelector('[data-before-category]').hidden = false;
            aForm.querySelector('.file-name').textContent = 'Escolher o currículo em PDF';
            aForm.querySelector('.count').textContent = '0 / 1000';
        };
        const openAnnounce = async (nif = '') => {
            if (!announceBox) return;
            if (!announceBox.querySelector('.form-done').hidden) { restart(announceBox); resetAnnounce(); }
            openBox(announceBox);
            const data = await loadCategories();
            const grid = aForm.querySelector('.cat-grid');
            if (!grid.children.length) {
                grid.innerHTML = Object.entries(data).map(([key, category]) => `<label><input type="radio" name="type" value="${escape(key)}" required><span><i class="fas ${ICONS[key] || 'fa-bullhorn'}"></i>${escape(category.label)}</span></label>`).join('');
            }
            if (nif) { aForm.elements.member_document.value = nif; checkNif(); }
        };
        // The NIF checked once it has its 9 digits: a member's, or the registration offered.
        const checkNif = async () => {
            const nif = aForm.elements.member_document.value.replace(/\D/g, '');
            if (nif.length !== 9) { nifState.hidden = true; checkedNif = ''; return; }
            if (nif === checkedNif) return;
            checkedNif = nif;
            try {
                const { exists } = await (await fetch(`${API}/members/check/${nif}`, { headers: { Accept: 'application/json' } })).json();
                nifState.hidden = false;
                nifState.className = 'nif-state ' + (exists ? 'is-ok' : 'is-off');
                nifState.innerHTML = exists ? '<i class="fas fa-check-circle"></i> Membro encontrado.'
                    : '<i class="fas fa-user-plus"></i> Não encontrámos este NIF nos membros. <button type="button" data-form="member">Registar como membro</button>';
            } catch (e) { nifState.hidden = true; checkedNif = ''; }
        };
        aForm?.elements.member_document.addEventListener('input', checkNif);
        // The description's length, and the mobile number written in groups (912 345 678).
        aForm?.elements.description.addEventListener('input', (event) => { aForm.querySelector('.count').textContent = `${event.target.value.length} / 1000`; });
        aForm?.elements.contact.addEventListener('input', (event) => {
            const digits = event.target.value.replace(/\D/g, '');
            if (/^9\d{0,8}$/.test(digits)) event.target.value = digits.replace(/^(\d{3})(\d{1,3})?(\d{1,3})?$/, (all, a, b, c) => [a, b, c].filter(Boolean).join(' '));
        });
        aForm?.addEventListener('change', (event) => {
            if (event.target.name === 'type') chooseCategory(event.target.value);
            if (event.target.classList.contains('photo-input')) {
                photos = [...photos, ...event.target.files].slice(0, 3);
                event.target.value = '';
                renderPhotos();
            }
            if (event.target.name === 'image_path') aForm.querySelector('.file-name').textContent = event.target.files[0]?.name || 'Escolher o currículo em PDF';
        });
        aForm?.addEventListener('click', (event) => {
            const unpick = event.target.closest('[data-unpick]');
            if (unpick) { photos.splice(Number(unpick.dataset.unpick), 1); renderPhotos(); }
            if (event.target.closest('[data-add-photo]')) aForm.querySelector('.photo-input').click();
            if (event.target.closest('[data-again]')) { restart(announceBox); resetAnnounce(); }
        });
        aForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = aForm.querySelector('[type="submit"]');
            const body = new FormData(aForm);
            if (aForm.querySelector('.pdf-field').hidden || !aForm.elements.image_path.files.length) body.delete('image_path');
            photos.forEach((file) => body.append('photos[]', file));
            button.disabled = true;
            try {
                const { response, answer } = await send(API + '/announcements', body);
                if (response.ok) { done(announceBox, answer); return; }
                if (response.status === 422) {
                    const first = showErrors(announceBox, answer.errors);
                    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                } else failed(announceBox, response);
            } catch (e) { failed(announceBox); }
            finally { button.disabled = false; }
        });

        // ---- Become a member, in three steps ----
        const mForm = memberBox?.querySelector('form');
        let step = 1;
        const birth = mForm?.elements.birthdate_picker;
        if (birth) birth.max = new Date().toISOString().slice(0, 10);
        const birthdate = () => (birth.value ? birth.value.split('-').reverse().join('/') : '');
        const showStep = (n) => {
            step = n;
            mForm.querySelectorAll('.step').forEach((part) => { part.hidden = Number(part.dataset.step) !== n; });
            mForm.querySelectorAll('.steps li').forEach((item, i) => { item.classList.toggle('is-on', i < n); });
            mForm.querySelector('[data-back]').textContent = n === 1 ? 'Cancelar' : 'Voltar';
            mForm.querySelector('[type="submit"] span').textContent = n === 3 ? 'Enviar registo' : 'Seguinte';
            if (n === 3) {
                const value = (name) => mForm.elements[name].value;
                const rows = [['Nome', value('full_name')], ['Género', value('gender') === 'F' ? 'Feminino' : 'Masculino'], ['Nascimento', birthdate()], ['NIF', value('document_number')],
                    ['Estado civil', mForm.elements.marital_status.selectedOptions[0]?.textContent], ['Telemóvel', value('phone_number')], ['E-mail', value('email') || '—'],
                    ['Morada', `${value('address')} ${value('address_number')}, ${value('zip_code')} ${value('city')}`]];
                mForm.querySelector('.review').innerHTML = rows.map(([label, text]) => `<div><dt>${label}</dt><dd>${escape(text)}</dd></div>`).join('');
            }
            memberBox.querySelector('.form-body').scrollTop = 0;
        };
        const openMember = (nif = '') => {
            if (!memberBox) return;
            if (!memberBox.querySelector('.form-done').hidden) restart(memberBox);
            openBox(memberBox);
            showStep(1);
            if (nif && !mForm.elements.document_number.value) mForm.elements.document_number.value = nif;
        };
        // The fields of a step filled in (the system checks them all again).
        const stepOk = (n) => {
            clearErrors(memberBox);
            let ok = true;
            mForm.querySelectorAll(`.step[data-step="${n}"] [data-error-for]:not([data-optional])`).forEach((field) => {
                const inputs = [...field.querySelectorAll('input, select')];
                const filled = inputs.some((input) => (input.type === 'radio' ? input.checked : input.value.trim() !== ''));
                if (!filled) { fieldError(field, 'Preencha este campo.'); ok = false; }
            });
            return ok;
        };
        mForm?.elements.zip_code.addEventListener('input', async (event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 7);
            event.target.value = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
            const state = mForm.querySelector('.zip-state');
            if (digits.length !== 7) { state.textContent = ''; return; }
            // The street and the place, from the postal code (they can be changed).
            state.textContent = 'A procurar a morada…';
            try {
                const data = await (await fetch(`https://json.geoapi.pt/cp/${event.target.value}`)).json();
                if (data.Localidade && !mForm.elements.city.value) mForm.elements.city.value = data.Localidade;
                const street = data.partes?.[0]?.['Artéria'];
                if (street && !mForm.elements.address.value) mForm.elements.address.value = street;
                state.textContent = '';
            } catch (e) { state.textContent = ''; }
        });
        mForm?.querySelector('[data-back]').addEventListener('click', () => (step === 1 ? memberBox.close() : showStep(step - 1)));
        mForm?.addEventListener('click', (event) => {
            if (event.target.closest('[data-announce-now]')) openAnnounce(mForm.elements.document_number.value.replace(/\D/g, ''));
        });
        mForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (step < 3) { if (stepOk(step)) showStep(step + 1); return; }
            const button = mForm.querySelector('[type="submit"]');
            const value = (name) => mForm.elements[name].value;
            const body = { full_name: value('full_name'), gender: value('gender'), birthdate: birthdate(), document_number: value('document_number'), marital_status: value('marital_status'),
                phone_number: value('phone_number'), email: value('email'), zip_code: value('zip_code'), address: value('address'), address_number: value('address_number'), city: value('city'), website: value('website') };
            button.disabled = true;
            try {
                const { response, answer } = await send(API + '/members', body);
                if (response.ok) { done(memberBox, answer); return; }
                if (response.status === 422) {
                    const first = showErrors(memberBox, answer.errors);
                    const part = first?.closest('.step');
                    if (part) { const errors = [...memberBox.querySelectorAll('.field-error')].map((e) => [e.parentElement, e.textContent]); showStep(Number(part.dataset.step)); errors.forEach(([field, text]) => fieldError(field, text)); }
                } else failed(memberBox, response);
            } catch (e) { failed(memberBox); }
            finally { button.disabled = false; }
        });

        // ---- A prayer request: anyone; the name and mobile number can be remembered on this device ----
        const pForm = prayerBox?.querySelector('form');
        const PRAYER_KEY = 'icd-prayer-me';
        // A random code kept in this browser: the system counts the requests of the day by it (no personal data).
        const deviceId = () => {
            try {
                let id = localStorage.getItem('icd-device');
                if (!id) { id = crypto.randomUUID(); localStorage.setItem('icd-device', id); }
                return id;
            } catch (e) { return ''; }
        };
        const hasTopic = (text, topic) => text.startsWith(topic + ':') || text.includes('\n' + topic + ':');
        const markTopics = () => {
            const text = pForm.elements.request.value;
            pForm.querySelectorAll('[data-topic]').forEach((button) => button.classList.toggle('is-on', hasTopic(text, button.dataset.topic)));
            pForm.querySelector('.count').textContent = `${text.length} / 2000`;
        };
        const fillRemembered = () => {
            let me = null;
            try { me = JSON.parse(localStorage.getItem(PRAYER_KEY) || 'null'); } catch (e) { /* not kept */ }
            if (!me) return;
            pForm.elements.name.value = me.name || '';
            pForm.elements.phone_number.value = me.phone || '';
            pForm.elements.remember.checked = true;
        };
        const openPrayer = () => {
            if (!prayerBox) return;
            if (!prayerBox.querySelector('.form-done').hidden) restart(prayerBox);
            fillRemembered();
            markTopics();
            openBox(prayerBox);
            (pForm.elements.name.value ? pForm.elements.request : pForm.elements.name).focus();
        };
        // A topic starts a line of the request ("Saúde: …"); tapping it again takes the line out.
        pForm?.addEventListener('click', (event) => {
            const topic = event.target.closest('[data-topic]')?.dataset.topic;
            const area = pForm.elements.request;
            if (topic) {
                area.value = hasTopic(area.value, topic)
                    ? area.value.split('\n').filter((line) => !line.startsWith(topic + ':')).join('\n').trim()
                    : (area.value.trim() ? area.value.trim() + '\n' : '') + topic + ': ';
                markTopics();
                area.focus();
                area.setSelectionRange(area.value.length, area.value.length);
            }
            if (event.target.closest('[data-again]')) { restart(prayerBox); fillRemembered(); markTopics(); }
        });
        pForm?.elements.request.addEventListener('input', markTopics);
        pForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = pForm.querySelector('[type="submit"]');
            const value = (name) => pForm.elements[name].value;
            button.disabled = true;
            try {
                const { response, answer } = await send(API + '/prayers', { name: value('name'), request: value('request'), phone_number: value('phone_number'), website: value('website'), device: deviceId() });
                if (response.ok) {
                    try {
                        if (pForm.elements.remember.checked) localStorage.setItem(PRAYER_KEY, JSON.stringify({ name: value('name'), phone: value('phone_number') }));
                        else localStorage.removeItem(PRAYER_KEY);
                    } catch (e) { /* not kept */ }
                    done(prayerBox, answer);
                    return;
                }
                if (response.status === 422) showErrors(prayerBox, answer.errors)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                else failed(prayerBox, response);
            } catch (e) { failed(prayerBox); }
            finally { button.disabled = false; }
        });

        // The buttons that open them ("Anunciar", "Ser membro", "Pedir oração", the offers after a NIF that is not a member's).
        document.addEventListener('click', (event) => {
            const opener = event.target.closest('[data-form]');
            if (!opener || !announceBox || !memberBox) return;
            event.preventDefault();
            const nif = (opener.closest('form')?.elements.member_document?.value || '').replace(/\D/g, '');
            if (opener.dataset.form === 'member') openMember(nif);
            else if (opener.dataset.form === 'prayer') openPrayer();
            else openAnnounce();
        });
        let current = null;
        let mode = 'comment';
        let chosen = 0;
        let photoAt = 0;
        const find = (id) => all.find((ad) => String(ad.id) === id);
        const showPhoto = (n) => {
            const photos = current.photos;
            photoAt = (n + photos.length) % photos.length;
            gallery.querySelector('img').src = photos[photoAt];
            gallery.querySelector('.photo-count').textContent = photos.length > 1 ? `${photoAt + 1} / ${photos.length}` : '';
            gallery.querySelectorAll('[data-photo]').forEach((arrow) => { arrow.hidden = photos.length < 2; });
        };
        const pick = (n) => {
            chosen = n;
            form.querySelectorAll('[data-star]').forEach((star) => {
                const on = Number(star.dataset.star) <= n;
                star.classList.toggle('is-on', on);
                star.setAttribute('aria-pressed', String(Number(star.dataset.star) === n));
                star.querySelector('i').className = on ? 'fas fa-star' : 'far fa-star';
            });
        };
        const openForm = (ad, kind) => {
            current = ad;
            mode = kind;
            dialog.querySelector('#comment-title').textContent = kind === 'rate' ? 'Avaliar' : 'Comentário privado';
            dialog.querySelector('.cmt-about').textContent = ad.title;
            dialog.querySelectorAll('[data-mode]').forEach((part) => { part.hidden = part.dataset.mode !== kind; });
            form.elements.body.required = kind === 'comment';
            message.textContent = '';
            message.className = 'cmt-msg';
            dialog.querySelector('.cmt-join').classList.remove('is-on');
            form.querySelector('[type="submit"]').disabled = false;
            pick(0);
            hold();
            dialog.showModal();
            form.elements.member_document.focus();
        };
        const openGallery = (ad, at = 0) => {
            if (!gallery || !(ad?.photos || []).length) return;
            current = ad;
            showPhoto(at);
            hold();
            gallery.showModal();
        };
        list.addEventListener('click', (event) => {
            const thumb = event.target.closest('[data-gallery]');
            if (thumb) return openGallery(find(thumb.dataset.gallery), Number(thumb.dataset.at) || 0);
            const rate = event.target.closest('[data-rate]');
            const comment = event.target.closest('[data-comment]');
            const ad = find((rate || comment)?.dataset.rate || (rate || comment)?.dataset.comment);
            if (ad && dialog) openForm(ad, rate ? 'rate' : 'comment');
        });
        gallery?.querySelectorAll('[data-photo]').forEach((arrow) => arrow.addEventListener('click', () => showPhoto(photoAt + Number(arrow.dataset.photo))));
        gallery?.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowRight') showPhoto(photoAt + 1);
            if (event.key === 'ArrowLeft') showPhoto(photoAt - 1);
        });
        form?.querySelectorAll('[data-star]').forEach((star) => star.addEventListener('click', () => pick(Number(star.dataset.star))));
        [dialog, gallery, announceBox, memberBox, prayerBox].forEach((box) => {
            box?.querySelectorAll('[data-cmt-close]').forEach((close) => close.addEventListener('click', () => box.close()));
            box?.addEventListener('click', (event) => { if (event.target === box) box.close(); });
            box?.addEventListener('close', () => release());
        });
        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!current) return;
            const send = form.querySelector('[type="submit"]');
            const say = (text, ok) => { message.textContent = text; message.className = 'cmt-msg ' + (ok ? 'is-ok' : 'is-error'); };
            if (mode === 'rate' && !chosen) return say('Escolha de 1 a 5 estrelas.');
            send.disabled = true;
            const fields = { member_document: form.elements.member_document.value, website: form.elements.website.value };
            try {
                const response = await fetch(mode === 'rate' ? current.ratings_url : current.comments_url, {
                    method: 'POST',
                    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify(mode === 'rate' ? { ...fields, stars: chosen } : { ...fields, body: form.elements.body.value }),
                });
                const answer = await response.json().catch(() => ({}));
                if (response.ok) {
                    say(answer.message || 'Obrigado!', true);
                    form.elements.body.value = '';
                    // The new average, on the card right away (and in this browser's copy on the next visit).
                    if (mode === 'rate' && answer.rating) {
                        current.rating = answer.rating;
                        try { localStorage.removeItem(KEY); } catch (e) { /* not kept */ }
                        render(filters.querySelector('.is-active')?.dataset.type || '');
                    }
                    return;
                }
                send.disabled = false;
                if (response.status === 429) return say('Foram enviados muitos pedidos seguidos. Tente de novo daqui a um minuto.');
                const errors = Object.values(answer.errors || {}).flat();
                say(errors[0] || 'Não foi possível enviar agora. Tente de novo mais tarde.');
                // A NIF that is not a member's: the registration, right there.
                if (answer.errors?.member_document) dialog.querySelector('.cmt-join').classList.add('is-on');
            } catch (e) {
                send.disabled = false;
                say('Não foi possível enviar agora. Verifique a ligação à internet.');
            }
        });

        const near = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) { near.disconnect(); load(); }
        }, { rootMargin: '400px 0px' });
        near.observe(ads);
    }

    // Cards and blocks appear as the page scrolls.
    // The pastors, from the system's pastoral ministry (order, photo, role and an optional biography organised as
    // each one wants: sections with an index, or simple). Without an answer, the card written in the page stays.
    const pastorsSection = document.getElementById('pastors');
    const pastorsList = document.getElementById('pastors-list');
    if (pastorsSection?.dataset.api && pastorsList) {
        const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
        const initials = (name) => name.split(/\s+/).filter(Boolean).map((word, i, all) => (i === 0 || i === all.length - 1 ? word[0] : '')).join('').toUpperCase();
        const blockHtml = (block) => {
            if (block.type === 'text') return block.text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
            if (block.type === 'link') return `<p>${block.text ? esc(block.text) + ' ' : ''}${link(block.url, block.label)}</p>`;
            if (block.type === 'list') return `<ul class="bio-list">${block.items.map((item) => {
                const text = item.url ? link(item.url, item.text || item.url) : esc(item.text || '');
                return `<li>${item.title ? `<strong>${esc(item.title)}</strong> ` : ''}${text}</li>`;
            }).join('')}</ul>`;
            return '';
        };
        let pastors = [];
        const showBio = (index) => {
            const pastor = pastors[index];
            const dialog = document.getElementById('pastorBioModal');
            if (!pastor?.bio || !dialog) return;
            const withIndex = pastor.bio.layout !== 'simple';
            dialog.querySelector('h3').textContent = `Biografia: ${pastor.name}`;
            dialog.querySelector('.dlg-toc').innerHTML = withIndex
                ? pastor.bio.sections.map((section, i) => section.title ? `<a href="#pastorBio-s${i}" data-goto="pastorBio-s${i}">${esc(section.title)}</a>` : '').join('')
                : '';
            dialog.querySelector('.dlg-body').innerHTML = pastor.bio.sections.map((section, i) =>
                `<section class="dlg-part" id="pastorBio-s${i}">${section.title ? `<h4>${esc(section.title)}</h4>` : ''}<div class="dlg-text">${section.blocks.map(blockHtml).join('')}</div></section>`).join('');
            open('pastorBioModal');
        };
        pastorsList.addEventListener('click', (event) => {
            const button = event.target.closest('[data-bio]');
            if (button) showBio(Number(button.dataset.bio));
        });
        fetch(pastorsSection.dataset.api, { headers: { Accept: 'application/json' }, cache: 'no-cache' })
            .then((response) => (response.ok ? response.json() : Promise.reject(response)))
            .then(({ data }) => {
                if (!Array.isArray(data) || !data.length) return;
                pastors = data;
                pastorsList.classList.toggle('is-many', data.length > 1);
                pastorsList.innerHTML = data.map((pastor, i) => `
                    <article class="pastor reveal is-visible">
                        ${pastor.photo ? `<img src="${esc(pastor.photo)}" alt="${esc(pastor.name)}" loading="lazy">` : `<div class="pastor-photo" aria-hidden="true">${esc(initials(pastor.name))}</div>`}
                        <div class="pastor-text">
                            ${pastor.role ? `<span>${esc(pastor.role)}</span>` : ''}
                            <h3>${esc(pastor.name)}</h3>
                            ${pastor.bio ? `<button type="button" class="btn btn-primary" data-bio="${i}">Biografia</button>` : ''}
                        </div>
                    </article>`).join('');
            })
            .catch(() => {});
    }

    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((element) => reveal.observe(element));
})();
