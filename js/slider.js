/* =========================================================
   MAUNGU'S - IMAGE SLIDER
   /js/slider.js
   ---------------------------------------------------------
   Builds the strip of photographs in the Maungu Moments
   section (02): the images travel from right to left on their
   own, so a new moment keeps sliding in from the right.

   Public API
     window.initSlider(mountId, items, options)

       mountId  id of the (empty) element that holds the slider
       items    [{ image, alt, number, title, text, link }]
       options  { speed, label }
                  speed - travel speed in px per second (34)

   Behaviour
     * the strip moves continuously to the left; the set is
       repeated after itself, so the loop has no visible seam,
     * hovering, focusing or switching tabs pauses the motion,
       so nothing moves while a visitor reads or clicks,
     * the arrows ease the strip exactly one card forward or
       back, dragging (mouse, pen, finger) moves it directly,
     * Left / Right arrow keys work while the slider has focus,
     * visitors who ask for reduced motion get a still strip
       they can scroll and step through with the arrows.

   Card copy is written in English: js/i18n.js translates
   everything it finds, including content rendered later.
   ========================================================= */

(function () {
  'use strict';

  var DEFAULT_SPEED = 34;     /* px per second */
  var EASE_MS = 420;          /* how long one arrow nudge takes */
  var DRAG_SLOP = 6;          /* px of travel that counts as a drag */
  var MIN_CARD_WIDTH = 240;   /* used until the cards are measured */
  var MAX_SETS = 6;           /* ceiling for the repeated set count */

  var motionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function reducedMotion() {
    return !!(motionQuery && motionQuery.matches);
  }

  /* ---------------------------------------------------------
     One moment card - the same mark-up the section always used
     --------------------------------------------------------- */

  function buildCard(item, isRepeat) {
    var card = document.createElement('a');
    var image = document.createElement('img');
    var copy = document.createElement('div');
    var number = document.createElement('span');
    var title = document.createElement('h3');
    var text = document.createElement('p');

    card.className = 'moment-card';
    card.href = item.link || '#shop';

    if (isRepeat) {
      card.setAttribute('aria-hidden', 'true');
      card.setAttribute('tabindex', '-1');
    }

    image.src = item.image;
    image.alt = item.alt || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', function () {
      image.style.display = 'none';
    });

    number.textContent = item.number || '';
    title.textContent = item.title || '';
    text.textContent = item.text || '';

    copy.appendChild(number);
    copy.appendChild(title);
    copy.appendChild(text);

    card.appendChild(image);
    card.appendChild(copy);

    return card;
  }

  function buildArrow(kind, label) {
    var button = document.createElement('button');

    button.type = 'button';
    button.className = 'slider-arrow slider-' + kind;
    button.setAttribute('aria-label', label);
    button.innerHTML = kind === 'prev' ? '&larr;' : '&rarr;';

    return button;
  }

  /* ---------------------------------------------------------
     The slider itself
     --------------------------------------------------------- */

  function initSlider(mountId, items, options) {
    var mount = typeof mountId === 'string' ? document.getElementById(mountId) : mountId;

    if (!mount || !items || !items.length) {
      return null;
    }

    if (mount.getAttribute('data-slider-ready') === 'true') {
      return null;
    }

    var settings = options || {};
    var speed = typeof settings.speed === 'number' ? settings.speed : DEFAULT_SPEED;

    mount.setAttribute('data-slider-ready', 'true');
    mount.setAttribute('role', 'region');
    mount.setAttribute('aria-roledescription', 'carousel');
    mount.setAttribute('aria-label', settings.label || 'Maungu moments slider');

    var viewport = document.createElement('div');
    var track = document.createElement('div');
    var cards = [];

    viewport.className = 'slider-viewport';
    track.className = 'slider-track';

    function addSet(isRepeat) {
      items.forEach(function (item) {
        var card = buildCard(item, isRepeat);

        track.appendChild(card);
        cards.push(card);
      });
    }

    addSet(false);
    viewport.appendChild(track);

    var prev = buildArrow('prev', 'Previous slide');
    var next = buildArrow('next', 'Next slide');

    mount.appendChild(prev);
    mount.appendChild(viewport);
    mount.appendChild(next);

    var setWidth = 0;        /* one full set: every card plus its gap */
    var cardStep = 0;        /* one card plus its gap */
    var offset = 0;          /* unbounded travel, only the paint wraps it */
    var offsetTarget = null; /* set while an arrow eases the strip */
    var drag = null;
    var dragged = false;
    var pointerOver = false;
    var focusInside = false;
    var frame = null;
    var lastTick = 0;

    function canTravel() {
      return !reducedMotion() && !pointerOver && !focusInside && !drag && !document.hidden;
    }

    function paint() {
      if (setWidth <= 0) {
        return;
      }

      var display = ((offset % setWidth) + setWidth) % setWidth;

      track.style.transform = 'translate3d(' + (-display).toFixed(2) + 'px, 0, 0)';
    }

    function tick(now) {
      frame = window.requestAnimationFrame(tick);

      var delta = lastTick ? now - lastTick : 0;

      lastTick = now;

      if (delta > 200) {
        delta = 200;                                  /* the tab was asleep */
      }

      if (offsetTarget !== null) {
        var remaining = offsetTarget - offset;
        var ease = Math.min(1, (delta / EASE_MS) * 2.4);

        offset += remaining * ease;

        if (Math.abs(offsetTarget - offset) < 0.6) {
          offset = offsetTarget;
          offsetTarget = null;
        }
      } else if (canTravel()) {
        offset += (speed * delta) / 1000;
      }

      paint();
    }

    function start() {
      if (frame !== null || reducedMotion()) {
        return;
      }

      lastTick = 0;
      frame = window.requestAnimationFrame(tick);
    }

    function stop() {
      if (frame === null) {
        return;
      }

      window.cancelAnimationFrame(frame);
      frame = null;
    }

    /* One set wide, one card step, and enough repeated sets to
       cover the visible strip at every point of the loop. */

    function grow() {
      if (reducedMotion() || setWidth <= 0) {
        return;                                     /* a still strip needs one set */
      }

      var wanted = Math.ceil(viewport.clientWidth / setWidth) + 1;
      var copies = cards.length / items.length;

      if (wanted < 2) {
        wanted = 2;
      }

      while (copies < wanted && copies < MAX_SETS) {
        addSet(true);
        copies += 1;
      }
    }

    function measure() {
      var first = cards[0];
      var second = cards[1];

      if (!first || !second) {
        return;
      }

      var step = second.offsetLeft - first.offsetLeft;

      cardStep = step > 0 ? step : (first.offsetWidth || MIN_CARD_WIDTH) + 16;
      setWidth = cardStep * items.length;

      grow();

      offsetTarget = null;
      paint();
    }

    /* Move one card forward or back. A visitor who asked for
       reduced motion steps through a still, scrollable strip. */

    function step(direction) {
      if (reducedMotion()) {
        if (typeof viewport.scrollBy === 'function') {
          viewport.scrollBy({ left: direction * cardStep, behavior: 'auto' });
        } else {
          viewport.scrollLeft += direction * cardStep;
        }

        return;
      }

      var from = offsetTarget === null ? offset : offsetTarget;

      offsetTarget = from + direction * cardStep;
      start();
    }

    prev.addEventListener('click', function () {
      step(-1);
    });

    next.addEventListener('click', function () {
      step(1);
    });

    mount.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      }
    });

    mount.addEventListener('mouseenter', function () {
      pointerOver = true;
    });

    mount.addEventListener('mouseleave', function () {
      pointerOver = false;
    });

    mount.addEventListener('focusin', function () {
      focusInside = true;
    });

    mount.addEventListener('focusout', function (event) {
      if (!mount.contains(event.relatedTarget)) {
        focusInside = false;
      }
    });

    document.addEventListener('visibilitychange', function () {
      lastTick = 0;                    /* the clock restarts with the tab */
    });

    /* Dragging: mouse, pen and finger all arrive as pointer events */

    viewport.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      drag = { id: event.pointerId, x: event.clientX, offset: offset };
      dragged = false;
      offsetTarget = null;

      if (viewport.setPointerCapture) {
        try {
          viewport.setPointerCapture(event.pointerId);
        } catch (error) {
          /* pointer capture is a nicety - the drag works without it */
        }
      }
    });

    viewport.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.id) {
        return;
      }

      var travelled = event.clientX - drag.x;

      if (Math.abs(travelled) > DRAG_SLOP) {
        dragged = true;
      }

      if (!dragged) {
        return;
      }

      offset = drag.offset - travelled;
      paint();
    });

    function endDrag(event) {
      if (!drag || (event && event.pointerId !== drag.id)) {
        return;
      }

      drag = null;
      lastTick = 0;
    }

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    /* a drag must never open the card the finger travelled over */
    viewport.addEventListener('click', function (event) {
      if (!dragged) {
        return;
      }

      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    /* Re-measure when the layout changes, and follow the visitor's
       motion preference if they change it while reading. */

    var resizeTimer = null;

    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 150);
    });

    function onMotionPreferenceChange() {
      measure();

      if (reducedMotion()) {
        offset = 0;
        stop();
      } else {
        start();
      }

      paint();
    }

    if (motionQuery) {
      if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', onMotionPreferenceChange);
      } else if (typeof motionQuery.addListener === 'function') {
        motionQuery.addListener(onMotionPreferenceChange);
      }
    }

    window.requestAnimationFrame(measure);
    start();

    return {
      element: mount,
      step: step,
      pause: function () {
        pointerOver = true;
      },
      resume: function () {
        pointerOver = false;
      },
      refresh: measure
    };
  }

  /* ---------------------------------------------------------
     The Maungu Moments strip (02) on the landing page.
     Copy reuses the wording already in js/i18n-dictionary.js,
     so every language is translated without new entries.
     --------------------------------------------------------- */

  var MOMENT_SLIDES = [
    {
      image: 'images/hero/hero-1.jpg',
      alt: 'Everyday fashion',
      number: '01',
      title: 'Everyday',
      text: 'Easy pieces for the life you actually live.',
      link: '#shop'
    },
    {
      image: 'images/hero/hero-3.jpg',
      alt: 'Special occasion fashion',
      number: '02',
      title: 'Make an entrance',
      text: 'For nights worth remembering.',
      link: '#shop'
    },
    {
      image: 'images/hero/hero-2.jpg',
      alt: 'Accessories and finishing touches',
      number: '03',
      title: 'Finishing touches',
      text: 'Bags, belts and the details that make it yours.',
      link: '#shop'
    }
  ];

  function startMomentsSlider() {
    initSlider('heroSlider', MOMENT_SLIDES, { speed: 30, label: 'Maungu moments slider' });
  }

  window.initSlider = initSlider;
  window.MAUNGU_MOMENT_SLIDES = MOMENT_SLIDES;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMomentsSlider);
  } else {
    startMomentsSlider();
  }


})();
