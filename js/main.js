const ACCRONYMS = {
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
    .map((word) => ACCRONYMS[word.toLowerCase()] || capitalize(word))
    .join(' ');
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function renderBreadcrumbs(crumbs) {
  if (crumbs.length === 0) return '';

  const items = crumbs.map((crumb, i) => {
    const isLast = i === crumbs.length - 1;
    if (isLast) {
      return `<li aria-current="page">${crumb.label}</li>`;
    }
    return `<li><a href="${crumb.href}">${crumb.label}</a></li>`;
  }).join('');

  return `<nav aria-label="Breadcrumbs"><ol>${items}</ol></nav>`;
}