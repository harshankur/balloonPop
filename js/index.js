(() => {
    'use strict';

    // ---------- Config ----------

    const CURRENTURL = new URL(window.location.href);
    const ISANDROID = CURRENTURL.searchParams.get("device") == 'android';
    const ISTOUCHDEVICE = ISANDROID || window.matchMedia('(pointer: coarse)').matches;

    const BALLOON_LIFE = 5000;                      // ms before an unpopped balloon bursts by itself
    const MAX_MISSES = 20;
    const FIRST_SPAWN = 600;                        // ms after pressing Play
    const MAX_TIMEOUT = 1000;                       // starting gap between balloons, in ms
    const MIN_TIMEOUT = ISTOUCHDEVICE ? 200 : 500;  // the gap never shrinks below this
    const DECREMENT_INDEX = 40;                     // each balloon shrinks the gap by 1/40th
    const SHARE_URL = 'https://balloonpop.harshankur.com/';

    const COLORS = ['#ff4d5a', '#ff9f1c', '#ffd23f', '#2ec4a6', '#3b82f6', '#8b5cf6', '#ff6bb5'];

    // ---------- Elements ----------

    const $ = (id) => document.getElementById(id);
    const board = $('board');
    const balloonLayer = $('balloons');
    const fxLayer = $('fx');
    const ambientLayer = $('ambient');
    const scoreEl = $('score');
    const bestEl = $('best');
    const livesEl = $('lives');
    const livesCountEl = $('livesCount');
    const livesFillEl = $('livesFill');
    const soundButton = $('soundButton');
    const pauseButton = $('pauseButton');
    const startDialog = $('startDialog');
    const pauseDialog = $('pauseDialog');
    const overDialog = $('overDialog');

    document.documentElement.style.setProperty('--life', BALLOON_LIFE + 'ms');

    // ---------- Storage ----------

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } }
    };

    function loadBest() {
        const saved = parseInt(store.get('bp.best'), 10);
        if (saved >= 0)
            return saved;

        // Carry over the high score from the old cookie-based version
        const legacy = document.cookie.match(/(?:^|;\s*)highestPoppedBalloons=(\d+)/);
        const value = legacy ? parseInt(legacy[1], 10) : 0;
        if (value)
            store.set('bp.best', value);
        return value;
    }

    // ---------- State ----------

    let best = loadBest();
    let soundOn = store.get('bp.sound') != 'off';

    const game = {
        phase: 'idle',      // idle | playing | paused | over
        clock: 0,           // ms of actual play time; stops while paused
        last: 0,
        nextSpawn: 0,
        timeOut: MAX_TIMEOUT,
        score: 0,
        misses: 0,
        bestAtStart: 0,
        raf: 0
    };

    let balloons = [];
    const balloonByElement = new Map();
    let boardW = 0, boardH = 0, size = 64;

    // ---------- Sound ----------

    let audio = null;
    let noiseBuffer = null;

    function getAudio() {
        if (!audio) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx)
                audio = new AudioCtx();
        }
        if (audio && audio.state == 'suspended')
            audio.resume();
        return audio;
    }

    function tone(ctx, { type = 'sine', from, to, start = 0, dur, gain }) {
        const t = ctx.currentTime + start;
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(from, t);
        osc.frequency.exponentialRampToValueAtTime(to, t + dur);
        amp.gain.setValueAtTime(gain, t);
        amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(amp).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    function playSound(kind) {
        if (!soundOn)
            return;
        const ctx = getAudio();
        if (!ctx)
            return;

        if (kind == 'pop') {
            if (!noiseBuffer) {
                noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < data.length; i++)
                    data[i] = Math.random() * 2 - 1;
            }
            const t = ctx.currentTime;
            const src = ctx.createBufferSource();
            const hp = ctx.createBiquadFilter();
            const amp = ctx.createGain();
            src.buffer = noiseBuffer;
            src.playbackRate.value = 0.9 + Math.random() * 0.4;
            hp.type = 'highpass';
            hp.frequency.value = 900;
            amp.gain.setValueAtTime(0.32, t);
            amp.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
            src.connect(hp).connect(amp).connect(ctx.destination);
            src.start(t);
            src.stop(t + 0.12);
            const pitch = 380 + Math.random() * 160;
            tone(ctx, { from: pitch, to: pitch * 0.4, dur: 0.09, gain: 0.16 });
        }
        else if (kind == 'miss') {
            tone(ctx, { from: 240, to: 110, dur: 0.18, gain: 0.12 });
        }
        else if (kind == 'over') {
            [392, 330, 262].forEach((f, i) => tone(ctx, { type: 'triangle', from: f, to: f * 0.98, start: i * 0.16, dur: 0.3, gain: 0.14 }));
        }
    }

    function vibrate(ms) {
        if (soundOn && navigator.vibrate)
            navigator.vibrate(ms);
    }

    function renderSoundButton() {
        soundButton.setAttribute('aria-pressed', String(!soundOn));
        soundButton.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Unmute sound');
        $('soundIcon').setAttribute('href', soundOn ? '#i-sound-on' : '#i-sound-off');
    }

    // ---------- HUD ----------

    function bump(el) {
        el.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
    }

    // The page title shows the score once a game is under way. It is left alone on load, because the
    // view tracker reads the title then and should record the plain "Balloon Pop".
    function renderScore(updateTitle = true) {
        scoreEl.textContent = game.score;
        if (updateTitle)
            document.title = `Balloon Pop (Score: ${game.score})`;
    }

    function renderBest() {
        bestEl.textContent = best;
    }

    function renderLives() {
        const left = MAX_MISSES - game.misses;
        livesCountEl.textContent = left;
        livesFillEl.style.transform = `scaleX(${left / MAX_MISSES})`;
        livesEl.setAttribute('aria-label', `${left} lives left`);
        livesEl.classList.toggle('low', left <= 5 && game.phase == 'playing');
    }

    function formatTime(ms) {
        const total = Math.floor(ms / 1000);
        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    }

    // ---------- Layout ----------

    function measure() {
        const rect = board.getBoundingClientRect();
        boardW = rect.width;
        boardH = rect.height;
        size = Math.round(Math.min(92, Math.max(54, Math.min(boardW, boardH) * 0.13)));
        board.style.setProperty('--size', size + 'px');
    }

    // Of a handful of random spots, pick the one furthest from existing balloons so they rarely stack.
    function pickSpot() {
        const pad = size * 0.3;                     // balloons inflate by 25% around their centre
        const maxX = Math.max(pad, boardW - size - pad);
        const maxY = Math.max(pad, boardH - size * 1.2 - size * 0.55 - pad);
        let spot = null;
        let spotDistance = -1;
        for (let i = 0; i < 10; i++) {
            const x = pad + Math.random() * (maxX - pad);
            const y = pad + Math.random() * (maxY - pad);
            let nearest = Infinity;
            for (const b of balloons)
                nearest = Math.min(nearest, Math.hypot(b.x - x, b.y - y));
            if (nearest > spotDistance) {
                spotDistance = nearest;
                spot = { x, y };
            }
        }
        return spot;
    }

    function createBalloonElement(color) {
        const el = document.createElement('div');
        el.className = 'balloon';
        el.style.setProperty('--c', color);
        el.innerHTML = '<div class="balloon-body"></div><div class="balloon-ring"></div>';
        return el;
    }

    // ---------- Effects ----------

    function burst(cx, cy, color, missed) {
        const count = missed ? 5 : 10;
        const reach = size / 64;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const dist = (missed ? 18 + Math.random() * 18 : 36 + Math.random() * 46) * reach;
            const p = document.createElement('i');
            p.className = missed ? 'particle miss' : 'particle';
            p.style.left = cx + 'px';
            p.style.top = cy + 'px';
            p.style.setProperty('--c', color);
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            p.addEventListener('animationend', () => p.remove(), { once: true });
            fxLayer.appendChild(p);
        }
    }

    function floatPlus(cx, cy) {
        const el = document.createElement('span');
        el.className = 'plus';
        el.textContent = '+1';
        el.style.left = cx + 'px';
        el.style.top = cy + 'px';
        el.addEventListener('animationend', () => el.remove(), { once: true });
        fxLayer.appendChild(el);
    }

    function centreOf(b) {
        return { x: b.x + size / 2, y: b.y + size * 0.6 };
    }

    // ---------- Ambient balloons (start and game over screens) ----------

    function showAmbient() {
        ambientLayer.textContent = '';
        const count = Math.max(4, Math.min(9, Math.round(boardW / 110)));
        for (let i = 0; i < count; i++) {
            const el = createBalloonElement(COLORS[i % COLORS.length]);
            const rise = 14 + Math.random() * 12;
            el.style.left = Math.random() * Math.max(0, boardW - size) + 'px';
            el.style.top = boardH + 20 + 'px';
            el.style.setProperty('--size', size * (0.8 + Math.random() * 0.8) + 'px');
            el.style.setProperty('--rise', rise + 's');
            el.style.setProperty('--delay', -Math.random() * rise + 's');
            ambientLayer.appendChild(el);
        }
    }

    function clearAmbient() {
        ambientLayer.textContent = '';
    }

    // ---------- Game flow ----------

    function removeBalloon(b) {
        b.el.remove();
        balloonByElement.delete(b.el);
        balloons = balloons.filter((other) => other !== b);
    }

    function clearBalloons() {
        balloons = [];
        balloonByElement.clear();
        balloonLayer.textContent = '';
        fxLayer.textContent = '';
    }

    function spawnBalloon() {
        const { x, y } = pickSpot();
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const el = createBalloonElement(color);
        el.style.left = x + 'px';
        el.style.top = y + 'px';

        const b = { el, x, y, color, born: game.clock };
        balloons.push(b);
        balloonByElement.set(el, b);
        balloonLayer.appendChild(el);

        if (game.timeOut >= MIN_TIMEOUT)
            game.timeOut -= Math.trunc(game.timeOut / DECREMENT_INDEX);
        game.nextSpawn = game.clock + game.timeOut;
    }

    function popBalloon(b) {
        const { x, y } = centreOf(b);
        removeBalloon(b);
        burst(x, y, b.color, false);
        floatPlus(x, y);
        playSound('pop');
        vibrate(8);

        game.score++;
        renderScore();
        bump(scoreEl);
        if (game.score > best) {
            best = game.score;
            store.set('bp.best', best);
            renderBest();
        }
    }

    function missBalloon(b) {
        const { x, y } = centreOf(b);
        removeBalloon(b);
        burst(x, y, b.color, true);
        playSound('miss');

        game.misses++;
        renderLives();
        livesEl.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
            { duration: 240 }
        );

        if (game.misses >= MAX_MISSES)
            endGame();
    }

    function frame(now) {
        if (game.phase != 'playing')
            return;

        // A long gap (slow device, throttled tab) must not count against the player
        game.clock += Math.min(now - game.last, 100);
        game.last = now;

        for (const b of balloons.slice()) {
            if (game.clock - b.born >= BALLOON_LIFE) {
                missBalloon(b);
                if (game.phase != 'playing')
                    return;
            }
        }

        if (game.clock >= game.nextSpawn)
            spawnBalloon();

        game.raf = requestAnimationFrame(frame);
    }

    function startGame() {
        cancelAnimationFrame(game.raf);
        startDialog.close();
        pauseDialog.close();
        overDialog.close();

        measure();
        clearBalloons();
        clearAmbient();
        board.classList.remove('is-paused');

        game.phase = 'playing';
        game.clock = 0;
        game.nextSpawn = FIRST_SPAWN;
        game.timeOut = MAX_TIMEOUT;
        game.score = 0;
        game.misses = 0;
        game.bestAtStart = best;

        renderScore();
        renderBest();
        renderLives();
        pauseButton.disabled = false;
        getAudio();

        game.last = performance.now();
        game.raf = requestAnimationFrame(frame);
    }

    function pauseGame() {
        if (game.phase != 'playing')
            return;
        game.phase = 'paused';
        cancelAnimationFrame(game.raf);
        board.classList.add('is-paused');
        livesEl.classList.remove('low');
        pauseDialog.showModal();
    }

    function resumeGame() {
        if (game.phase != 'paused')
            return;
        game.phase = 'playing';
        board.classList.remove('is-paused');
        renderLives();
        if (pauseDialog.open)
            pauseDialog.close();
        game.last = performance.now();
        game.raf = requestAnimationFrame(frame);
    }

    function endGame() {
        game.phase = 'over';
        cancelAnimationFrame(game.raf);
        pauseButton.disabled = true;
        livesEl.classList.remove('low');
        playSound('over');

        // Pop whatever is left on screen so nothing lingers behind the dialog
        for (const b of balloons) {
            const { x, y } = centreOf(b);
            burst(x, y, b.color, true);
        }
        balloonLayer.textContent = '';
        balloons = [];
        balloonByElement.clear();
        showAmbient();

        const newBest = game.score > game.bestAtStart && game.score > 0;
        $('finalScore').textContent = game.score;
        $('finalBest').textContent = best;
        $('finalTime').textContent = formatTime(game.clock);
        $('newBestBadge').hidden = !newBest;
        $('shareLabel').textContent = (ISANDROID || navigator.share) ? 'Share' : 'Copy link';
        $('shareIcon').setAttribute('href', (ISANDROID || navigator.share) ? '#i-share' : '#i-copy');
        $('startBestValue').textContent = best;
        $('startBest').hidden = false;

        setTimeout(() => {
            if (game.phase == 'over')
                showCard(overDialog);
        }, 550);
    }

    // ---------- Sharing ----------

    function shareText() {
        return `I scored ${game.score} on Balloon Pop. Can you beat it?`;
    }

    // Inside the Android WebView window.open() would load the page over the game, so every
    // link that leaves the game must go through here (or be a plain <a href>, which the click
    // handler below routes the same way).
    function openExternal(url) {
        if (ISANDROID)
            AndroidShareHandler.nativeOpenBrowserLink(url);
        else
            window.open(url, '_blank', 'noopener');
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        }
        catch (e) { /* no clipboard permission, or an insecure page: fall back to a hidden textarea */ }

        // Appended to the open dialog, because everything outside a modal dialog is inert
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        overDialog.appendChild(field);
        field.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch (e) { /* copy blocked */ }
        field.remove();
        return copied;
    }

    // The system share sheet where there is one (Android app, iOS, Android, Safari, Chrome and Edge),
    // otherwise the link is copied, so every browser has a working way to share.
    async function shareScore() {
        const shareData = { title: 'Balloon Pop', text: shareText(), url: SHARE_URL };

        if (ISANDROID) {
            AndroidShareHandler.nativeShare(shareData.title, shareData.text, shareData.url);
        }
        else if (navigator.share) {
            try { await navigator.share(shareData); } catch (e) { /* share sheet dismissed */ }
        }
        else {
            const label = $('shareLabel');
            label.textContent = (await copyText(`${shareData.text} ${shareData.url}`)) ? 'Copied!' : 'Copy failed';
            setTimeout(() => { label.textContent = 'Copy link'; }, 1800);
        }
    }

    function postScore() {
        const postUrl = 'https://x.com/intent/tweet'
            + `?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(SHARE_URL)}&hashtags=balloonPop`;

        // The X app still uses the com.twitter.android package. If it is missing or does not take the
        // link, the native side falls back to the browser.
        if (ISANDROID)
            AndroidShareHandler.nativeTwitterShare(postUrl);
        else
            openExternal(postUrl);
    }

    // ---------- Consent prompt ----------

    // The view counter asks before it counts in detail, with a prompt of its own (consent.js, which runs after this
    // script) that it adds at the end of the page, fixed to the bottom corner of the window. Two things are moved:
    //  - While a card is open as a modal dialog, everything outside it is inert: the prompt would show above the
    //    backdrop but could not be answered. So it lives inside a card: the open start or game-over card (the ones
    //    with the button that opens it again), and otherwise the start card, which is closed during play, so the
    //    prompt never covers a balloon.
    //  - On a phone the card fills the screen, and the prompt at the bottom would cover its Play button. So it sits
    //    in an anchor that ends just above the card's main button: the prompt places itself against the anchor's
    //    bottom (the anchor is its containing block, see .consent-anchor) and covers at most the text above it.
    //    Where there is less room than the prompt needs above the button (a phone on its side), it keeps its own
    //    place at the bottom right of the window, and while it shows, the card moves aside to the left: as narrow
    //    as it needs to be for both to fit side by side, and where even the narrowest card leaves too little room,
    //    the prompt is drawn a little smaller (the anchor is scaled towards its corner).
    const CONSENT_PROMPT = 'viewcounter-consent';
    const WIDE_WINDOW = 480;    // px from which the prompt no longer spans the window (consent.js)
    const PROMPT_ROOM = 300;    // px the prompt needs above a button: what it takes on a narrow phone, and a little more
    const PROMPT_WIDTH = 360;   // px the prompt is wide in a wide window (consent.js)
    const EDGE = 16;            // px between the card, the prompt and the window's edges
    const CARD_WIDTH = 380;     // px the card is wide by itself (index.css)
    const MIN_CARD_WIDTH = 300; // px the card may narrow to beside the prompt
    // Where the prompt is looked for, from the window's bottom right corner: inside it, clear of its rounded corner
    const PROBE_X = 60;
    const PROBE_Y = 30;
    const mainButtons = new Map([[startDialog, $('playButton')], [overDialog, $('restartButton')]]);
    const consentAnchor = document.createElement('div');
    consentAnchor.className = 'consent-anchor';

    // Whether the prompt is up. It says so only when it is answered, so it is looked for where it would be: the
    // page cannot see into it, but a point it covers hits its element.
    function promptShown() {
        const consent = window.viewcounterConsent;
        if (!consent)
            return false;
        // While it waits out the card's entrance it cannot be hit; then only a first question can be up
        if (consentAnchor.getAnimations().length)
            return consent.status() == 'unset';
        const hit = document.elementFromPoint(window.innerWidth - PROBE_X, window.innerHeight - PROBE_Y);
        return hit !== null && hit === document.querySelector(CONSENT_PROMPT);
    }

    function setCardAside(card, aside) {
        card.classList.toggle('card-aside', aside);
        if (!aside) {
            card.style.width = '';
            consentAnchor.style.transform = '';
            return;
        }
        const free = window.innerWidth - 3 * EDGE;
        const cardWidth = Math.min(CARD_WIDTH, Math.max(MIN_CARD_WIDTH, free - PROMPT_WIDTH));
        const scale = Math.min(1, (free - cardWidth) / PROMPT_WIDTH);
        card.style.width = cardWidth + 'px';
        consentAnchor.style.transform = scale < 1 ? `scale(${scale})` : '';
    }

    function fitConsentPrompt() {
        const card = consentAnchor.parentElement;
        if (!card || !card.open)
            return;
        // Measured as the card stands by itself, so moving it aside cannot change the outcome.
        // Offsets, unlike the bounding box, ignore the card's entrance animation.
        setCardAside(card, false);
        const room = card.offsetTop + card.clientTop + mainButtons.get(card).offsetTop - card.scrollTop;
        const fits = room >= PROMPT_ROOM;
        consentAnchor.style.height = fits ? room + 'px' : '';
        if (!fits && window.innerWidth >= WIDE_WINDOW && promptShown())
            setCardAside(card, true);
    }

    function placeConsentPrompt() {
        const prompt = document.querySelector(CONSENT_PROMPT);
        if (!prompt)
            return;
        if (prompt.parentElement !== consentAnchor)
            consentAnchor.appendChild(prompt);
        const card = [...mainButtons.keys()].find((dialog) => dialog.open) || startDialog;
        if (consentAnchor.parentElement !== card)
            card.appendChild(consentAnchor);
        fitConsentPrompt();
    }

    function showCard(dialog) {
        dialog.showModal();
        placeConsentPrompt();
    }

    new MutationObserver(placeConsentPrompt).observe(document.body, { childList: true });
    // The button moves when the window changes size and when the card's own content does (the font arriving)
    const cardObserver = new ResizeObserver(fitConsentPrompt);
    mainButtons.forEach((button, card) => cardObserver.observe(card));
    window.addEventListener('resize', fitConsentPrompt);
    window.addEventListener('viewcounter:consent', fitConsentPrompt);
    // The prompt also comes and goes without a change of answer: opened by the button, put away with the same
    // answer again or with Escape. Looked at once consent.js has handled the click or key.
    const refitSoon = () => setTimeout(fitConsentPrompt);
    document.addEventListener('click', refitSoon);
    document.addEventListener('keydown', (e) => {
        if (e.key == 'Escape')
            refitSoon();
    });
    consentAnchor.addEventListener('animationend', fitConsentPrompt);

    // In the Android app a link has to go through the app to reach the browser (see openExternal), and the prompt's
    // link to the privacy notice is drawn where the click handler below cannot see it, so it would open the notice
    // inside the game. There the prompt goes without it; the card's own Privacy link opens the notice instead.
    if (ISANDROID) {
        const consentScript = document.querySelector('script[src$="/consent.js"]');
        if (consentScript)
            consentScript.removeAttribute('data-privacy-url');
    }

    // Anywhere but the published site (a downloaded copy, a local server) consent.js does nothing, and the button
    // that would open its prompt goes. Deferred scripts have run by DOMContentLoaded.
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.viewcounterConsent)
            document.querySelectorAll('[data-viewcounter-consent]').forEach((button) => { button.hidden = true; });
    });

    // ---------- Events ----------

    // Pointer events cover mouse, touch and pen alike, and each finger pops its own balloon
    balloonLayer.addEventListener('pointerdown', (e) => {
        if (game.phase != 'playing')
            return;
        const balloon = e.target.closest('.balloon');
        const b = balloon && balloonByElement.get(balloon);
        if (b) {
            e.preventDefault();
            popBalloon(b);
        }
    });

    $('playButton').addEventListener('click', startGame);
    $('restartButton').addEventListener('click', startGame);
    $('pauseRestartButton').addEventListener('click', startGame);
    $('resumeButton').addEventListener('click', resumeGame);
    pauseButton.addEventListener('click', pauseGame);
    $('shareScoreButton').addEventListener('click', shareScore);
    $('postScoreButton').addEventListener('click', postScore);

    soundButton.addEventListener('click', () => {
        soundOn = !soundOn;
        store.set('bp.sound', soundOn ? 'on' : 'off');
        renderSoundButton();
    });

    // Escape closes the pause dialog, which resumes the game
    pauseDialog.addEventListener('close', resumeGame);

    // The start and game over screens are the only way forward, so they cannot be dismissed
    startDialog.addEventListener('cancel', (e) => e.preventDefault());
    overDialog.addEventListener('cancel', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => {
        if (game.phase == 'playing' && (e.key == 'Escape' || e.key == 'p' || e.key == 'P'))
            pauseGame();
    });

    // Leaving the tab pauses, so balloons never burst while nobody is watching
    document.addEventListener('visibilitychange', () => {
        if (document.hidden)
            pauseGame();
    });

    window.addEventListener('resize', measure);

    // The Android app opens links in the system browser instead of inside the WebView
    if (ISANDROID) {
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a[href]');
            if (anchor) {
                e.preventDefault();
                openExternal(anchor.href);
            }
        });
    }

    // ---------- Init ----------

    measure();
    renderBest();
    renderScore(false);
    renderLives();
    renderSoundButton();
    $('startBestValue').textContent = best;
    $('startBest').hidden = best == 0;
    showAmbient();
    showCard(startDialog);
})();
