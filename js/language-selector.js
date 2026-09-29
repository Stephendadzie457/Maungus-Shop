/* =========================================================
   MAUNGU'S - HEADER LANGUAGE SELECTOR
   ---------------------------------------------------------
   Wires up the universal (globe) language picker in the site
   header so visitors can choose the language they want.

   It works in two situations:

     1. Alongside the main i18n layer - when window.setLanguage()
        exists it is called with the chosen code, exactly like the
        old footer language buttons did.

     2. On its own - the choice is stored in localStorage, the
        <html lang> attribute is updated and a
        "maungu:languagechange" event is dispatched so any other
        script can react to the change.

   Markup it expects (see <header class="maungu-navbar"> in index.html):
     #maunguLang          <details> wrapper
       summary            the globe trigger
       [data-lang="..."]  one button per language
     #maunguLangCurrent   the visible current-language code

   Public API: window.maunguLanguage.get() / .set(code) / .stored()
   ========================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'maungu-language';
  var SUPPORTED = ['en', 'fr', 'es', 'de'];
  var DEFAULT_LANGUAGE = 'en';

  var picker = document.getElementById('maunguLang');

  if (!picker) {
    return;
  }

  var trigger = picker.querySelector('summary');
  var currentCode = document.getElementById('maunguLangCurrent');
  var buttons = Array.prototype.slice.call(picker.querySelectorAll('[data-lang]'));

  /* "en-US" / "FR" / "de_DE" all become "en" / "fr" / "de". */
  function normaliseLanguage(code) {
    if (!code) {
      return null;
    }

    var short = String(code).toLowerCase().split(/[-_]/)[0];
    return SUPPORTED.indexOf(short) === -1 ? null : short;
  }

  function readStoredLanguage() {
    try {
      return normaliseLanguage(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function storeLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      /* Storage blocked (private mode) - the picker still works. */
    }
  }

  function markActive(language) {
    buttons.forEach(function (button) {
      var isActive = normaliseLanguage(button.getAttribute('data-lang')) === language;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    if (currentCode) {
      currentCode.textContent = language.toUpperCase();
    }
  }

  function closePicker(returnFocus) {
    if (!picker.open) {
      return;
    }

    picker.open = false;

    if (returnFocus && trigger) {
      trigger.focus();
    }
  }

  function applyLanguage(code, options) {
    var language = normaliseLanguage(code);

    if (!language) {
      return null;
    }

    markActive(language);
    storeLanguage(language);
    document.documentElement.setAttribute('lang', language);

    var engine = typeof window.setLanguage === 'function';

    if (engine) {
      try {
        window.setLanguage(language);
      } catch (error) {
        /* The i18n layer rejected the code - the picker stays usable. */
      }
    }

    /* js/i18n.js announces the change itself, so only announce ours
       when the translation engine is not on the page. */
    if (!engine && (!options || options.silent !== true)) {
      var event;

      try {
        event = new CustomEvent('maungu:languagechange', {
          detail: { language: language }
        });
      } catch (error) {
        event = document.createEvent('CustomEvent');
        event.initCustomEvent('maungu:languagechange', true, true, {
          language: language
        });
      }

      document.dispatchEvent(event);
    }

    return language;
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      applyLanguage(button.getAttribute('data-lang'));
      closePicker(true);
    });
  });

  picker.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      closePicker(true);
    }
  });

  document.addEventListener('click', function (event) {
    if (picker.open && !picker.contains(event.target)) {
      closePicker(false);
    }
  });

  /* Keep the trigger label and the tick in sync when something else
     changes the language (for example js/i18n.js restoring a stored
     preference on page load). */
  document.addEventListener('maungu:languagechange', function (event) {
    var language = normaliseLanguage(event && event.detail && event.detail.language);

    if (language) {
      markActive(language);
    }
  });

  /* Restore the visitor's previous choice on every page load. */
  var stored = readStoredLanguage();

  if (stored) {
    applyLanguage(stored);
  } else {
    markActive(normaliseLanguage(document.documentElement.lang) || DEFAULT_LANGUAGE);
  }

  /* Small public API so other scripts can reuse the picker. */
  window.maunguLanguage = {
    get: function () {
      return normaliseLanguage(document.documentElement.lang);
    },
    set: function (code) {
      return applyLanguage(code);
    },
    stored: readStoredLanguage,
    supported: SUPPORTED.slice()
  };
})();
