const ACRONYMS = {
  api: 'API',
  css: 'CSS',
  html: 'HTML',
  js: 'JS',
  json: 'JSON',
  md: 'MD',
  scss: 'SCSS',
  svg: 'SVG',
  ts: 'TS',
  xml: 'XML'
};

let manifest = [];

fetch('articles/manifest.json')
  .then(response => response.json())
  .then(entries => {
    manifest = entries;
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      sessionStorage.removeItem('redirectPath');
      renderRoute(redirectPath);
      history.replaceState({}, '', redirectPath);
    }
  })
  .catch(err => {
    console.error('Could not load manifest.json:', err);
  });

function setNavOpen(open) {
  const nav = document.getElementById('site-nav');
  const toggleBtn = document.getElementById('nav-toggle');

  if (open) {
    nav.removeAttribute('aria-hidden');
    document.documentElement.setAttribute('data-nav-open', 'true');
    toggleBtn.setAttribute('aria-expanded', 'true');
    nav.querySelector('a, button')?.focus();
  } else {
    document.documentElement.setAttribute('data-nav-open', 'false');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();
    nav.addEventListener('transitionend', () => {
      nav.setAttribute('aria-hidden', 'true');
    }, { once: true });
  }
}

const desktopQuery = window.matchMedia('(min-width: 768px)');

desktopQuery.addEventListener('change', (e) => {
  if (!e.matches) setNavOpen(false);
});

document.getElementById('nav-toggle').addEventListener('click', () => {
  const isOpen = document.documentElement.dataset.navOpen === 'true';
  setNavOpen(!isOpen);
});

document.documentElement.setAttribute('data-nav-open', 'false');

document.getElementById('nav-backdrop').addEventListener('click', () => {
  setNavOpen(false)
});

document.getElementById('site-nav').addEventListener('click', (e) => {
  if (e.target.closest('a') && !desktopQuery.matches) {
    setNavOpen(false);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !desktopQuery.matches) {
    setNavOpen(false);
  }
});

function deriveBreadcrumb(entry) {
  const segments = entry.path.split('/');
  const folderSegments = segments.slice(0, -1);

  const folderCrumbs = folderSegments.map((segment, i) => ({
    label: titleCaseSegment(segment),
    href: folderSegments.slice(0, i + 1).join('/')
  }));

  return [...folderCrumbs, {label: entry.title, href: null }];
}

function titleCaseSegment(segment) {
  return segment
    .split('-')
    .map((word) => ACRONYMS[word.toLowerCase()] || capitalize(word))
    .join(' ');
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function renderBreadcrumbs(crumbs) {
  if (crumbs.length === 0) return '';

  const items = crumbs.map((crumb, i) => {
    const isLast = i === crumbs.length - 1;
    return isLast
      // Replace these lines with the following to make the last breadcrumb a link instead of plain text once there is a page for it.
      // ? `<li aria-current="page">${crumb.label}</li>`
      // :`<li><a href="${crumb.href}">${crumb.label}</a></li>`;
      ? `<li aria-current="page">${crumb.label}</li>`
      : `<li>${crumb.label}</li>`;
  }).join('');

  return `<nav aria-label="Breadcrumbs"><ol>${items}</ol></nav>`;
}

function normalizePath(path) {
  if (!path) return '';

  if (path.startsWith('/')) {
    path = path.slice(1);
  }

  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
}

function renderRoute(path) {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === '') {
    document.getElementById('nav-location').innerHTML = '';
    return;
  }

  const entry = manifest.find(e => e.path === normalizedPath);

  if (entry !== undefined) {
    const crumbs = deriveBreadcrumb(entry);
    const breadcrumbHTML = renderBreadcrumbs(crumbs);
    document.getElementById('nav-location').innerHTML = breadcrumbHTML;
  } else {
    document.getElementById('nav-location').innerHTML = '';
    document.getElementById('article-content').innerHTML = `<p>Path not found: ${normalizedPath}<br>Return <a href="#home">home</a>?</p>`;
  }
}

document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a');
  if (!anchor) return;

  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

  if (anchor.target && anchor.target !== '_self') return;

  const url = new URL(anchor.href, location.href);

  if (url.origin !== location.origin) return;

  const path = url.pathname;

  if (path === location.pathname) {
    e.preventDefault();
    return;
  }

  e.preventDefault();
  history.pushState({}, '', path);
  renderRoute(path);
});

window.addEventListener('popstate', () => {
  renderRoute(location.pathname);
});

