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
        // The forms of the church's system (to announce, to be a member) open in a window of the site; their
        // "Fechar" closes it.
        const embedBox = document.getElementById('frame-dialog');
        const frames = { announce: [ads.dataset.announce, 'Anunciar'], member: [ads.dataset.member, 'Ser membro'] };
        const openFrame = (kind) => {
            const [url, title] = frames[kind] || [];
            if (!embedBox || !url) return false;
            dialog?.open && dialog.close();
            embedBox.querySelector('#frame-title').textContent = title;
            embedBox.querySelector('iframe').title = title;
            embedBox.querySelector('iframe').src = url + (url.includes('?') ? '&' : '?') + 'embed=1';
            hold();
            embedBox.showModal();
            return true;
        };
        document.addEventListener('click', (event) => {
            const opener = event.target.closest('[data-frame]');
            if (opener && openFrame(opener.dataset.frame)) event.preventDefault();
        });
        window.addEventListener('message', (event) => {
            if (event.data?.icd === 'close' && embedBox?.open && event.origin === new URL(ads.dataset.announce).origin) embedBox.close();
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
        embedBox?.addEventListener('close', () => { embedBox.querySelector('iframe').src = 'about:blank'; });
        [dialog, gallery, embedBox].forEach((box) => {
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
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((element) => reveal.observe(element));
})();
