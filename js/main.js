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
let currentPath = '';
const expandedCategories = new Set();

// Fetches articles/manifest.json which contains all the markdown paths minus the .md extension and the article title, then fetch and parse each markdown file to build the nav and breadcrumb.
// To add a new article, save a *.md file in the appropriate articles folder or sub-folder and add the pathname to manifest.json in the articles folder.
const manifestReady = fetch('articles/manifest.json')
  .then(response => response.json())
  .then(articles => {
    manifest = articles;
    renderNav();
    console.log(groupArticlesByCategory(manifest))
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      sessionStorage.removeItem('redirectPath');
      renderRoute(redirectPath);
      history.replaceState({}, '', redirectPath);
    }
  })
  .catch(err => {
    console.error('Could not load manifest.json:', err);
    throw err;
  });

function loadArticle(path) {
  return fetch(`/${path}.md`)
    .then(response => response.text())
    .then(markdown => parseArticle (markdown, path));
}

function parseFrontmatter(lines) {
  const defaults  = { title: '', date: '', tags: [] };

  if (lines[0].trim() !== '---') {
    return { frontmatter: { ...defaults }, bodyLines: lines };
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return { frontmatter: { ...defaults }, bodyLines: lines };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const bodyLines = lines.slice(closingIndex + 1);

  const frontmatter = { ...defaults };
  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatter[key] = value;
  }

  return { frontmatter, bodyLines };
}

function parseArticle(markdown, path) {
  const lines = markdown.split('\n');

  const { frontmatter, bodyLines } = parseFrontmatter(lines);
  const bodyMarkdown = bodyLines.join('\n');

  return {
    frontmatter: frontmatter,
    bodyHTML: markdownToHTML(bodyMarkdown)
  };
}

function markdownToHTML(markdown) {
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs.map(p => {
    const HTML = p
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

    return `<p>${HTML}</p>`;
  }).join('');
}

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

document.getElementById('site-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-category');
  if (!btn) return;

  const category = btn.dataset.category;
  const isExpanded = expandedCategories.has(category);

  if (isExpanded) {
    expandedCategories.delete(category);
  } else {
    expandedCategories.add(category);
  }

  renderNav();
  document.querySelector(`[data-category="${category}"]`)?.focus();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !desktopQuery.matches) {
    setNavOpen(false);
  }
});

function deriveBreadcrumb(article) {
  const segments = article.path.split('/');
  const folderSegments = segments.slice(0, -1);

  const folderCrumbs = folderSegments.map((segment, i) => ({
    label: titleCaseSegment(segment),
    href: folderSegments.slice(0, i + 1).join('/')
  }));

  return folderCrumbs;
}

function titleCaseSegment(segment) {
  return segment
    .split('-')
    .map((word) => ACRONYMS[word.toLowerCase()] || capitalize(word))
    .join(' ');
}

function groupArticlesByCategory(manifest) {
  const groups = [];

  for (const article of manifest) {
    const [, categorySegment] = article.path.split('/');

    let group = groups.find(g => g.category === categorySegment);
    if (!group) {
      group = {
        category: categorySegment,
        label: titleCaseSegment(categorySegment),
        articles: []
      };
      groups.push(group);
    }

    group.articles.push(article);
  }

  groups.sort((a, b) => a.label.localeCompare(b.label));
  groups.forEach(g => g.articles.sort((a, b) => a.title.localeCompare(b.title)));

  return groups;
}

function renderNav() {
  const groups = groupArticlesByCategory(manifest);

  const categoryItems = groups.map(group => {
    const isExpanded = expandedCategories.has(group.category);
    const icon = isExpanded ? '-' : '+';

    const articleItems = group.articles.map(article => {
      const isCurrent = article.path === currentPath;
      const currentAttr = isCurrent ? ' aria-current="page"' : '';
      return `<li><a href="/${article.path}"${currentAttr}>${article.title}</a></li>`;
    }).join('');

    const articleList = isExpanded
      ? `<ul class="nav-articles">${articleItems}</ul>`
      : '';

    return `
      <li>
        <button class="nav-category" aria-expanded="${isExpanded}" data-category="${group.category}">
          <span class="toggle-icon">${icon}</span> ${group.label}
        </button>
        ${articleList}
      </li>
    `;
  }).join('');

  const homeAttr = currentPath === '' ? ' aria-current="page"' : '';

  document.querySelector('.nav').innerHTML = `
    <li><a class="nav-primary" href="/"${homeAttr}>Home</a></li>
    <li><a class="nav-primary" href="/about">About</a></li>
    <li class="nav-section-header">Articles</li>
    ${categoryItems}
  `;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function renderBreadcrumbs(crumbs) {
  if (crumbs.length === 0) return '';

  const items = crumbs.map((crumb) => {
    return `<li>${crumb.label}</li>`;
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

async function renderRoute(path) {
  try {
    await manifestReady;
  } catch (err) {
    console.error('Could not load manifest.json:', err);
    document.getElementById('article-content').innerHTML = `<p>Uh oh, something went wrong loading the site navigation.<br>Return <a href="/">home</a>?</p>`;
    document.getElementById('home').hidden = true;
    return;
  }

  const normalizedPath = normalizePath(path);

  if (normalizedPath === '') {
    document.getElementById('nav-location').innerHTML = '';
    document.getElementById('article-content').innerHTML = '';
    document.getElementById('home').hidden = false;
    currentPath = '';
    expandedCategories.clear();
    renderNav();

    return;
  }

  const article = manifest.find(e => e.path === normalizedPath);

  if (article !== undefined) {
    const crumbs = deriveBreadcrumb(article);
    const breadcrumbHTML = renderBreadcrumbs(crumbs);
    document.getElementById('nav-location').innerHTML = breadcrumbHTML;
    document.getElementById('home').hidden = true;
    currentPath = normalizedPath;
    const [, categorySegment] = article.path.split('/');
    expandedCategories.add(categorySegment);
    renderNav();

    try {
      const loadedArticle = await loadArticle(article.path);
      const title = loadedArticle.frontmatter.title || article.title;
      document.getElementById('article-content').innerHTML = `<h1>${title}</h1>` + loadedArticle.bodyHTML;

    } catch(err) {
      console.error('Could not load article:', err);
      document.getElementById('article-content').innerHTML = `<p>Uh oh, something happened when loading this article: ${normalizedPath}<br>Return <a href="/">home</a>?</p>`;
    }
  } else {
    document.getElementById('nav-location').innerHTML = '';
    document.getElementById('article-content').innerHTML = `<p>Path not found: ${normalizedPath}<br>Return <a href="/">home</a>?</p>`;
    document.getElementById('home').hidden = true;
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

