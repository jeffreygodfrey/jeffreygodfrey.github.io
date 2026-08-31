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

function applyTheme() {
  const stored = localStorage.getItem('theme'); // 'light' | 'dark' | null

  const resolved = stored === 'light' || stored === 'dark'
    ? stored
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', resolved);
}

const themeSelect = document.getElementById('theme-select');
themeSelect.value = localStorage.getItem('theme') ?? 'system';

document.getElementById('theme-select').addEventListener('change', (e) => {
  const choice = e.target.value; // 'light' | 'dark' | 'system'

  if (choice === 'system') {
    localStorage.removeItem('theme');
  } else {
    localStorage.setItem('theme', choice);
  }

  applyTheme();
});

let manifest = [];
let currentPath = '';
const expandedCategories = new Set();

// Fetches articles/manifest.json which contains all the markdown paths minus the .md extension and the article title, then fetch and parse each markdown file to build the nav.
// To add a new article, save a *.md file in the appropriate articles folder or sub-folder and add the pathname to manifest.json in the articles folder.
const manifestReady = fetch('articles/manifest.json')
  .then(response => response.json())
  .then(articles => {
    manifest = articles;
    renderNav();

    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      sessionStorage.removeItem('redirectPath');
      renderRoute(redirectPath);
      history.replaceState({}, '', redirectPath);
    } else {
      renderRoute(location.pathname);
    }
  })
  .catch(err => {
    console.error('Could not load manifest.json:', err);
    throw err;
  });

function loadArticle(path) {
  return fetch(`/${path}.md`)
    .then(response => response.text())
    .then(markdown => markdown.replace(/\r\n/g, '\n'))
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
  const codeBlocks = [];

  const syntaxHighlight = (code, lang) => {
    if (lang === 'js' || lang === 'javascript') {
      return `<pre data-lang="${lang}"><code class="language-js">${highlightJS(escapeHTML(code))}</code></pre>`;
    } else if (lang === 'html') {
      return `<pre data-lang="${lang}"><code class="language-html">${highlightHTML(code)}</code></pre>`;
    } else if (lang === 'css') {
      return `<pre data-lang="${lang}"><code class="language-css">${highlightCSS(escapeHTML(code))}</code></pre>`;
    } else {
      return `<pre data-lang="${lang}"><code>${escapeHTML(code)}</code></pre>`;
    }
  };

  const escapeHTML = (str) => {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
  };

  const jsCommentPattern = '(\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/)';
  const jsStringPattern = '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')';
  const jsKeywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else',
    'for', 'while', 'class', 'new', 'this', 'import', 'export',
    'default', 'from', 'typeof', 'null', 'undefined', 'true', 'false'
  ];
  const jsKeywordPattern = `(\\b(?:${jsKeywords.join('|')})\\b)`;
  const jsNumberPattern = '(\\b\\d+\\.?\\d*\\b)';
  const jsOperatorPattern = '(===|!==|==|!=|=>|&&|\\|\\||[+\\-*/%=<>!])';
  const jsFunctionCallPattern = '(\\b[a-zA-Z_$][a-zA-Z0-9_$]*)(?=\\s*\\()';
  const jsIdentifierPattern = '(\\b[a-zA-Z_$][a-zA-Z0-9_$]*\\b)';

  function maskCommentsAndStrings(code) {
    const comments = [];
    const strings = [];

    let masked = code.replace(new RegExp(jsCommentPattern, 'g'), (match) => {
      const token = `\u0000COMMENT${comments.length}\u0000`;
      comments.push(`<span class="token-comment">${match}</span>`);
      return token;
    });

    masked = masked.replace(new RegExp(jsStringPattern, 'g'), (match) => {
      const token = `\u0000STRING${strings.length}\u0000`;
      strings.push(`<span class="token-string">${match}</span>`);
      return token;
    });

    return { masked, comments, strings };
  }

  function scanJSDeclarations(masked) {
    const map = {};
    let m;

    const classPattern = /\bclass\s+([a-zA-Z_$][\w$]*)/g;
    while ((m = classPattern.exec(masked)) !== null) map[m[1]] = 'type';

    const functionPattern = /\bfunction\s+([a-zA-Z_$][\w$]*)\s*\(/g;
    while ((m = functionPattern.exec(masked)) !== null) map[m[1]] = 'function';

    const declPattern = /\b(const|let|var)\s+([a-zA-Z_$][\w$]*)/g;
    while ((m = declPattern.exec(masked)) !== null) {
      map[m[2]] = m[1] === 'const' ? 'constant' : 'variable';
    }

    // Overrides plain `const` classification above when the value is a function
    const constFunctionPattern = /\bconst\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:\([^)]*\)\s*=>|function\b)/g;
    while ((m = constFunctionPattern.exec(masked)) !== null) map[m[1]] = 'function';

    return map;
  }

  const jsTokenPattern = [jsKeywordPattern, jsOperatorPattern, jsNumberPattern, jsFunctionCallPattern, jsIdentifierPattern].join('|');
  const jsTokenRegex = new RegExp(jsTokenPattern, 'g');

  function highlightJS(code) {
    const { masked, comments, strings } = maskCommentsAndStrings(code);
    const declarationMap = scanJSDeclarations(masked);

    let highlighted = masked.replace(jsTokenRegex, (match, keyword, operator, number, funcCall, identifier) => {
      if (keyword) return `<span class="token-keyword">${keyword}</span>`;
      if (operator) return `<span class="token-operator">${operator}</span>`;
      if (number) return `<span class="token-number">${number}</span>`;
      if (funcCall) return `<span class="token-function">${funcCall}</span>`;
      if (identifier) {
        const category = declarationMap[identifier];
        return category ? `<span class="token-${category}">${identifier}</span>` : identifier;
      }
      return match;
    });

    highlighted = highlighted.replace(/\u0000STRING(\d+)\u0000/g, (m, i) => strings[Number(i)]);
    highlighted = highlighted.replace(/\u0000COMMENT(\d+)\u0000/g, (m, i) => comments[Number(i)]);

    return highlighted;
  }

  const htmlTagNames = [
  'html', 'body', 'head', 'header', 'main', 'nav', 'aside', 'footer',
  'section', 'article', 'div', 'span', 'a', 'ul', 'li', 'ol',
  'p', 'pre', 'code', 'button', 'select', 'option', 'label',
  'selectedcontent'
  ];

  const mediaPattern = '(@media)';
  const pseudoElementPattern = '(::[a-zA-Z-]+)';
  const bracketParenPattern = '(\\[[^\\]]*\\]|\\([^)]*\\))';
  const cssTagNamePattern = `((?<![.#a-zA-Z0-9-])(?:${htmlTagNames.join('|')})(?![a-zA-Z0-9-]))`;

  const selectorTokenPattern = [mediaPattern, pseudoElementPattern, bracketParenPattern, cssTagNamePattern].join('|');
  const selectorTokenRegex = new RegExp(selectorTokenPattern, 'g');

  function highlightSelector(header) {
    const inner = header.replace(selectorTokenRegex, (match, media, pseudo, bracket, tag) => {
      if (media) return `<span class="token-keyword">${media}</span>`;
      if (pseudo) return `<span class="token-function">${pseudo}</span>`;
      if (bracket) return `<span class="token-string">${bracket}</span>`;
      if (tag) return `<span class="token-tag">${tag}</span>`;
      return match;
    });

    return `<span class="token-type">${inner}</span>`;
  }

  const cssStringPattern = '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')';
  const colorFunctionPattern = '((?:oklch|oklab|hsl|hsla|rgb|rgba|lab|lch|color)\\((?:[^()]|\\([^()]*\\))*\\))';
  const hexColorPattern = '(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3}))';
  const importantPattern = '(!important)';
  const cssNumberPattern = '(-?\\b\\d+\\.?\\d*(?:rem|em|ps|%|vh|vw|deg|s|ms)?(?![a-zA-Z0-9_]))';

  const cssValueTokenPattern = [cssStringPattern, colorFunctionPattern, hexColorPattern, importantPattern, cssNumberPattern].join('|');
  const cssValueTokenRegex = new RegExp(cssValueTokenPattern, 'g');

  function highlightValue(value) {
    return value.replace(cssValueTokenRegex, (match, string, colorFn, hex, important, number) => {
      if (string) return `<span class="token-string">${string}</span>`;
      if (colorFn) return `<span class="token-color"><span class="color-swatch" style="background-color: ${colorFn}"></span>${colorFn}</span>`;
      if (hex) return `<span class="token-color"><span class="color-swatch" style="background-color: ${hex}"></span>${hex}</span>`;
      if (important) return `<span class="token-keyword">${important}</span>`;
      if (number) return `<span class="token-number">${number}</span>`;
      return match;
    });
  }

  const declarationPattern = /([ \t]*)([a-zA-Z0-9-]+)(\s*:\s*)([^;]*)(;?)/g;

  function highlightDeclarations(body) {
    return body.replace(declarationPattern, (match, indent, property, colon, value, semicolon) => {
      return `${indent}<span class="token-property">${property}</span>${colon}${highlightValue(value)}${semicolon}`;
    });
  }

  function highlightBlocks(text) {
    let result = '';
    let i = 0;

    while (i < text.length) {
      const braceIndex = text.indexOf('{', i);

      if (braceIndex === -1) {
        result += text.slice(i);
        break;
      }

      const header = text.slice(i, braceIndex);
      result += highlightSelector(header) + '{';

      let depth = 1;
      let j = braceIndex + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') depth--;
        j++;
      }

      const body = text.slice(braceIndex + 1, j - 1);
      result += body.includes('{') ? highlightBlocks(body) : highlightDeclarations(body);
      result += '}';

      i = j;
    }

    return result;
  }

  function highlightCSS(code) {
    const comments = [];
    const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      const token = `\u0000COMMENT${comments.length}\u0000`;
      comments.push(`<span class="token-comment">${match}</span>`);
      return token;
    });

    const highlighted = highlightBlocks(withoutComments);

    return highlighted.replace(/\u0000COMMENT(\d+)\u0000/g, (match, index) => comments[Number(index)]);
  }

  const htmlCommentPattern = /<!--[\s\S]*?-->/g;
  const tagPattern = /<\/?[a-zA-Z][^>]*>/g;
  const attrPattern = /([a-zA-Z-]+)(=)("[^"]*"|'[^']*')/g;
  const htmlTagNamePattern = /^\/?([a-zA-Z][a-zA-Z0-9]*)/;

  function highlightHTML(code) {
    const comments = [];

    const withPlaceholders = code.replace(htmlCommentPattern, (match) => {
      const token = `\u0000COMMENT${comments.length}\u0000`;
      comments.push(`<span class="token-comment">${escapeHTML(match)}</span>`);
      return token;
    });

    const withTags = withPlaceholders.replace(tagPattern, (fullTag) => {
      const inner = fullTag
        .replace(/^<\/?/, '')
        .replace(/\/?>$/, '');

      const nameMatch = inner.match(htmlTagNamePattern);
      const tagName = nameMatch ? nameMatch[1] : '';

      const rest = inner.slice(nameMatch ? nameMatch[0].length : 0);

      const highlightedRest = rest.replace(attrPattern, (match, name, eq, value) => {
        return `<span class="token-attr-name">${escapeHTML(name)}</span>${eq}<span class="token-attr-value">${escapeHTML(value)}</span>`;
      });

      const isClosing = fullTag.startsWith('</');
      const isSelfClosing = fullTag.endsWith('/>');
      const slash = isClosing ? '/' : '';
      const selfClose = isSelfClosing ? ' /' : '';

      return `<span class="token-tag">&lt;${slash}${escapeHTML(tagName)}</span>${highlightedRest}<span class="token-tag">${selfClose}&gt;</span>`;
    });

    return withTags.replace(/\u0000COMMENT(\d+)\u0000/g, (match, index) => {
      return comments[Number(index)];
    });
  }

  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  markdown = markdown.replace(codeBlockRegex, (match, lang, code) => {
    codeBlocks.push(syntaxHighlight(code, lang));
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const result = paragraphs.map(p => {
    const HTML = p
      .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

    return `<p>${HTML}</p>`;
  }).join('');

  return result.replace(/<p>\u0000CODE(\d+)\u0000<\/p>/g, (match, index) => codeBlocks[index]);
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
    // Chevron Right Icon
    const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" class="nav-chevron theme-icon"><path d="m9 18 6-6-6-6"/></svg>';

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
    <li><a class="nav-primary" href="/"${homeAttr}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Home</a></li>
    <li><a class="nav-primary" href="/about"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>About</a></li>
    <li class="nav-section-header"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="10" y="6" rx="1"/></svg>Articles</li>
    ${categoryItems}
  `;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function renderHome() {
  const sorted = [...manifest].sort((a, b) => b.date.localeCompare(a.date));

  const cards = sorted.map(article => `
    <article class="article-card">
      <h2><a class="card-link" href="/${article.path}">${article.title}</a></h2>
      <time datetime="${article.date}">${formatDate(article.date)}</time>
      <p>${article.excerpt}</p>
      <!-- <ul class="article-card-tags"><li><a href="#">tag</a></li></ul> -->
    </article>
  `).join('');

  document.getElementById('home').innerHTML = cards;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
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
    document.getElementById('article-content').innerHTML = '';
    document.getElementById('home').hidden = false;
    currentPath = '';
    expandedCategories.clear();
    renderNav();
    renderHome();

    return;
  } else if (normalizedPath === 'about') {
    document.getElementById('home').hidden = true;
    currentPath = 'about';
    renderNav();

    try {
      const loadedArticle = await loadArticle('about');
      document.getElementById('article-content').innerHTML = `<h1 class="article-title">${loadedArticle.frontmatter.title || 'About'}</h1>` + loadedArticle.bodyHTML;
    } catch (err) {
      console.error('Could not load about page:', err);
      document.getElementById('article-content').innerHTML = `<p>Uh oh, something happened loading this page. <br>Return <a href="/">home</a>?</p>`;
    }

    return;
  }

  const article = manifest.find(e => e.path === normalizedPath);

  if (article !== undefined) {
    document.getElementById('home').hidden = true;
    currentPath = normalizedPath;
    const [, categorySegment] = article.path.split('/');
    expandedCategories.add(categorySegment);
    renderNav();

    try {
      const loadedArticle = await loadArticle(article.path);
      const title = loadedArticle.frontmatter.title || article.title;
      document.getElementById('article-content').innerHTML = `<h1 class="article-title">${title}</h1>` + loadedArticle.bodyHTML;

    } catch(err) {
      console.error('Could not load article:', err);
      document.getElementById('article-content').innerHTML = `<p>Uh oh, something happened when loading this article: ${normalizedPath}<br>Return <a href="/">home</a>?</p>`;
    }
  } else {
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

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!localStorage.getItem('theme')) {
    applyTheme();
  }
});