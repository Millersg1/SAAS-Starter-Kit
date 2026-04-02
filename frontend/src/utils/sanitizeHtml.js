// Shared HTML sanitizer — strips dangerous tags & attributes to prevent XSS
const ALLOWED_TAGS = new Set([
  'h1','h2','h3','h4','h5','h6','p','br','hr','div','span','a',
  'strong','b','em','i','u','s','mark','small','sub','sup',
  'ul','ol','li','blockquote','pre','code',
  'table','thead','tbody','tfoot','tr','th','td',
  'img','figure','figcaption',
]);

const ALLOWED_ATTRS = new Set([
  'href','src','alt','title','class','style','width','height',
  'target','rel','colspan','rowspan','id',
]);

export default function sanitizeHtml(dirty) {
  if (!dirty) return '';
  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  const walk = (node) => {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType === 3) continue;
      if (child.nodeType !== 1) { child.remove(); continue; }
      const tag = child.tagName.toLowerCase();
      if (tag === 'script' || tag === 'iframe' || tag === 'object' || tag === 'embed' || !ALLOWED_TAGS.has(tag)) {
        child.remove();
        continue;
      }
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) {
          child.removeAttribute(attr.name);
        }
        if (name === 'href' && /^\s*javascript:/i.test(attr.value)) {
          child.removeAttribute(attr.name);
        }
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
