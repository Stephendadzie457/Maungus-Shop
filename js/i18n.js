/* =========================================================
   MAUNGU'S - PAGE TRANSLATION ENGINE
   ---------------------------------------------------------
   Translates every piece of text on the page - plus alt text,
   placeholders, title/aria-labels and the browser tab title -
   into the language the visitor picks in the header globe menu.

   How it works
     * js/i18n-dictionary.js holds MAUNGU_TRANSLATIONS, keyed by
       the ENGLISH text exactly as it appears in the markup.
     * The English text is remembered the first time the page is
       scanned, so switching languages - including back to
       English - always rebuilds from that original text.
     * The choice is stored under the same localStorage key used
       by js/language-selector.js ("maungu-language"), so both
       scripts stay in sync.

   Public API
     window.setLanguage('fr')       switch the whole page
     window.t('English text')       translate one string
     window.MaunguI18n.get()        current language code
     window.MaunguI18n.languages()  codes with a dictionary
     window.MaunguI18n.refresh()    re-scan after AJAX rendering
   ========================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'maungu-language';
  var DEFAULT_LANGUAGE = 'en';
  var SKIP_TAGS = {
    SCRIPT: 1,
    STYLE: 1,
    NOSCRIPT: 1,
    TEXTAREA: 1,
    CODE: 1,
    PRE: 1
  };
  var ATTR_NAMES = ['placeholder', 'aria-label', 'title', 'alt'];
  var ATTR_SELECTOR = '[' + ATTR_NAMES.join('],[') + ']';

  var textOriginals = new WeakMap();
  var attrOriginals = new WeakMap();
  var titleOriginal = null;
  var indexCache = {};
  var current = DEFAULT_LANGUAGE;
  var observer = null;

  /* ---------------------------------------------------------
     Dictionary helpers
     --------------------------------------------------------- */

  function translations() {
    var dictionary = window.MAUNGU_TRANSLATIONS;

    return dictionary && typeof dictionary === 'object' ? dictionary : null;
  }

  function languages() {
    var dictionary = translations();

    if (!dictionary) {
      return [];
    }

    return Object.keys(dictionary).filter(function (code) {
      return dictionary[code] && typeof dictionary[code] === 'object';
    });
  }

  /* Page text and dictionary keys are compared in a forgiving way:
     curly quotes, en/em dashes and non-breaking spaces all match
     their plain equivalents. */
  function normalise(value) {
    return String(value == null ? '' : value)
      .replace(/[\u2018\u2019\u02bc\u2032]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u00a0\u2007\u202f]/g, ' ')
      .replace(/[\u00b7\u2022\u2027]/g, '\u00b7')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function indexFor(code) {
    if (indexCache[code]) {
      return indexCache[code];
    }

    var dictionary = translations();
    var map = (dictionary && dictionary[code]) || {};
    var index = {};

    Object.keys(map).forEach(function (key) {
      var value = map[key];

      if (typeof value === 'string' && value) {
        index[normalise(key)] = value;
      }
    });

    indexCache[code] = index;
    return index;
  }

  function lookup(code, text) {
    if (!translations() || !code || code === DEFAULT_LANGUAGE) {
      return null;
    }

    var key = normalise(text);

    if (!key) {
      return null;
    }

    var value = indexFor(code)[key];

    return typeof value === 'string' ? value : null;
  }

  /* ---------------------------------------------------------
     Walking the DOM
     --------------------------------------------------------- */

  function skippable(node) {
    var parent = node.parentNode;

    if (!parent || SKIP_TAGS[parent.nodeName]) {
      return true;
    }

    if (typeof parent.closest === 'function') {
      if (parent.closest('[data-no-translate]') || parent.closest('.maungu-lang-menu')) {
        return true;
      }
    }

    return false;
  }

  function eachTextNode(root, callback) {
    if (!root || root.nodeType !== 1) {
      return;
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var node = walker.nextNode();

    while (node) {
      if (!skippable(node)) {
        callback(node);
      }

      node = walker.nextNode();
    }
  }

  function eachAttribute(root, callback) {
    var elements = [];

    if (root.nodeType === 1) {
      elements.push(root);
    }

    if (typeof root.querySelectorAll === 'function') {
      elements = elements.concat(
        Array.prototype.slice.call(root.querySelectorAll(ATTR_SELECTOR))
      );
    }

    elements.forEach(function (element) {
      ATTR_NAMES.forEach(function (name) {
        if (element.hasAttribute(name)) {
          callback(element, name);
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Remember / restore / apply
     --------------------------------------------------------- */

  function remember(root) {
    eachTextNode(root, function (node) {
      if (!textOriginals.has(node)) {
        textOriginals.set(node, node.nodeValue);
      }
    });

    eachAttribute(root, function (element, name) {
      var store = attrOriginals.get(element);

      if (!store) {
        store = {};
        attrOriginals.set(element, store);
      }

      if (!Object.prototype.hasOwnProperty.call(store, name)) {
        store[name] = element.getAttribute(name);
      }
    });
  }

  function restore(root) {
    eachTextNode(root, function (node) {
      var original = textOriginals.get(node);

      if (typeof original === 'string' && node.nodeValue !== original) {
        node.nodeValue = original;
      }
    });

    eachAttribute(root, function (element, name) {
      var store = attrOriginals.get(element);

      if (!store || typeof store[name] !== 'string') {
        return;
      }

      if (element.getAttribute(name) !== store[name]) {
        element.setAttribute(name, store[name]);
      }
    });
  }

  function apply(root, code) {
    eachTextNode(root, function (node) {
      var original = textOriginals.get(node);

      if (typeof original !== 'string') {
        return;
      }

      var translated = lookup(code, original);

      if (translated === null) {
        return;
      }

      /* keep the original leading / trailing spacing intact */
      var lead = (original.match(/^\s*/) || [''])[0];
      var trail = (original.match(/\s*$/) || [''])[0];
      var next = lead + translated + trail;

      if (node.nodeValue !== next) {
        node.nodeValue = next;
      }
    });

    eachAttribute(root, function (element, name) {
      var store = attrOriginals.get(element);

      if (!store || typeof store[name] !== 'string') {
        return;
      }

      var translated = lookup(code, store[name]);

      if (translated === null) {
        return;
      }

      if (element.getAttribute(name) !== translated) {
        element.setAttribute(name, translated);
      }
    });
  }

  function translateTitle(code) {
    if (titleOriginal === null) {
      titleOriginal = document.title;
    }

    var translated = lookup(code, titleOriginal);

    document.title = translated === null ? titleOriginal : translated;
  }

  /* One full pass: remember the English text, step back to it,
     then paint the requested language on top. */
  function translate(root, code) {
    var scope = root && root.nodeType === 1 ? root : document.body;

    if (!scope) {
      return;
    }

    remember(scope);
    restore(scope);

    if (code && code !== DEFAULT_LANGUAGE) {
      apply(scope, code);
    }

    if (!root) {
      translateTitle(code || DEFAULT_LANGUAGE);
    }
  }

  /* ---------------------------------------------------------
     Language switching
     --------------------------------------------------------- */

  function readCode(value) {
    if (!value) {
      return null;
    }

    var code = normalise(value).toLowerCase().split(/[-_]/)[0];

    return languages().indexOf(code) === -1 ? null : code;
  }

  function storedLanguage() {
    try {
      return readCode(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function storeLanguage(code) {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch (error) {
      /* storage blocked (private mode) - translation still works */
    }
  }

  function announce(code) {
    var event;

    try {
      event = new CustomEvent('maungu:languagechange', { detail: { language: code } });
    } catch (error) {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('maungu:languagechange', true, true, { language: code });
    }

    document.dispatchEvent(event);
  }

  function setLanguage(code) {
    var language = readCode(code) || DEFAULT_LANGUAGE;

    current = language;

    storeLanguage(language);
    document.documentElement.setAttribute('lang', language);
    translate(null, language);
    announce(language);

    return language;
  }

  /* ---------------------------------------------------------
     Content rendered later by other scripts (product grids,
     category buttons...) is picked up here.
     --------------------------------------------------------- */

  function watch() {
    if (observer || typeof MutationObserver !== 'function' || !document.body) {
      return;
    }

    observer = new MutationObserver(function (records) {
      if (current === DEFAULT_LANGUAGE) {
        return;
      }

      records.forEach(function (record) {
        Array.prototype.forEach.call(record.addedNodes, function (node) {
          if (node.nodeType === 1) {
            translate(node, current);
          } else if (node.nodeType === 3 && node.parentNode) {
            translate(node.parentNode, current);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    var pageLanguage = readCode(document.documentElement.lang);
    var earlier = window.MaunguI18n && window.MaunguI18n.get ? window.MaunguI18n.get() : null;
    var language = storedLanguage() || earlier || pageLanguage || DEFAULT_LANGUAGE;

    translate(document.body, language);

    if (language !== DEFAULT_LANGUAGE) {
      setLanguage(language);
    }

    watch();
  }

  window.setLanguage = setLanguage;

  /* Translate a single string - handy for text built in JS. */
  window.t = function (text) {
    var translated = lookup(current, text);

    return translated === null ? text : translated;
  };

  window.MaunguI18n = {
    get: function () {
      return current;
    },
    languages: languages,
    set: setLanguage,
    refresh: function () {
      translate(null, current);
    },
    normalise: normalise
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
