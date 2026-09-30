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
  // 951px is where the unwrapped row of entries first fits; the stylesheet's
  // narrow query is the adjacent `max-width: 950px`. The two are one boundary
  // written twice, so neither moves without the other.
  var wide = window.matchMedia('(min-width: 951px)');

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

  // Crossing the breakpoint puts every group back. The collapsed state belongs
  // to the wide layout - the narrow one opens every list and turns the button
  // into a label - so a group left open above the breakpoint would otherwise
  // carry aria-expanded="true" on a control that no longer toggles anything,
  // and announce a state the page cannot change. addListener is the older
  // spelling of the same event, kept for browsers that have only that one.
  function closeSubsOnNarrow() {
    if (!wide.matches) closeSubs(null);
  }
  if (wide.addEventListener) wide.addEventListener('change', closeSubsOnNarrow);
  else if (wide.addListener) wide.addListener(closeSubsOnNarrow);

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
