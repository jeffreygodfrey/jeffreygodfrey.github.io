---
title: API - Design Notes
date: 2026-08-14
tags: api
excerpt: Maecenas diam tellus, maximus nec tincidunt ac, dapibus in nulla. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus
---

Maecenas diam tellus, maximus nec tincidunt ac, dapibus in nulla. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Suspendisse tincidunt vel arcu at laoreet. Sed auctor ornare diam, at sodales est commodo bibendum. Cras pulvinar elit ac tempus vehicula. Mauris lorem erat, consequat ac orci quis, dignissim molestie lectus. Aliquam pulvinar sodales nibh in ornare. Aliquam et blandit nisi. Donec dui metus, imperdiet sed odio eu, tristique dictum nunc. Donec dapibus sapien quis felis posuere vestibulum. Praesent nec magna vitae massa pellentesque maximus vel a elit. Pellentesque sit amet ex facilisis, rhoncus sapien a, rhoncus nibh.

```js
const articleItems = group.articles.map(article => {
  const isCurrent = article.path === currentPath;
  const currentAttr = isCurrent ? ' aria-current="page"' : '';
  return `<li><a href="/${article.path}"${currentAttr}>${article.title}</a></li>`;
}).join('');
```

Donec a eros sem. Aenean ac interdum leo, varius aliquam ipsum. Morbi rutrum lacus fermentum orci auctor, viverra pretium augue venenatis. Sed eget nisl cursus tortor feugiat viverra. Ut at iaculis odio. Nulla ut dui nec nisi scelerisque elementum quis at felis. Curabitur sagittis tortor gravida leo egestas maximus. Mauris ullamcorper in arcu sit amet luctus. Praesent nulla risus, viverra sed facilisis vel, congue non libero.

```css
body::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  height: 50;

  background: linear-gradient(
    to bottom,
    var(--bg-header) 0px,
    var(--bg-header) var(--page-header-height),
    transparent calc(
      var(--page-header-height) +
      var(--header-gradient-fade)
    )
  );
  z-index: 20
}
```

Aenean ipsum metus, mollis eu lacinia a, imperdiet sed lectus. Cras ac magna a libero tincidunt efficitur tincidunt sed turpis. Mauris condimentum finibus feugiat. Etiam accumsan blandit enim, sed imperdiet nibh tincidunt et. Aliquam tincidunt magna et massa pulvinar tincidunt. Curabitur vitae neque eu risus elementum condimentum. Mauris ullamcorper elementum sem at posuere. Nullam et odio nunc. Proin suscipit vel lorem ut dignissim.

```html
<!-- article card -->
<div class="card" id='intro'>
  <h2>Title</h2>
  <img src="thumb.png" alt="preview" />
</div>
```

Duis a massa dapibus, pellentesque urna non, congue urna. Quisque et turpis sapien. Pellentesque ut sem erat. Praesent dapibus sed nunc ut maximus. Proin vulputate, ligula eget maximus finibus, mauris sapien maximus dui, sit amet accumsan metus nibh a erat. Suspendisse viverra sagittis odio eu venenatis. Sed porta, enim eget porta volutpat, odio lectus semper dui, vitae consequat lacus quam eget enim. Sed porta nisi nec felis feugiat, sed venenatis velit pellentesque. Donec et urna sit amet augue mattis bibendum. Phasellus ut elementum tortor. Mauris euismod turpis id fermentum elementum.

Proin neque nunc, pellentesque ut tincidunt nec, posuere sed leo. Maecenas a sodales leo. Aliquam dictum porta eros id fermentum. Vivamus ac interdum libero. Sed rutrum porta maximus. Nam quis est ut nisi maximus egestas. Phasellus in lectus et elit iaculis auctor. Duis pellentesque ultrices justo, ac malesuada dui sodales lacinia. Suspendisse in leo neque. Fusce porttitor, lorem ut accumsan viverra, elit tortor sodales sem, ac dapibus mi odio quis elit. Fusce vel lacinia arcu. Curabitur urna nisl, molestie ac ligula a, vehicula aliquam lectus.