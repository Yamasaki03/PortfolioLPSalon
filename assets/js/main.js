/* =========================================================
   LAYERED LP — interactions & animations (vanilla JS)
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced = () => reducedMotion.matches;

  const DEFAULT_CTA_LABEL = '空き状況を見て予約する';

  /* ---------- 予約ボタン:光が一度横切る ---------- */
  const shine = (el) => {
    if (isReduced()) return;
    el.classList.remove('is-shining');
    void el.offsetWidth; // アニメーションを最初から再生させる
    el.classList.add('is-shining');
  };

  const initCta = () => {
    $$('.cta').forEach((cta) => {
      cta.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse') {
          cta.style.setProperty('--shine-delay', '0s');
          shine(cta);
        }
      });
      cta.addEventListener('animationend', () => cta.classList.remove('is-shining'));
    });

    // 画面に入ったとき、一度だけ光らせる
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        shine(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.8 });
    $$('.cta').forEach((cta) => {
      if (!cta.closest('.sticky-cta') && !cta.closest('.modal') && !cta.closest('.gnav')) io.observe(cta);
    });
  };

  /* ---------- スクロールで現れる ---------- */
  const initReveal = () => {
    const targets = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    // clip-pathで全体が切り抜かれた要素は「見えていない」と判定されるため、
    // アーチ写真は親要素を監視して切り替える
    const watchMap = new Map();
    targets.forEach((el) => {
      const watched = el.dataset.reveal === 'arch' ? el.parentElement : el;
      if (!watchMap.has(watched)) watchMap.set(watched, []);
      watchMap.get(watched).push(el);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        watchMap.get(entry.target).forEach((el) => el.classList.add('is-in'));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    watchMap.forEach((_, watched) => io.observe(watched));
  };

  /* ---------- スマホ用メニュー ---------- */
  const initDrawer = () => {
    const btn = $('#menuBtn');
    const drawer = $('#drawer');
    if (!btn || !drawer) return;

    const open = () => {
      drawer.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'メニューを閉じる');
      document.documentElement.classList.add('is-locked');
    };
    const close = () => {
      drawer.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'メニューを開く');
      document.documentElement.classList.remove('is-locked');
      const hide = () => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; };
      if (isReduced()) hide();
      else drawer.addEventListener('transitionend', hide, { once: true });
    };

    btn.addEventListener('click', () => {
      btn.getAttribute('aria-expanded') === 'true' ? close() : open();
    });
    $$('a', drawer).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        close();
        btn.focus();
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
      if (e.matches && btn.getAttribute('aria-expanded') === 'true') close();
    });
  };

  /* ---------- 文言を切り替える(ふわっと) ---------- */
  const swapText = (el, text) => {
    if (!el || el.textContent === text) return;
    if (isReduced()) {
      el.textContent = text;
      return;
    }
    el.classList.add('is-changing');
    setTimeout(() => {
      el.textContent = text;
      el.classList.remove('is-changing');
    }, 160);
  };

  /* ---------- カラーシミュレーター ---------- */
  const sim = {
    colorName: 'ラベンダーグレー',
    get ctaLabel() { return `${this.colorName}で予約する`; },
  };

  const initSimulator = () => {
    const svg = $('#hairSvg');
    const chips = $$('#colorChips .chip');
    const pills = $$('#posPills .pill');
    if (!svg) return;

    const state = { color: '#B7A9C9', colorName: 'ラベンダーグレー', pos: 'earring', posName: 'イヤリング', posNote: '耳にかけるとのぞく' };

    const render = () => {
      svg.style.setProperty('--sim-color', state.color);
      svg.dataset.pos = state.pos;
      svg.setAttribute('aria-label', `${state.colorName}の${state.posName}カラーのイメージ`);

      $('#simColorName').textContent = state.colorName;
      $('#simPosName').textContent = state.posName;
      $('#simPosNote').textContent = state.posNote;
      $('#simResultColor').textContent = state.colorName;
      $('#simResultPos').textContent = state.posName;

      sim.colorName = state.colorName;
      swapText($('#simCtaLabel'), sim.ctaLabel);
      if (stickyCta.mode === 'simulator') swapText($('#stickyCtaLabel'), sim.ctaLabel);
    };

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        chip.classList.remove('is-pop');
        void chip.offsetWidth;
        chip.classList.add('is-pop');
        state.color = chip.dataset.hex;
        state.colorName = chip.dataset.name;
        render();
      });
      chip.addEventListener('animationend', () => chip.classList.remove('is-pop'));
    });

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => p.setAttribute('aria-pressed', String(p === pill)));
        state.pos = pill.dataset.pos;
        state.posName = pill.dataset.name;
        state.posNote = pill.dataset.note;
        render();
      });
    });

    // 画面に入ったとき、選択中の範囲を「広がる」動きで見せる
    if (!isReduced()) {
      const current = svg.dataset.pos;
      svg.dataset.pos = '';
      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        setTimeout(() => { if (!svg.dataset.pos) svg.dataset.pos = current; }, 400);
        io.disconnect();
      }, { threshold: 0.5 });
      io.observe(svg);
    }
  };

  /* ---------- ビフォーアフター ---------- */
  const BA_CASES = {
    1: {
      before: 'lp_ba1_before', after: 'lp_ba1_after',
      beforeAlt: 'Before:髪をおろした後ろ姿。インナーカラーは隠れて見えない',
      afterAlt: 'After:髪を結んで、内側のラベンダーグレーのインナーカラーがのぞく後ろ姿',
      caption: 'ラベンダーグレーのインナーカラー。おろすと隠れて、結ぶとのぞきます。',
    },
    2: {
      before: 'lp_ba2_before', after: 'lp_ba2_after',
      beforeAlt: 'Before:髪をおろした斜め後ろ姿。イヤリングカラーは隠れて見えない',
      afterAlt: 'After:髪を耳にかけて、耳うしろのピンクブラウンのイヤリングカラーがのぞく',
      caption: 'ピンクブラウンのイヤリングカラー。耳にかけたときだけ、ちらりとのぞきます。',
    },
    3: {
      before: 'lp_ba3_before', after: 'lp_ba3_after',
      beforeAlt: 'Before:ダークブラウンのロングヘア',
      afterAlt: 'After:顔の両側の毛束にホワイトベージュの顔まわりカラー',
      caption: 'ホワイトベージュの顔まわりカラー。顔のまわりがぱっと明るく見えます。',
    },
  };

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const initBeforeAfter = () => {
    const frame = $('#baFrame');
    const range = $('#baRange');
    if (!frame || !range) return;

    let nudgeId = 0;
    const setPos = (value) => {
      const v = Math.min(100, Math.max(0, value));
      frame.style.setProperty('--pos', `${v}%`);
      range.value = String(Math.round(v));
    };
    const stopNudge = () => cancelAnimationFrame(nudgeId);

    // 最初に一度だけ境目が左右に動いて「動かせる」と気づかせる
    const nudge = () => {
      if (isReduced()) return;
      const keys = [[0, 50], [0.3, 36], [0.65, 64], [1, 50]];
      const duration = 1600;
      let start = 0;
      const step = (now) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / duration);
        let i = 0;
        while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
        const [t0, v0] = keys[i];
        const [t1, v1] = keys[i + 1];
        const local = easeInOutCubic((t - t0) / (t1 - t0));
        setPos(v0 + (v1 - v0) * local);
        if (t < 1) nudgeId = requestAnimationFrame(step);
      };
      nudgeId = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      setTimeout(nudge, 500);
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(frame);

    // ドラッグ
    let dragging = false;
    const posFromEvent = (e) => {
      const rect = frame.getBoundingClientRect();
      return ((e.clientX - rect.left) / rect.width) * 100;
    };
    frame.addEventListener('pointerdown', (e) => {
      stopNudge();
      dragging = true;
      frame.setPointerCapture(e.pointerId);
      frame.classList.add('is-dragging');
      setPos(posFromEvent(e));
    });
    frame.addEventListener('pointermove', (e) => {
      if (dragging) setPos(posFromEvent(e));
    });
    const end = () => {
      dragging = false;
      frame.classList.remove('is-dragging');
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);

    range.addEventListener('input', () => {
      stopNudge();
      setPos(Number(range.value));
    });

    // 事例の切り替え
    const caseBtns = $$('.case-btn');
    const before = $('#baBefore');
    const after = $('#baAfter');
    caseBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        caseBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        const data = BA_CASES[btn.dataset.case];
        stopNudge();

        const apply = () => {
          before.src = `assets/images/${data.before}.jpg`;
          before.alt = data.beforeAlt;
          after.src = `assets/images/${data.after}.jpg`;
          after.alt = data.afterAlt;
          swapText($('#baCaption'), data.caption);
          setPos(50);
          const show = () => frame.classList.remove('is-switching');
          Promise.all([before, after].map((img) => (img.decode ? img.decode().catch(() => {}) : null))).then(show);
        };

        if (isReduced()) {
          apply();
          return;
        }
        frame.classList.add('is-switching');
        setTimeout(apply, 300);
      });
    });
  };

  /* ---------- スタイルギャラリー ---------- */
  const initGallery = () => {
    const track = $('#galleryTrack');
    if (!track) return;
    const prev = $('#galleryPrev');
    const next = $('#galleryNext');
    const bar = $('#galleryBar');
    const cards = $$('.style-card', track);

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = max > 0 ? track.scrollLeft / max : 0;
      const visible = track.clientWidth / track.scrollWidth;
      bar.style.transform = `scaleX(${visible + (1 - visible) * ratio})`;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
    };
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    const step = () => cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16);
    const behavior = () => (isReduced() ? 'auto' : 'smooth');
    prev.addEventListener('click', () => track.scrollBy({ left: -step() * 2, behavior: behavior() }));
    next.addEventListener('click', () => track.scrollBy({ left: step() * 2, behavior: behavior() }));

    // マウスでつかんで流す(タッチはブラウザ標準のスクロール)
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    track.addEventListener('pointerdown', (e) => {
      moved = false;
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true;
      startX = e.clientX;
      startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        track.classList.add('is-dragging');
      }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (!moved) return;
      // スナップ位置へなめらかに戻す
      const left = track.scrollLeft;
      track.classList.remove('is-dragging');
      track.scrollLeft = left;
      const s = step();
      track.scrollTo({ left: Math.round(left / s) * s, behavior: behavior() });
    });
    // ドラッグ直後のクリックで拡大表示が開かないようにする
    track.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);

    cards.forEach((card) => card.addEventListener('click', () => openModal(card)));
  };

  /* ---------- スタイル拡大表示 ---------- */
  let lastFocus = null;
  const modal = $('#styleModal');

  const openModal = (card) => {
    if (!modal || typeof modal.showModal !== 'function') return;
    const d = card.dataset;
    const img = $('#modalImg');
    img.src = `assets/images/${d.img}.jpg`;
    img.alt = $('img', card).alt;
    $('#modalTitle').textContent = d.name;
    $('#modalDesc').textContent = d.desc;
    $('#modalMenu').textContent = d.menu;
    $('#modalPrice').textContent = d.price;
    lastFocus = card;
    modal.classList.remove('is-closing');
    modal.showModal();
    modal.scrollTop = 0;
    document.documentElement.classList.add('is-locked');
  };

  const closeModal = () => {
    if (!modal.open) return;
    const finish = () => {
      modal.classList.remove('is-closing');
      modal.close();
    };
    if (isReduced()) finish();
    else {
      modal.classList.add('is-closing');
      modal.addEventListener('animationend', finish, { once: true });
    }
  };

  const initModal = () => {
    if (!modal) return;
    $('#modalClose').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(); // 背景をクリック
    });
    modal.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal();
    });
    modal.addEventListener('close', () => {
      document.documentElement.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    });
  };

  /* ---------- スマホ下部の予約ボタン ---------- */
  const stickyCta = { mode: 'default' };

  const initStickyCta = () => {
    const bar = $('#stickyCta');
    const hero = $('#top');
    const label = $('#stickyCtaLabel');
    if (!bar || !hero) return;
    const link = $('.cta', bar);

    const seen = { heroPassed: false, endVisible: new Set(), simVisible: false };

    const update = () => {
      const show = seen.heroPassed && seen.endVisible.size === 0;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', String(!show));
      link.tabIndex = show ? 0 : -1;

      const mode = seen.simVisible ? 'simulator' : 'default';
      if (mode !== stickyCta.mode) {
        stickyCta.mode = mode;
        swapText(label, mode === 'simulator' ? sim.ctaLabel : DEFAULT_CTA_LABEL);
      }
    };

    // ファーストビューを過ぎたら出す
    new IntersectionObserver(([entry]) => {
      seen.heroPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    }).observe(hero);

    // 最終CTA・フッターが見えている間は隠す
    const endIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) seen.endVisible.add(entry.target);
        else seen.endVisible.delete(entry.target);
      });
      update();
    });
    ['#reserve', '#footer'].forEach((sel) => { const el = $(sel); if (el) endIo.observe(el); });

    // シミュレーターを見ている間は「◯◯で予約する」に切り替える
    const simSection = $('#simulator');
    if (simSection) {
      new IntersectionObserver(([entry]) => {
        seen.simVisible = entry.isIntersecting;
        update();
      }, { rootMargin: '-35% 0px -35% 0px' }).observe(simSection);
    }
  };

  /* ---------- よくある質問:開閉をなめらかに ---------- */
  const initFaq = () => {
    $$('.faq__item').forEach((details) => {
      const summary = $('summary', details);
      const body = $('.faq__a', details);
      let anim = null;

      summary.addEventListener('click', (e) => {
        if (isReduced() || !body.animate) return;
        e.preventDefault();
        if (anim) anim.cancel();

        if (!details.open) {
          details.open = true;
          const h = body.offsetHeight;
          anim = body.animate(
            [{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }],
            { duration: 450, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
          );
          anim.onfinish = () => { anim = null; };
        } else {
          const h = body.offsetHeight;
          anim = body.animate(
            [{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
            { duration: 300, easing: 'ease' }
          );
          anim.onfinish = () => {
            details.open = false;
            anim = null;
          };
        }
      });
    });
  };

  /* ---------- 起動 ---------- */
  const init = () => {
    initReveal();
    initCta();
    initDrawer();
    initSimulator();
    initBeforeAfter();
    initGallery();
    initModal();
    initStickyCta();
    initFaq();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
