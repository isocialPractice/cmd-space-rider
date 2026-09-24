/* CMD Space Rider documentation site.
   The only scripts here are the ones the menu actually needs: the narrow-screen
   toggle, the dropdowns, and marking the current page. A documentation site
   that needs a framework to show text does not need a framework. */
(function () {
  'use strict';

  var nav = document.querySelector('.nav');
  if (!nav) return;

  var toggle = nav.querySelector('.nav-toggle');
  var subButtons = Array.prototype.slice.call(nav.querySelectorAll('.has-sub > button'));

  // The dropdowns collapse only on the wide layout. Below the breakpoint the
  // stylesheet opens every group and turns the button into a label, so the
  // script leaves them alone rather than toggling something already shown.
  var wide = window.matchMedia('(min-width: 861px)');

  function closeSubs(except) {
    subButtons.forEach(function (button) {
      if (button !== except) button.setAttribute('aria-expanded', 'false');
    });
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }

  subButtons.forEach(function (button) {
    button.addEventListener('click', function (event) {
      if (!wide.matches) return;
      event.stopPropagation();
      var open = button.getAttribute('aria-expanded') === 'true';
      closeSubs(button);
      button.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  // A click anywhere else, or Escape, puts the menu back.
  document.addEventListener('click', function (event) {
    if (!nav.contains(event.target)) {
      closeSubs(null);
      nav.setAttribute('data-open', 'false');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    closeSubs(null);
    nav.setAttribute('data-open', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });

  // Following a link inside the menu closes it, which matters on a phone where
  // an in-page anchor would otherwise scroll behind an open menu.
  nav.addEventListener('click', function (event) {
    if (event.target.closest && event.target.closest('a')) {
      closeSubs(null);
      nav.setAttribute('data-open', 'false');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Mark the current page. Compared on the file name so the pages work both on
  // the deployed site and opened straight off the filesystem.
  var here = window.location.pathname.split('/').pop() || 'index.html';
  Array.prototype.forEach.call(nav.querySelectorAll('.menu a'), function (link) {
    var target = link.getAttribute('href');
    if (!target || target.charAt(0) === '#') return;
    if (target.split('#')[0] === here) link.setAttribute('aria-current', 'page');
  });
})();
