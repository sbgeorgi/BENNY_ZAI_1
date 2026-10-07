/*!
 * Roatan.Design site editor — framework-free harness for the shared Supabase site backend.
 *
 * One file serves every website:
 *   - public runtime: reads published `site_content` rows for `config.siteKey` and renders them
 *     into elements bound with data-cms-copy / data-cms-setting / data-cms-media / data-cms-href;
 *   - footer login: any element with [data-cms-login] (or ?edit / #edit) opens the editor;
 *   - visual editor: the real page in a same-origin iframe canvas, a contextual inspector,
 *     media library + signed uploads, device widths, explicit atomic publishing.
 * Frameworks (React, Vue, …) can pass `config.render(content, lang)` to draw content themselves;
 * the canvas bridge only needs the data-cms-* attributes in the rendered DOM.
 *
 * Contract: see the supabase-site-editor skill (references/contract.md, references/visual-canvas.md).
 */
(() => {
    'use strict';

    const config = window.SiteEditorConfig;
    if (!config || !config.supabaseUrl || !config.publishableKey || !config.siteKey || !config.defaults) {
        console.warn('Site editor: window.SiteEditorConfig is missing or incomplete.');
        return;
    }

    const ROOT = config.supabaseUrl.replace(/\/$/, '');
    const KEY = config.publishableKey;
    const SITE = config.siteKey;
    const LANGS = Array.isArray(config.languages) && config.languages.length ? config.languages : ['en'];
    const CONTENT_KEYS = [...LANGS.map(lang => `copy.${lang}`), 'media', 'settings'];
    const STORAGE_PREFIX = `site-editor:${SITE}`;
    const SELECTOR = '[data-cms-copy],[data-cms-setting],[data-cms-media]';
    const MEDIA_ORIGIN_PREFIX = `${ROOT}/storage/v1/object/public/site-media`;
    const MAX_TEXT = 6000;
    const FORBIDDEN_PARTS = new Set(['__proto__', 'prototype', 'constructor']);
    const UI = Object.assign({
        title: 'Visual editor',
        signInTitle: 'Sign in to edit',
        permission: 'Private editing access. Changes publish to the live website only when you press Publish.',
        username: 'Username',
        password: 'Password',
        signIn: 'Sign in',
        rotateTitle: 'Choose a new password before editing.',
        currentPassword: 'Current password',
        newPassword: 'New password (12+ characters)',
        confirmPassword: 'Confirm new password',
        changePassword: 'Change password',
        signOut: 'Sign out',
        account: 'Account',
        edit: 'Edit',
        preview: 'Preview',
        desktop: 'Desktop',
        tablet: 'Tablet',
        mobile: 'Mobile',
        dirty: 'Unpublished changes',
        published: 'Published',
        noChanges: 'No unpublished changes',
        clickToEdit: 'Click any text or photo on the page to edit it',
        emptyHint: 'Select text or a photo in the page preview.',
        selected: 'Selected',
        business: 'Business',
        pages: 'Pages',
        copy: 'Text',
        media: 'Photo',
        settings: 'Business detail',
        related: 'Also editable here',
        replace: 'Upload replacement',
        uploadHelp: 'JPEG, PNG, WEBP, AVIF or GIF up to 20 MB. Uploads are stored in the shared media library.',
        library: 'Library',
        search: 'Search',
        noLibrary: 'No matching media.',
        retryLibrary: 'Media library failed to load · Retry',
        loading: 'Loading…',
        discard: 'Discard',
        publish: 'Publish',
        publishing: 'Publishing…',
        publishedNotice: 'Published. Your changes are live.',
        mediaUpdated: 'Photo updated in the preview. Publish to make it live.',
        conflict: 'Someone else published changes since you opened the editor. Your edits are kept; choose “Load latest” to discard them and start from the live version.',
        loadLatest: 'Load latest',
        sessionExpired: 'Your session ended. Sign in again — your unpublished edits are kept.',
        noAccess: 'This account does not have access to this website.',
        loadError: 'Could not load the published content.',
        retry: 'Retry',
        close: 'Close editor',
        hideInspector: 'Hide panel',
        showInspector: 'Show panel',
        confirmClose: 'Close the editor and discard unpublished changes?',
        confirmDiscard: 'Discard all unpublished changes?',
        validation: 'Fix before publishing:',
        jumpTo: 'Jump to section',
        choosePage: 'Pages',
        currentPage: 'Current page',
    }, config.ui || {});

    const isCanvas = new URLSearchParams(location.search).get('__cms_canvas') === '1' && window.parent !== window;

    // ---------- data helpers ----------
    const clone = value => JSON.parse(JSON.stringify(value));
    const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    // jsonb reorders object keys, so compare documents independently of key order.
    const stableStringify = value => Array.isArray(value) ? `[${value.map(stableStringify).join(',')}]`
        : isPlainObject(value) ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
        : JSON.stringify(value);
    const same = (a, b) => stableStringify(a) === stableStringify(b);

    function mergeShape(defaults, remote) {
        if (isPlainObject(defaults)) {
            const result = {};
            const source = isPlainObject(remote) ? remote : {};
            Object.keys(defaults).forEach(key => {
                result[key] = Object.prototype.hasOwnProperty.call(source, key) ? mergeShape(defaults[key], source[key]) : clone(defaults[key]);
            });
            return result;
        }
        if (Array.isArray(defaults)) {
            if (!Array.isArray(remote) || remote.length !== defaults.length) return clone(defaults);
            return defaults.map((item, index) => mergeShape(item, remote[index]));
        }
        return typeof remote === typeof defaults ? remote : defaults;
    }

    function pathParts(path) {
        if (typeof path !== 'string' || path.length > 160 || !/^[A-Za-z][A-Za-z0-9_]*(?:\.(?:[A-Za-z][A-Za-z0-9_]*|\d+))*$/.test(path)) return null;
        const parts = path.split('.');
        return parts.some(part => FORBIDDEN_PARTS.has(part)) ? null : parts;
    }

    function readPath(root, path) {
        const parts = pathParts(path);
        if (!parts) return undefined;
        let value = root;
        for (const part of parts) {
            if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, part)) return undefined;
            value = value[part];
        }
        return value;
    }

    function writePath(root, parts, value) {
        const next = clone(root);
        let cursor = next;
        for (let i = 0; i < parts.length - 1; i++) cursor = cursor[parts[i]];
        cursor[parts[parts.length - 1]] = value;
        return next;
    }

    // The defaults define the schema: only their keys are editable, published values merge into them.
    const DEFAULT_CONTENT = {
        copy: Object.fromEntries(LANGS.map(lang => [lang, clone(config.defaults.copy?.[lang] || {})])),
        media: Object.assign({ images: {}, videos: {}, references: {} }, clone(config.defaults.media || {})),
        settings: clone(config.defaults.settings || {}),
    };

    function docFor(content, key) {
        if (key.startsWith('copy.')) return content.copy[key.slice(5)];
        return content[key];
    }

    function rowsToState(rows) {
        const byKey = {};
        (rows || []).forEach(row => { if (row && typeof row.content_key === 'string') byKey[row.content_key] = row; });
        const content = clone(DEFAULT_CONTENT);
        LANGS.forEach(lang => { content.copy[lang] = mergeShape(DEFAULT_CONTENT.copy[lang], byKey[`copy.${lang}`]?.content_value); });
        content.media = mergeShape(DEFAULT_CONTENT.media, byKey.media?.content_value);
        content.settings = mergeShape(DEFAULT_CONTENT.settings, byKey.settings?.content_value);
        const revisions = {};
        CONTENT_KEYS.forEach(key => {
            const revision = Number(byKey[key]?.metadata?.revision ?? byKey[key]?.revision ?? 0);
            revisions[key] = Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
        });
        return { content, revisions };
    }

    function validContentShape(content) {
        return isPlainObject(content) && isPlainObject(content.copy) && LANGS.every(lang => isPlainObject(content.copy[lang]))
            && isPlainObject(content.media) && isPlainObject(content.settings);
    }

    // ---------- validation ----------
    const SETTING_FIELDS = Array.isArray(config.settingsFields) ? config.settingsFields : [];
    const SETTING_RULES = {
        email: value => /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[A-Za-z]{2,}$/.test(value),
        digits: value => /^\d{6,15}$/.test(value),
        tel: value => /^\+?[\d\s().-]{6,24}$/.test(value),
        url: value => /^https:\/\/[^\s<>"']{3,2040}$/.test(value),
        text: value => value.length <= 200,
    };

    function isValidMediaUrl(url) {
        if (typeof url !== 'string' || !url || url.length > 2048) return false;
        if (url.startsWith(MEDIA_ORIGIN_PREFIX)) return /^[^\s<>"']+$/.test(url);
        // Site-bundled assets: relative paths only, no traversal, known media extensions.
        return !url.includes('..') && /^(?:\.\/)?[A-Za-z0-9][A-Za-z0-9 %()._/-]*\.(?:jpe?g|png|webp|avif|gif|svg|mp4|webm)$/i.test(url);
    }

    function validationErrors(content) {
        const errors = [];
        const walk = (value, label) => {
            if (typeof value === 'string' && value.length > MAX_TEXT) errors.push(`${label} is too long`);
            else if (isPlainObject(value) || Array.isArray(value)) Object.keys(value).forEach(key => walk(value[key], `${label}.${key}`));
        };
        LANGS.forEach(lang => walk(content.copy[lang], `copy.${lang}`));
        SETTING_FIELDS.forEach(field => {
            const value = content.settings[field.key];
            const rule = SETTING_RULES[field.type] || SETTING_RULES.text;
            if (typeof value !== 'string' || !rule(value.trim())) errors.push(`${field.label} is not valid`);
        });
        ['images', 'videos', 'references'].forEach(kind => {
            Object.entries(content.media[kind] || {}).forEach(([slot, url]) => {
                if (!isValidMediaUrl(url)) errors.push(`${humanize(slot)} photo has an invalid address`);
            });
        });
        return errors;
    }

    function humanize(key) {
        const text = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function fieldLabel(selection) {
        const custom = config.labels?.[selection.path];
        if (custom) return custom;
        const field = selection.kind === 'setting' && SETTING_FIELDS.find(item => item.key === selection.path);
        if (field) return field.label;
        const last = selection.path.split('.').pop();
        return selection.kind === 'media' ? `${humanize(last)} · photo` : humanize(last);
    }

    // ---------- public renderer ----------
    function settingValueForHref(settings, key) {
        const value = settings[key];
        if (typeof value !== 'string' && typeof value !== 'number') return null;
        const field = SETTING_FIELDS.find(item => item.key === key);
        const text = String(value).trim();
        if (field && !(SETTING_RULES[field.type] || SETTING_RULES.text)(text)) return null;
        return field?.type === 'url' || field?.type === 'email' || field?.type === 'digits' ? text : encodeURIComponent(text);
    }

    function fillHref(template, settings) {
        let missing = false;
        const href = template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, key) => {
            const value = settingValueForHref(settings, key);
            if (value === null) missing = true;
            return value ?? '';
        });
        if (missing || !/^(?:https:\/\/|mailto:|tel:)/i.test(href)) return null;
        return href;
    }

    function setBoundText(element, value) {
        const linkText = element.dataset.cmsLinkText;
        const linkHref = element.dataset.cmsLinkHref;
        const index = linkText && linkHref && /^https:\/\//.test(linkHref) ? value.indexOf(linkText) : -1;
        if (index === -1) {
            if (element.textContent !== value) element.textContent = value;
            return;
        }
        const link = document.createElement('a');
        link.className = element.dataset.cmsLinkClass || 'inline-link';
        link.href = linkHref;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = linkText;
        element.replaceChildren(document.createTextNode(value.slice(0, index)), link, document.createTextNode(value.slice(index + linkText.length)));
    }

    function renderDom(content, lang) {
        const copy = content.copy[lang] || content.copy[LANGS[0]];
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-cms-copy]').forEach(element => {
            const value = readPath(copy, element.dataset.cmsCopy);
            if (typeof value === 'string' || typeof value === 'number') setBoundText(element, String(value));
        });
        document.querySelectorAll('[data-cms-setting][data-cms-text]').forEach(element => {
            const value = readPath(content.settings, element.dataset.cmsSetting);
            if (typeof value === 'string' || typeof value === 'number') element.textContent = String(value);
        });
        document.querySelectorAll('[data-cms-href]').forEach(element => {
            const href = fillHref(element.dataset.cmsHref, content.settings);
            if (href && element.getAttribute('href') !== href) element.setAttribute('href', href);
        });
        document.querySelectorAll('[data-cms-media]').forEach(element => {
            const url = readPath(content.media, element.dataset.cmsMedia);
            if (!isValidMediaUrl(url)) return;
            if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement || element instanceof HTMLSourceElement) {
                if (element.getAttribute('src') !== url) {
                    element.removeAttribute('srcset');
                    element.setAttribute('src', url);
                }
            } else {
                const css = `url("${url.replace(/["\\\n\r]/g, '')}")`;
                if (element.style.backgroundImage !== css) element.style.backgroundImage = css;
            }
        });
    }

    function render(content, lang) {
        renderDom(content, lang);
        if (typeof config.render === 'function') {
            try { config.render(clone(content), lang); } catch (error) { console.error('Site editor render hook failed.', error); }
        }
        document.dispatchEvent(new CustomEvent('site-editor:content', { detail: { content, lang } }));
    }

    // ---------- network ----------
    async function readError(response) {
        const text = await response.text();
        let data = null;
        try { data = JSON.parse(text); } catch { /* not JSON */ }
        const error = new Error(data?.error || data?.message || `Request failed (${response.status})`);
        error.status = response.status;
        error.data = data;
        return error;
    }

    async function fetchPublishedRows() {
        const response = await fetch(`${ROOT}/rest/v1/site_content?site_key=eq.${encodeURIComponent(SITE)}&is_published=eq.true&select=content_key,content_value,metadata`, {
            headers: { apikey: KEY, Accept: 'application/json' },
            cache: 'no-store',
        });
        if (!response.ok) throw await readError(response);
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('The published content response was not a list.');
        return rows;
    }

    async function adminRequest(action, payload = {}, token) {
        const headers = { apikey: KEY, 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${ROOT}/functions/v1/site-admin`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action, ...payload }),
        });
        if (!response.ok) throw await readError(response);
        return response.json();
    }

    async function uploadSignedFile(signedUrl, file) {
        const response = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
            body: file,
        });
        if (!response.ok) throw await readError(response);
    }

    const storage = {
        get(area, key) { try { return window[area].getItem(`${STORAGE_PREFIX}:${key}`); } catch { return null; } },
        set(area, key, value) { try { window[area].setItem(`${STORAGE_PREFIX}:${key}`, value); } catch { /* unavailable */ } },
        remove(area, key) { try { window[area].removeItem(`${STORAGE_PREFIX}:${key}`); } catch { /* unavailable */ } },
    };

    function readCachedRows() {
        try {
            const cached = JSON.parse(storage.get('localStorage', 'published') || 'null');
            return Array.isArray(cached?.rows) ? cached.rows : null;
        } catch { return null; }
    }
    const writeCachedRows = rows => storage.set('localStorage', 'published', JSON.stringify({ savedAt: Date.now(), rows }));

    function initialLang() {
        const stored = storage.get('localStorage', 'lang');
        return LANGS.includes(stored) ? stored : LANGS[0];
    }

    // ---------- public runtime ----------
    const site = {
        lang: initialLang(),
        content: clone(DEFAULT_CONTENT),
        revisions: Object.fromEntries(CONTENT_KEYS.map(key => [key, 0])),
        loaded: false,
    };

    function applyRows(rows) {
        const state = rowsToState(rows);
        site.content = state.content;
        site.revisions = state.revisions;
        site.loaded = true;
    }

    async function refreshPublished() {
        const rows = await fetchPublishedRows();
        writeCachedRows(rows);
        applyRows(rows);
        return rows;
    }

    function setLanguage(lang) {
        if (!LANGS.includes(lang)) return;
        site.lang = lang;
        storage.set('localStorage', 'lang', lang);
        render(site.content, lang);
    }

    window.SiteEditor = {
        config,
        isCanvas,
        get content() { return clone(site.content); },
        get lang() { return site.lang; },
        setLanguage,
        render: () => render(site.content, site.lang),
        open: () => openEditor(),
    };

    if (isCanvas) {
        startCanvas();
        return;
    }

    const cachedRows = readCachedRows();
    if (cachedRows) {
        applyRows(cachedRows);
        render(site.content, site.lang);
    }
    refreshPublished()
        .then(() => render(site.content, site.lang))
        .catch(error => {
            console.warn('Site editor: published content unavailable; showing built-in content.', error);
            if (!cachedRows) render(site.content, site.lang);
        });

    document.addEventListener('click', event => {
        const trigger = event.target instanceof Element ? event.target.closest('[data-cms-login]') : null;
        if (!trigger) return;
        event.preventDefault();
        openEditor();
    });
    const params = new URLSearchParams(location.search);
    if (params.has('edit') || location.hash === '#edit') {
        // Wait for the page's own scripts to finish wiring the DOM.
        window.addEventListener('load', () => openEditor(), { once: true });
    }

    // ---------- editor (parent window) ----------
    function h(tag, attributes = {}, ...children) {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (value === undefined || value === null || value === false) return;
            if (key === 'class') element.className = value;
            else if (key === 'text') element.textContent = value;
            else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2), value);
            else if (key in element && typeof value !== 'string') element[key] = value;
            else element.setAttribute(key, value === true ? '' : String(value));
        });
        children.flat().forEach(child => {
            if (child === null || child === undefined || child === false) return;
            element.append(child instanceof Node ? child : document.createTextNode(String(child)));
        });
        return element;
    }

    let editor = null;

    function openEditor() {
        if (editor) {
            editor.backdrop.hidden = false;
            return;
        }
        editor = createEditor();
    }

    function createEditor() {
        const ed = {
            session: null,
            sites: [],
            busy: false,
            checking: false,
            authError: '',
            view: 'edit',
            device: 'desktop',
            inspectorVisible: !window.matchMedia('(max-width: 760px)').matches,
            panel: 'selection',
            selection: null,
            related: [],
            published: null,
            draft: null,
            revisions: {},
            loading: false,
            loadError: '',
            error: '',
            notice: '',
            conflict: false,
            library: [],
            libraryLoaded: false,
            libraryError: '',
            search: '',
            canvasReady: false,
            canvasPage: `${location.pathname.split('/').pop() || 'index.html'}`,
            accountOpen: false,
        };
        try { ed.session = JSON.parse(storage.get('sessionStorage', 'session') || 'null'); } catch { ed.session = null; }

        const previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';

        const backdrop = h('div', { class: 'cms-admin-backdrop is-auth' });
        ed.backdrop = backdrop;
        document.body.append(backdrop);
        const previouslyFocused = document.activeElement;

        backdrop.addEventListener('mousedown', event => {
            if (event.target === backdrop && !isWorkspace()) closeEditor();
        });
        backdrop.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !isWorkspace()) closeEditor();
        });
        window.addEventListener('message', receiveFromCanvas);

        function isWorkspace() {
            return Boolean(ed.session && !ed.session.must_change_password && !ed.checking && ed.sites.some(item => item.site_key === SITE));
        }

        function saveSession(session) {
            ed.session = session;
            if (session) storage.set('sessionStorage', 'session', JSON.stringify(session));
            else storage.remove('sessionStorage', 'session');
        }

        function closeEditor(force = false) {
            if (!force && isDirty() && !window.confirm(UI.confirmClose)) return;
            window.removeEventListener('message', receiveFromCanvas);
            backdrop.remove();
            document.documentElement.style.overflow = previousOverflow;
            editor = null;
            if (ed.published) render(site.content, site.lang);
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
            if (location.hash === '#edit') history.replaceState(null, '', location.pathname + location.search);
        }

        // ----- content state -----
        const isDirty = () => Boolean(ed.draft && ed.published && !same(ed.draft, ed.published));
        const changedKeys = () => CONTENT_KEYS.filter(key => !same(docFor(ed.draft, key), docFor(ed.published, key)));
        const canEdit = () => Boolean(ed.draft) && !ed.loading && !ed.busy && ed.view === 'edit';

        async function hydrate() {
            ed.loading = true;
            ed.loadError = '';
            update();
            try {
                const rows = await refreshPublished();
                const state = rowsToState(rows);
                const keepDraft = isDirty();
                ed.published = state.content;
                ed.revisions = state.revisions;
                if (!keepDraft) ed.draft = clone(state.content);
            } catch (error) {
                ed.loadError = error.message || UI.loadError;
                if (!ed.draft) {
                    ed.published = clone(site.content);
                    ed.draft = clone(site.content);
                    ed.revisions = clone(site.revisions);
                }
            } finally {
                ed.loading = false;
                update();
                renderInspector();
                postState();
            }
        }

        function setAt(parts, value) {
            if (!canEdit()) return;
            ed.draft = writePath(ed.draft, parts, value);
            ed.notice = '';
            schedulePost();
            update();
        }

        function selectionRootParts(selection) {
            if (selection.kind === 'copy') return ['copy', site.lang];
            if (selection.kind === 'media') return ['media'];
            return ['settings'];
        }

        function selectionValue(selection, content = ed.draft) {
            if (!selection || !content) return undefined;
            const root = selection.kind === 'copy' ? content.copy[site.lang] : selection.kind === 'media' ? content.media : content.settings;
            return readPath(root, selection.path);
        }

        function validSelection(value) {
            if (!isPlainObject(value) || !['copy', 'setting', 'media'].includes(value.kind) || !pathParts(value.path)) return false;
            if (value.label !== undefined && (typeof value.label !== 'string' || value.label.length > 120)) return false;
            if (value.section !== undefined && (typeof value.section !== 'string' || value.section.length > 120)) return false;
            const field = selectionValue(value);
            if (value.kind === 'media') return typeof field === 'string';
            return ['string', 'number', 'boolean'].includes(typeof field);
        }

        // ----- canvas messaging -----
        let postFrame = 0;
        function schedulePost() {
            if (postFrame) return;
            postFrame = requestAnimationFrame(() => { postFrame = 0; postState(); });
        }
        const frameWindow = () => refs.iframe?.contentWindow || null;
        function postState() {
            const target = frameWindow();
            if (!target || !ed.draft) return;
            target.postMessage({
                type: 'site-editor:state',
                content: ed.draft,
                lang: site.lang,
                editing: ed.view === 'edit',
                selection: ed.selection,
            }, location.origin);
        }

        function receiveFromCanvas(event) {
            if (!frameWindow() || event.source !== frameWindow() || event.origin !== location.origin || !isPlainObject(event.data)) return;
            const message = event.data;
            if (message.type === 'site-editor:ready') {
                ed.canvasReady = true;
                if (typeof message.page === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(message.page)) ed.canvasPage = message.page;
                update();
                postState();
                if (ed.panel === 'pages') renderInspector();
                return;
            }
            if (message.type === 'site-editor:select' && ed.view === 'edit' && validSelection(message.selection)) {
                ed.selection = message.selection;
                ed.related = Array.isArray(message.related) ? message.related.filter(validSelection).slice(0, 8) : [];
                ed.panel = 'selection';
                ed.inspectorVisible = true;
                ed.accountOpen = false;
                update();
                renderInspector();
                postState();
                if (ed.selection.kind === 'media' && !ed.libraryLoaded && !ed.libraryError) loadLibrary();
            }
        }

        // ----- auth -----
        async function checkSession() {
            if (!ed.session?.token) return;
            ed.checking = true;
            renderShell();
            try {
                const info = await adminRequest('session', {}, ed.session.token);
                saveSession({ ...ed.session, expires_at: info.expires_at, must_change_password: info.must_change_password === true });
                ed.sites = Array.isArray(info.sites) ? info.sites : [];
                if (!ed.session.must_change_password && !ed.sites.some(item => item.site_key === SITE)) ed.authError = UI.noAccess;
            } catch (error) {
                if (error.status === 401) {
                    saveSession(null);
                    if (ed.draft) ed.authError = UI.sessionExpired;
                } else ed.authError = error.message;
            } finally {
                ed.checking = false;
                renderShell();
            }
        }

        async function signIn(username, password) {
            ed.busy = true;
            ed.authError = '';
            renderShell();
            try {
                const session = await adminRequest('login', { username, password });
                saveSession(session);
                ed.busy = false;
                await checkSession();
            } catch (error) {
                ed.authError = error.status === 401 || error.status === 429 ? 'Invalid username or password.' : error.message;
                ed.busy = false;
                renderShell();
            }
        }

        async function changePassword(current, next, confirm, onDone) {
            if (next !== confirm) {
                showMessage('error', 'The new passwords do not match.');
                return;
            }
            ed.busy = true;
            update();
            try {
                const result = await adminRequest('password', { current_password: current, new_password: next }, ed.session.token);
                saveSession({ ...ed.session, expires_at: result.expires_at, must_change_password: false });
                ed.busy = false;
                onDone?.();
                await checkSession();
                showMessage('notice', 'Password changed.');
            } catch (error) {
                ed.busy = false;
                showMessage('error', error.message);
            }
        }

        async function signOut() {
            const token = ed.session?.token;
            saveSession(null);
            ed.sites = [];
            ed.accountOpen = false;
            if (token) adminRequest('logout', {}, token).catch(() => {});
            renderShell();
        }

        function handleAuthFailure(error) {
            if (error.status === 401) {
                saveSession(null);
                ed.authError = UI.sessionExpired;
                renderShell();
                return true;
            }
            return false;
        }

        // ----- media -----
        async function loadLibrary() {
            if (!ed.session?.token) return;
            ed.libraryError = '';
            ed.libraryLoading = true;
            renderInspector();
            try {
                const result = await adminRequest('media', { site_key: SITE }, ed.session.token);
                ed.library = Array.isArray(result.items) ? result.items.filter(item => item && typeof item.url === 'string' && isValidMediaUrl(item.url)) : [];
                ed.libraryLoaded = true;
            } catch (error) {
                if (handleAuthFailure(error)) return;
                ed.libraryError = error.message || 'Library failed';
            } finally {
                ed.libraryLoading = false;
                renderInspector();
            }
        }

        function libraryItems(kind) {
            const local = (Array.isArray(config.mediaLibrary) ? config.mediaLibrary : [])
                .filter(item => item && isValidMediaUrl(item.url))
                .map(item => ({ name: item.name || item.url.split('/').pop(), url: item.url, path: item.url, mime: /\.(mp4|webm)$/i.test(item.url) ? 'video/mp4' : 'image/*', local: true }));
            const remote = ed.library.filter(item => !/\/optimized\//.test(item.path || ''));
            const all = [...remote, ...local].filter(item => kind === 'videos' ? String(item.mime).startsWith('video/') : !String(item.mime).startsWith('video/'));
            const query = ed.search.trim().toLowerCase();
            return query ? all.filter(item => String(item.name).toLowerCase().includes(query)) : all;
        }

        async function upload(file, mediaParts) {
            if (!file || !canEdit()) return;
            ed.busy = true;
            ed.error = '';
            ed.notice = '';
            update();
            renderInspector();
            try {
                const signed = await adminRequest('upload', { site_key: SITE, filename: file.name, mime: file.type, size: file.size }, ed.session.token);
                if (!signed?.signedUrl || !isValidMediaUrl(signed.publicUrl)) throw new Error('The upload service returned an invalid file address.');
                await uploadSignedFile(signed.signedUrl, file);
                ed.busy = false;
                setAt(mediaParts, signed.publicUrl);
                ed.library = [{ name: file.name, path: signed.path, url: signed.publicUrl, mime: file.type, size: file.size }, ...ed.library.filter(item => item.path !== signed.path)];
                ed.libraryLoaded = true;
                showMessage('notice', UI.mediaUpdated);
            } catch (error) {
                ed.busy = false;
                if (!handleAuthFailure(error)) showMessage('error', error.message || 'Upload failed.');
            } finally {
                renderInspector();
            }
        }

        // ----- publish -----
        async function publish() {
            if (!isDirty() || ed.busy || ed.loading || validationErrors(ed.draft).length) return;
            ed.busy = true;
            ed.error = '';
            ed.notice = '';
            ed.conflict = false;
            update();
            renderInspector();
            const snapshot = clone(ed.draft);
            const rows = changedKeys().map(key => ({ content_key: key, content_value: docFor(snapshot, key), revision: ed.revisions[key] ?? 0 }));
            try {
                const result = await adminRequest('publish', { site_key: SITE, rows }, ed.session.token);
                const published = clone(ed.published);
                (result.rows || []).forEach(row => {
                    if (!CONTENT_KEYS.includes(row.content_key)) return;
                    ed.revisions[row.content_key] = Number(row.revision);
                    const defaults = docFor(DEFAULT_CONTENT, row.content_key);
                    if (row.content_key.startsWith('copy.')) published.copy[row.content_key.slice(5)] = mergeShape(defaults, row.content_value);
                    else published[row.content_key] = mergeShape(defaults, row.content_value);
                });
                ed.published = published;
                site.content = clone(published);
                site.revisions = clone(ed.revisions);
                writeCachedRows(CONTENT_KEYS.map(key => ({ content_key: key, content_value: docFor(published, key), metadata: { revision: ed.revisions[key] } })));
                showMessage('notice', UI.publishedNotice);
            } catch (error) {
                if (error.status === 409) {
                    ed.conflict = true;
                    showMessage('error', UI.conflict);
                } else if (!handleAuthFailure(error)) showMessage('error', error.message || 'Publishing failed.');
            } finally {
                ed.busy = false;
                update();
                renderInspector();
            }
        }

        function discard() {
            if (!isDirty() || ed.busy || !window.confirm(UI.confirmDiscard)) return;
            ed.draft = clone(ed.published);
            ed.notice = '';
            ed.error = '';
            update();
            renderInspector();
            postState();
        }

        async function loadLatest() {
            ed.draft = null;
            ed.conflict = false;
            ed.error = '';
            await hydrate();
        }

        function showMessage(kind, text) {
            ed.error = kind === 'error' ? text : '';
            ed.notice = kind === 'notice' ? text : '';
            update();
        }

        // ----- DOM: shell -----
        let refs = {};

        function renderShell() {
            backdrop.replaceChildren();
            refs = {};
            if (isWorkspace()) {
                backdrop.className = 'cms-admin-backdrop is-workspace';
                buildWorkspace();
                if (!ed.draft && !ed.loading) hydrate();
                else { update(); renderInspector(); }
                return;
            }
            backdrop.className = 'cms-admin-backdrop is-auth';
            buildAuth();
        }

        function brand(eyebrow, title) {
            return h('div', { class: 'cms-brand-lockup' },
                h('span', { class: 'cms-brand-mark', 'aria-hidden': 'true', text: config.brandMark || (config.siteName || SITE).charAt(0) }),
                h('span', {}, h('span', { class: 'cms-eyebrow', text: eyebrow }), h('strong', { id: 'cms-admin-title', text: title })));
        }

        function buildAuth() {
            const siteName = (config.siteName || SITE).toUpperCase();
            const dialog = h('div', { class: 'cms-auth-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cms-admin-title', 'aria-describedby': 'cms-admin-description' });
            dialog.append(h('header', { class: 'cms-auth-header' },
                brand(`${siteName} · PRIVATE`, UI.signInTitle),
                h('button', { type: 'button', class: 'cms-exit-button', 'aria-label': UI.close, onclick: () => closeEditor(), text: '×' })));
            const description = ed.checking ? 'Checking session…' : ed.session?.must_change_password ? UI.rotateTitle : UI.permission;
            dialog.append(h('p', { id: 'cms-admin-description', class: 'cms-auth-description', text: description }));
            if (ed.authError) dialog.append(h('p', { class: 'cms-auth-error', role: 'alert', text: ed.authError }));
            if (ed.checking) {
                dialog.append(h('div', { class: 'cms-auth-loading', role: 'status', text: 'Checking session…' }));
            } else if (!ed.session) {
                const username = h('input', { type: 'text', name: 'username', autocomplete: 'username', autocapitalize: 'none', required: true, disabled: ed.busy });
                const password = h('input', { type: 'password', name: 'password', autocomplete: 'current-password', required: true, disabled: ed.busy });
                const form = h('form', { class: 'cms-auth-form' },
                    h('label', { class: 'cms-field' }, h('span', { text: UI.username }), username),
                    h('label', { class: 'cms-field' }, h('span', { text: UI.password }), password),
                    h('button', { class: 'cms-primary-button', type: 'submit', disabled: ed.busy }, ed.busy ? UI.loading : UI.signIn, h('span', { 'aria-hidden': 'true', text: '↗' })));
                form.addEventListener('submit', event => { event.preventDefault(); signIn(username.value, password.value); });
                dialog.append(form);
                requestAnimationFrame(() => username.focus());
            } else if (ed.session.must_change_password) {
                dialog.append(passwordForm(true));
            } else {
                // Signed in but without access to this site.
                dialog.append(h('div', { class: 'cms-auth-form' },
                    h('button', { type: 'button', class: 'cms-quiet-button', onclick: () => signOut(), text: UI.signOut })));
            }
            backdrop.append(dialog);
        }

        function passwordForm(isRotation, onDone) {
            const current = h('input', { type: 'password', autocomplete: 'current-password', required: true, disabled: ed.busy });
            const next = h('input', { type: 'password', autocomplete: 'new-password', required: true, minlength: '12', maxlength: '72', disabled: ed.busy });
            const confirm = h('input', { type: 'password', autocomplete: 'new-password', required: true, minlength: '12', maxlength: '72', disabled: ed.busy });
            const form = h('form', { class: isRotation ? 'cms-auth-form' : 'cms-password-form' },
                h('label', { class: 'cms-field' }, h('span', { text: UI.currentPassword }), current),
                h('label', { class: 'cms-field' }, h('span', { text: UI.newPassword }), next),
                h('label', { class: 'cms-field' }, h('span', { text: UI.confirmPassword }), confirm),
                h('button', { class: isRotation ? 'cms-primary-button' : 'cms-quiet-button', type: 'submit', disabled: ed.busy }, UI.changePassword));
            form.addEventListener('submit', async event => {
                event.preventDefault();
                if (isRotation) {
                    if (next.value !== confirm.value) { ed.authError = 'The new passwords do not match.'; renderShell(); return; }
                    ed.busy = true;
                    renderShell();
                    try {
                        const result = await adminRequest('password', { current_password: current.value, new_password: next.value }, ed.session.token);
                        saveSession({ ...ed.session, expires_at: result.expires_at, must_change_password: false });
                        ed.authError = '';
                        ed.busy = false;
                        await checkSession();
                    } catch (error) {
                        ed.busy = false;
                        if (error.status === 401 && /Unauthorized/i.test(error.message)) { saveSession(null); }
                        ed.authError = error.message;
                        renderShell();
                    }
                } else {
                    changePassword(current.value, next.value, confirm.value, onDone);
                }
            });
            if (isRotation) requestAnimationFrame(() => current.focus());
            if (isRotation) {
                const wrap = h('div', {}, form, h('div', { class: 'cms-auth-form' }, h('button', { type: 'button', class: 'cms-quiet-button', onclick: () => signOut(), text: UI.signOut })));
                return wrap;
            }
            return form;
        }

        function toggleGroup(className, label, items, current, onPick) {
            return h('div', { class: `cms-toolbar-group ${className}`, role: 'group', 'aria-label': label },
                items.map(([value, text, aria]) => h('button', { type: 'button', 'aria-pressed': String(current() === value), 'aria-label': aria, 'data-value': value, onclick: () => onPick(value) }, text)));
        }

        function buildWorkspace() {
            const workspace = h('div', { class: 'cms-workspace', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cms-admin-title', 'aria-describedby': 'cms-admin-description' });
            refs.workspace = workspace;

            const toolbarParts = [brand((config.siteName || SITE).toUpperCase(), UI.title)];
            if (LANGS.length > 1) {
                refs.langGroup = toggleGroup('cms-language-picker', 'Language', LANGS.map(lang => [lang, lang.toUpperCase()]), () => site.lang, lang => {
                    site.lang = lang;
                    storage.set('localStorage', 'lang', lang);
                    ed.selection = null;
                    ed.related = [];
                    update();
                    renderInspector();
                    postState();
                });
                toolbarParts.push(refs.langGroup);
            }
            refs.viewGroup = toggleGroup('cms-view-picker', 'Site mode', [['edit', UI.edit], ['preview', UI.preview]], () => ed.view, view => {
                ed.view = view;
                if (view === 'preview') { ed.selection = null; ed.related = []; }
                update();
                renderInspector();
                postState();
            });
            refs.deviceGroup = toggleGroup('cms-device-picker', 'Preview size', [
                ['desktop', h('span', { 'aria-hidden': 'true', text: '▰' }), UI.desktop],
                ['tablet', h('span', { 'aria-hidden': 'true', text: '▯' }), UI.tablet],
                ['mobile', h('span', { 'aria-hidden': 'true', text: '▯' }), UI.mobile],
            ], () => ed.device, device => { ed.device = device; update(); });
            refs.deviceGroup.querySelectorAll('button').forEach(button => button.classList.add('cms-device', `cms-device-${button.dataset.value}`));
            refs.publishState = h('div', { class: 'cms-publish-state' }, h('span', { class: 'cms-state-dot' }), h('span'));
            refs.inspectorToggle = h('button', { type: 'button', class: 'cms-toolbar-text', onclick: () => { ed.inspectorVisible = !ed.inspectorVisible; update(); } },
                h('span', { 'aria-hidden': 'true', text: '◧' }), h('span'));
            refs.accountButton = h('button', { type: 'button', class: 'cms-account-button', 'aria-expanded': 'false', onclick: () => { ed.accountOpen = !ed.accountOpen; update(); } },
                h('span', { 'aria-hidden': 'true', text: '◉' }), UI.account);
            refs.accountPanel = h('div', { class: 'cms-account-panel', hidden: true },
                h('h3', { text: UI.account }),
                h('p', { class: 'cms-help', text: ed.sites.length > 1 ? `Sites: ${ed.sites.map(item => item.name).join(' · ')}` : '' }),
                passwordForm(false, () => { ed.accountOpen = false; update(); }),
                h('button', { type: 'button', class: 'cms-quiet-button cms-signout', onclick: () => signOut(), text: UI.signOut }));
            toolbarParts.push(refs.viewGroup, refs.deviceGroup, refs.publishState,
                h('div', { class: 'cms-toolbar-actions' },
                    refs.inspectorToggle,
                    h('div', { class: 'cms-account-wrap' }, refs.accountButton, refs.accountPanel),
                    h('button', { type: 'button', class: 'cms-exit-button', 'aria-label': UI.close, onclick: () => closeEditor(), text: '×' })));
            workspace.append(h('header', { class: 'cms-toolbar' }, toolbarParts));
            workspace.append(h('div', { id: 'cms-admin-description', class: 'cms-visual-guide' }, h('span', { 'aria-hidden': 'true', text: '✳' }), UI.clickToEdit, h('span', { class: 'cms-guide-rule' })));

            refs.feedback = h('div', { class: 'cms-feedback', hidden: true });
            refs.validation = h('div', { class: 'cms-validation-strip', role: 'status', hidden: true });
            workspace.append(refs.feedback, refs.validation);

            const frameUrl = canvasUrl(ed.canvasPage);
            refs.iframe = h('iframe', { src: frameUrl, title: 'Visual website preview', tabindex: '0' });
            refs.iframe.addEventListener('load', () => {
                // Navigation to a page without the canvas flag would show the public site; keep it in canvas mode.
                try {
                    const url = new URL(refs.iframe.contentWindow.location.href);
                    if (url.origin === location.origin && url.searchParams.get('__cms_canvas') !== '1') {
                        refs.iframe.src = canvasUrl(url.pathname.split('/').pop() || 'index.html', url.hash);
                    }
                } catch { /* cross-origin navigation; leave it */ }
            });
            ed.canvasReady = false;
            refs.canvasLoading = h('div', { class: 'cms-canvas-loading', role: 'status', text: UI.loading });
            refs.frame = h('div', { class: 'cms-canvas-frame device-desktop' }, refs.iframe, refs.canvasLoading);
            refs.caption = h('div', { class: 'cms-canvas-caption' }, h('span'), h('span'));
            refs.canvasArea = h('main', { class: 'cms-canvas-area', 'aria-label': 'Website preview' }, refs.frame, refs.caption);

            refs.inspectorTitle = h('h2');
            refs.inspectorEyebrow = h('p', { class: 'cms-eyebrow' });
            refs.panelButtons = [['selection', UI.selected], ['business', UI.business], ['pages', UI.pages]].map(([panel, text]) =>
                h('button', { type: 'button', 'data-panel': panel, onclick: () => {
                    ed.panel = panel;
                    if (panel !== 'selection') { ed.selection = null; ed.related = []; postState(); }
                    update();
                    renderInspector();
                } }, text));
            refs.fieldset = h('fieldset', { class: 'cms-inspector-fieldset' });
            refs.inspectorScroll = h('div', { class: 'cms-inspector-scroll' });
            refs.fieldset.append(refs.inspectorScroll);
            refs.inspector = h('aside', { class: 'cms-inspector', 'aria-label': 'Content inspector' },
                h('div', { class: 'cms-inspector-heading' }, h('div', {}, refs.inspectorEyebrow, refs.inspectorTitle),
                    h('button', { type: 'button', class: 'cms-inspector-close', 'aria-label': UI.hideInspector, onclick: () => { ed.inspectorVisible = false; update(); }, text: '×' })),
                h('div', { class: 'cms-inspector-switcher', role: 'group', 'aria-label': 'Inspector panels' }, refs.panelButtons),
                refs.fieldset);
            refs.layout = h('div', { class: 'cms-editor-layout' }, refs.canvasArea, refs.inspector);
            workspace.append(refs.layout);

            refs.footerMeta = h('div', { class: 'cms-footer-meta' }, h('span', { class: 'cms-state-dot' }), h('span'));
            refs.discardButton = h('button', { type: 'button', class: 'cms-secondary-button', onclick: discard, text: UI.discard });
            refs.publishButton = h('button', { type: 'button', class: 'cms-publish-button', onclick: publish }, h('span', { class: 'cms-publish-label' }), h('span', { 'aria-hidden': 'true', text: '↗' }));
            workspace.append(h('footer', { class: 'cms-editor-footer' }, refs.footerMeta, h('div', { class: 'cms-footer-actions' }, refs.discardButton, refs.publishButton)));
            backdrop.append(workspace);
        }

        function canvasUrl(page, hash = '') {
            const url = new URL(page, location.href);
            url.searchParams.set('__cms_canvas', '1');
            url.hash = hash;
            return url.toString();
        }

        // ----- DOM: incremental updates -----
        function update() {
            if (!refs.workspace) return;
            const dirty = isDirty();
            const errors = ed.draft ? validationErrors(ed.draft) : [];
            refs.langGroup?.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === site.lang)));
            refs.viewGroup.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === ed.view)));
            refs.deviceGroup.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === ed.device)));
            refs.publishState.classList.toggle('is-dirty', dirty);
            refs.publishState.lastChild.textContent = ed.loading ? UI.loading : dirty ? UI.dirty : UI.published;
            refs.inspectorToggle.lastChild.textContent = ed.inspectorVisible ? UI.hideInspector : UI.showInspector;
            refs.inspectorToggle.setAttribute('aria-label', ed.inspectorVisible ? UI.hideInspector : UI.showInspector);
            refs.accountButton.setAttribute('aria-expanded', String(ed.accountOpen));
            refs.accountPanel.hidden = !ed.accountOpen;

            const message = ed.error || ed.notice || (ed.loadError ? `${UI.loadError} ${ed.loadError}` : '');
            refs.feedback.hidden = !message;
            if (message) {
                refs.feedback.className = `cms-feedback ${ed.error ? 'is-error' : ed.notice ? 'is-success' : 'is-warning'}`;
                refs.feedback.setAttribute('role', ed.error ? 'alert' : 'status');
                const children = [h('span', { text: message })];
                if (ed.conflict) children.push(h('button', { type: 'button', onclick: () => loadLatest(), disabled: ed.busy, text: UI.loadLatest }));
                if (ed.loadError && !ed.error && !ed.notice) children.push(h('button', { type: 'button', onclick: () => hydrate(), disabled: ed.loading, text: ed.loading ? UI.loading : UI.retry }));
                children.push(h('button', { type: 'button', class: 'cms-feedback-close', 'aria-label': 'Dismiss message', onclick: () => { ed.error = ''; ed.notice = ''; ed.loadError = ''; ed.conflict = false; update(); }, text: '×' }));
                refs.feedback.replaceChildren(...children);
            }
            refs.validation.hidden = !errors.length;
            if (errors.length) refs.validation.replaceChildren(h('strong', { text: UI.validation }), h('span', { text: errors.slice(0, 3).join(' · ') }));

            refs.layout.className = `cms-editor-layout ${ed.inspectorVisible ? 'has-inspector' : 'canvas-wide'} ${ed.device === 'mobile' ? 'preview-mobile' : ''}`;
            refs.inspector.hidden = !ed.inspectorVisible;
            refs.frame.className = `cms-canvas-frame device-${ed.device}`;
            refs.canvasLoading.hidden = ed.canvasReady;
            refs.caption.firstChild.textContent = `${UI[ed.device]} · ${pageName(ed.canvasPage)}`;
            refs.caption.lastChild.textContent = ed.view === 'edit' ? 'Editing mode' : UI.preview;

            refs.panelButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.panel === ed.panel)));
            refs.inspectorEyebrow.textContent = ed.panel === 'selection' ? (ed.selection?.section || UI.selected) : ed.panel === 'business' ? UI.business : UI.pages;
            refs.inspectorTitle.textContent = ed.panel === 'business' ? 'Business details' : ed.panel === 'pages' ? UI.choosePage
                : ed.selection ? (ed.selection.label || fieldLabel(ed.selection)) : UI.clickToEdit;
            refs.fieldset.disabled = ed.busy || ed.loading || !ed.draft;

            refs.footerMeta.classList.toggle('is-dirty', dirty);
            refs.footerMeta.firstChild.classList.toggle('is-dirty', dirty);
            refs.footerMeta.lastChild.textContent = dirty ? `${UI.dirty} · ${changedKeys().length} document${changedKeys().length === 1 ? '' : 's'}` : UI.noChanges;
            refs.discardButton.disabled = !dirty || ed.busy;
            refs.publishButton.disabled = !dirty || ed.busy || ed.loading || errors.length > 0;
            refs.publishButton.querySelector('.cms-publish-label').textContent = ed.busy ? UI.publishing : UI.publish;
        }

        function pageName(page) {
            const match = (config.pages || []).find(([href]) => href === page);
            return match ? match[1] : page;
        }

        // ----- DOM: inspector -----
        function renderInspector() {
            if (!refs.inspectorScroll) return;
            const container = refs.inspectorScroll;
            const focusedPath = document.activeElement?.dataset?.cmsInput;
            container.replaceChildren();
            if (!ed.draft) {
                container.append(h('div', { class: 'cms-empty-inspector' }, h('p', { text: UI.loading })));
                return;
            }
            if (ed.panel === 'business') container.append(businessPanel());
            else if (ed.panel === 'pages') container.append(pagesPanel());
            else container.append(...selectionPanel());
            if (focusedPath) container.querySelector(`[data-cms-input="${CSS.escape(focusedPath)}"]`)?.focus();
        }

        function selectionPanel() {
            const parts = [];
            const selection = ed.selection;
            if (!selection) {
                parts.push(h('div', { class: 'cms-empty-inspector' }, h('span', { class: 'cms-select-mark', 'aria-hidden': 'true', text: '↖' }), h('p', { text: UI.emptyHint })));
                parts.push(sectionNavigator());
                return parts;
            }
            if (ed.related.length) {
                parts.push(h('section', { class: 'cms-related-fields' }, h('p', { text: UI.related }), h('div', {},
                    ed.related.map(item => h('button', { type: 'button', onclick: () => { ed.selection = item; update(); renderInspector(); postState(); } },
                        h('span', { text: item.label || fieldLabel(item) }),
                        h('small', { text: item.kind === 'media' ? UI.media : item.kind === 'setting' ? UI.settings : UI.copy }))))));
            }
            if (selection.kind === 'media') parts.push(mediaInspector(selection));
            else parts.push(valueInspector(selection));
            parts.push(sectionNavigator());
            return parts;
        }

        function valueInspector(selection) {
            const value = selectionValue(selection);
            const fullParts = [...selectionRootParts(selection), ...pathParts(selection.path)];
            const field = selection.kind === 'setting' ? SETTING_FIELDS.find(item => item.key === selection.path) : null;
            const section = h('section', { class: 'cms-context-section' },
                h('div', { class: 'cms-context-label' }, h('span', { text: selection.kind === 'setting' ? UI.settings : UI.copy }),
                    h('span', { class: 'cms-language-pill', text: selection.kind === 'setting' ? 'ALL PAGES' : site.lang.toUpperCase() })));
            const disabled = !canEdit();
            let control;
            if (typeof value === 'boolean') {
                control = h('input', { type: 'checkbox', checked: value, disabled, onchange: event => setAt(fullParts, event.target.checked) });
            } else if (typeof value === 'number') {
                control = h('input', { type: 'number', value: String(value), disabled, oninput: event => { const next = Number(event.target.value); if (Number.isFinite(next)) setAt(fullParts, next); } });
            } else {
                const text = String(value ?? '');
                const multiline = !field && (text.length > 72 || /desc|text|note|quote|address|paragraph|caption|subtitle/i.test(selection.path));
                control = multiline
                    ? h('textarea', { maxlength: String(MAX_TEXT), rows: String(Math.min(9, Math.max(4, Math.ceil(text.length / 55)))), disabled })
                    : h('input', { type: field?.type === 'email' ? 'email' : field?.type === 'url' ? 'url' : 'text', maxlength: String(field ? (field.maxLength || 2048) : MAX_TEXT), disabled });
                control.value = text;
                control.addEventListener('input', event => setAt(fullParts, event.target.value));
            }
            control.dataset.cmsInput = `${selection.kind}:${selection.path}`;
            const hint = field?.help || (selection.kind === 'setting' ? 'Used everywhere this detail appears, including its links.' : '');
            section.append(h('label', { class: 'cms-field cms-copy-control' }, h('span', { text: selection.label || fieldLabel(selection) }), control, hint ? h('small', { text: hint }) : null));
            if (selection.kind === 'copy') requestAnimationFrame(() => { if (!disabled && document.activeElement === document.body) control.focus(); });
            return section;
        }

        function mediaInspector(selection) {
            const parts = pathParts(selection.path);
            const kind = parts[0] === 'videos' ? 'videos' : 'images';
            const url = selectionValue(selection);
            const fullParts = ['media', ...parts];
            const section = h('section', { class: 'cms-context-section cms-media-inspector' },
                h('div', { class: 'cms-context-label' }, h('span', { text: UI.media }), h('span', { class: 'cms-language-pill', text: kind })));
            section.append(h('div', { class: `cms-current-media ${kind === 'videos' ? 'is-video' : ''}` },
                kind === 'videos' ? h('video', { src: url, controls: true, playsinline: true, preload: 'metadata' }) : h('img', { src: url, alt: selection.label || '' })));
            section.append(h('div', { class: 'cms-asset-details' }, h('span', { text: 'Current file' }), h('small', { title: url, text: decodeURIComponent(String(url).split('/').pop() || '') })));
            if (ed.view === 'edit') {
                const input = h('input', { type: 'file', accept: kind === 'videos' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/avif,image/gif', disabled: ed.busy });
                input.addEventListener('change', () => { upload(input.files?.[0], fullParts); input.value = ''; });
                section.append(h('label', { class: `cms-upload-action ${ed.busy ? 'is-disabled' : ''}` }, ed.busy ? UI.loading : UI.replace, input));
            }
            section.append(h('p', { class: 'cms-help', text: UI.uploadHelp }));
            const search = h('input', { type: 'search', 'aria-label': UI.search, placeholder: UI.search, value: ed.search });
            search.addEventListener('input', () => {
                ed.search = search.value;
                const grid = section.querySelector('.cms-library-slot');
                grid.replaceChildren(libraryGrid(kind, fullParts, url));
            });
            section.append(h('div', { class: 'cms-library-heading' }, h('h3', { text: UI.library }), h('label', { class: 'cms-search' }, h('span', { 'aria-hidden': 'true', text: '⌕' }), search)));
            if (ed.libraryError) section.append(h('button', { type: 'button', class: 'cms-retry-library', onclick: () => loadLibrary(), text: UI.retryLibrary }));
            section.append(h('div', { class: 'cms-library-slot' }, libraryGrid(kind, fullParts, url)));
            return section;
        }

        function libraryGrid(kind, fullParts, currentUrl) {
            const items = libraryItems(kind);
            if (!items.length) return h('p', { class: 'cms-library-empty', text: ed.libraryLoading ? UI.loading : UI.noLibrary });
            return h('div', { class: 'cms-library-grid' }, items.map(item => h('button', {
                type: 'button',
                class: `cms-library-item ${item.url === currentUrl ? 'is-current' : ''}`,
                title: `Use ${item.name}`,
                disabled: !canEdit(),
                onclick: () => { setAt(fullParts, item.url); showMessage('notice', UI.mediaUpdated); renderInspector(); },
            }, String(item.mime).startsWith('video/') ? h('span', { class: 'cms-library-video', 'aria-hidden': 'true', text: '▶' }) : h('img', { src: item.url, alt: '', loading: 'lazy' }),
            h('span', { text: item.name }))));
        }

        function businessPanel() {
            const section = h('section', { class: 'cms-context-section cms-business-panel' }, h('p', { class: 'cms-panel-kicker', text: 'Shared across every page' }));
            if (!SETTING_FIELDS.length) section.append(h('p', { class: 'cms-help', text: 'This site has no business details configured.' }));
            SETTING_FIELDS.forEach(field => {
                const input = h('input', {
                    type: field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text',
                    maxlength: String(field.maxLength || 2048),
                    disabled: !canEdit(),
                });
                input.value = String(ed.draft.settings[field.key] ?? '');
                input.dataset.cmsInput = `setting:${field.key}`;
                input.addEventListener('input', () => setAt(['settings', field.key], input.value));
                section.append(h('label', { class: 'cms-field' }, h('span', { text: field.label }), input, field.help ? h('small', { text: field.help }) : null));
            });
            return section;
        }

        function sectionNavigator() {
            let sections = [];
            try {
                sections = Array.from(refs.iframe.contentDocument?.querySelectorAll('[data-cms-section][id]') || [])
                    .map(node => [node.id, node.getAttribute('data-cms-section')])
                    .filter(([id]) => /^[a-z][a-z0-9-]{0,60}$/.test(id));
            } catch { sections = []; }
            if (!sections.length) return h('span');
            return h('section', { class: 'cms-section-navigator' }, h('h3', { text: UI.jumpTo }), h('div', {},
                sections.map(([id, label]) => h('button', { type: 'button', onclick: () => frameWindow()?.postMessage({ type: 'site-editor:scroll', id }, location.origin) },
                    label, h('span', { 'aria-hidden': 'true', text: '↗' })))));
        }

        function pagesPanel() {
            const pages = Array.isArray(config.pages) ? config.pages : [];
            const section = h('section', { class: 'cms-context-section' }, h('p', { class: 'cms-panel-kicker', text: `${UI.currentPage}: ${pageName(ed.canvasPage)}` }));
            section.append(h('div', { class: 'cms-page-list' }, pages.map(([href, label]) => h('button', {
                type: 'button',
                'aria-pressed': String(href === ed.canvasPage),
                onclick: () => {
                    ed.canvasPage = href;
                    ed.canvasReady = false;
                    ed.selection = null;
                    ed.related = [];
                    refs.iframe.src = canvasUrl(href);
                    update();
                    renderInspector();
                },
            }, label, h('span', { 'aria-hidden': 'true', text: '→' })))));
            section.append(sectionNavigator());
            return section;
        }

        renderShell();
        checkSession();
        return ed;
    }

    // ---------- canvas (inside the editor iframe) ----------
    function startCanvas() {
        const parentWindow = window.parent;
        const post = message => parentWindow.postMessage(message, location.origin);
        let state = null;
        let editing = false;
        let selected = null;
        let selectedNode = null;
        let hoveredNode = null;
        const tabbed = new Map();

        const overlay = document.createElement('div');
        overlay.className = 'cms-canvas-selection';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.hidden = true;
        const tag = document.createElement('span');
        overlay.append(tag);

        const sameSelection = (a, b) => Boolean(a && b && a.kind === b.kind && a.path === b.path);

        function valueFor(selection) {
            if (!state) return undefined;
            const root = selection.kind === 'copy' ? state.content.copy[state.lang] : selection.kind === 'media' ? state.content.media : state.content.settings;
            return readPath(root, selection.path);
        }
        function valid(selection) {
            if (!selection || !pathParts(selection.path)) return false;
            const value = valueFor(selection);
            return selection.kind === 'media' ? typeof value === 'string' : ['string', 'number', 'boolean'].includes(typeof value);
        }
        function binding(node) {
            const copy = node.getAttribute('data-cms-copy');
            const setting = node.getAttribute('data-cms-setting');
            const media = node.getAttribute('data-cms-media');
            const path = copy || setting || media;
            if (!path) return null;
            const selection = {
                kind: copy ? 'copy' : setting ? 'setting' : 'media',
                path,
                label: node.getAttribute('data-cms-label')?.slice(0, 120) || undefined,
                section: node.closest('[data-cms-section]')?.getAttribute('data-cms-section')?.slice(0, 120) || undefined,
            };
            selection.label = selection.label || fieldLabel(selection);
            return valid(selection) ? selection : null;
        }
        const target = event => event.target instanceof Element ? event.target.closest(SELECTOR) : null;

        function decorate() {
            if (!editing) return;
            document.querySelectorAll(SELECTOR).forEach(node => {
                if (node.closest('[aria-hidden="true"],[inert]') || tabbed.has(node)) return;
                if (node.matches('a[href],button,input,textarea,select,[tabindex]')) return;
                tabbed.set(node, node.getAttribute('tabindex'));
                node.tabIndex = 0;
            });
        }
        function undecorate() {
            tabbed.forEach((value, node) => value === null ? node.removeAttribute('tabindex') : node.setAttribute('tabindex', value));
            tabbed.clear();
        }
        const observer = new MutationObserver(decorate);

        function choose(event) {
            if (!editing) return;
            const node = target(event);
            const selection = node && binding(node);
            if (!node || !selection) {
                // Keep links and buttons from navigating while editing.
                if (event.type === 'click' && event.target instanceof Element && event.target.closest('a[href],button,summary')) event.preventDefault();
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            selected = selection;
            selectedNode = node;
            const related = [];
            for (let ancestor = node; ancestor && related.length < 8; ancestor = ancestor.parentElement) {
                for (const [attribute, kind] of [['data-cms-copy', 'copy'], ['data-cms-setting', 'setting'], ['data-cms-media', 'media']]) {
                    const path = ancestor.getAttribute(attribute);
                    if (!path) continue;
                    const field = { kind, path, label: ancestor.getAttribute('data-cms-label')?.slice(0, 120) || undefined };
                    field.label = field.label || fieldLabel(field);
                    if (valid(field) && !sameSelection(field, selection) && !related.some(item => sameSelection(item, field))) related.push(field);
                }
            }
            post({ type: 'site-editor:select', selection, related });
        }

        function keepCanvasNavigation(event) {
            if (editing || event.defaultPrevented || !(event.target instanceof Element)) return;
            const link = event.target.closest('a[href]');
            if (!link || link.target === '_blank') return;
            const url = new URL(link.href, location.href);
            if (url.origin !== location.origin || url.pathname === location.pathname) return;
            event.preventDefault();
            url.searchParams.set('__cms_canvas', '1');
            location.href = url.toString();
        }

        window.addEventListener('message', event => {
            if (event.source !== parentWindow || event.origin !== location.origin || !isPlainObject(event.data)) return;
            const message = event.data;
            if (message.type === 'site-editor:scroll' && typeof message.id === 'string' && /^[a-z][a-z0-9-]{0,60}$/.test(message.id)) {
                document.getElementById(message.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
            if (message.type !== 'site-editor:state' || !LANGS.includes(message.lang) || !validContentShape(message.content)) return;
            state = { content: message.content, lang: message.lang };
            render(state.content, state.lang);
            editing = message.editing === true;
            document.documentElement.classList.toggle('cms-canvas-editing', editing);
            if (editing) {
                decorate();
                observer.observe(document.body, { childList: true, subtree: true });
            } else {
                observer.disconnect();
                undecorate();
                hoveredNode = null;
            }
            selected = message.selection && valid(message.selection) ? message.selection : null;
            if (selectedNode && !sameSelection(binding(selectedNode), selected)) selectedNode = null;
        });

        document.addEventListener('click', choose, true);
        document.addEventListener('click', keepCanvasNavigation);
        document.addEventListener('pointerdown', event => { if (editing && target(event)) event.stopImmediatePropagation(); }, true);
        document.addEventListener('pointerover', event => {
            if (!editing) return;
            const node = target(event);
            hoveredNode = node && binding(node) ? node : null;
        }, true);
        document.addEventListener('keydown', event => {
            if (editing && (event.key === 'Enter' || event.key === ' ') && target(event)) choose(event);
        }, true);
        document.documentElement.addEventListener('pointerleave', () => { hoveredNode = null; });
        // The parent provides login; never open a nested editor inside the canvas.
        document.addEventListener('click', event => {
            if (event.target instanceof Element && event.target.closest('[data-cms-login]')) { event.preventDefault(); event.stopImmediatePropagation(); }
        }, true);

        function findSelected() {
            return Array.from(document.querySelectorAll(SELECTOR)).find(node => sameSelection(binding(node), selected) && node.getClientRects().length > 0) || null;
        }
        let last = '';
        function draw() {
            if (!selected) selectedNode = null;
            else if (editing && !selectedNode?.isConnected) selectedNode = findSelected();
            const node = editing ? (hoveredNode?.isConnected ? hoveredNode : selectedNode) : null;
            const field = node && binding(node);
            let next = null;
            if (node && field) {
                const rect = node.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight) {
                    next = { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height), label: field.label, selected: sameSelection(field, selected) };
                }
            }
            const key = JSON.stringify(next);
            if (key !== last) {
                last = key;
                overlay.hidden = !next;
                if (next) {
                    overlay.classList.toggle('is-selected', next.selected);
                    Object.assign(overlay.style, { left: `${next.left}px`, top: `${next.top}px`, width: `${next.width}px`, height: `${next.height}px` });
                    tag.textContent = next.label;
                    tag.style.top = next.top < 30 ? `${Math.max(4, 8 - next.top)}px` : '-27px';
                    tag.style.left = `${Math.max(0, 8 - next.left)}px`;
                }
            }
            requestAnimationFrame(draw);
        }

        const start = () => {
            document.body.append(overlay);
            requestAnimationFrame(draw);
            post({ type: 'site-editor:ready', page: location.pathname.split('/').pop() || 'index.html' });
        };
        if (document.body) start();
        else document.addEventListener('DOMContentLoaded', start, { once: true });
    }
})();
