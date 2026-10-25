import { useEffect } from 'react';
import { translateUiText } from './core.js';
import { useI18n } from './useI18n.js';

const translatedText = new WeakMap();
const translatedAttributes = new WeakMap();
const attributes = ['aria-label', 'placeholder', 'title'];
const skippedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);

function ignored(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return !element || skippedTags.has(element.tagName) || element.closest('[data-i18n-ignore], [contenteditable="true"]');
}

function localizeText(node, locale) {
  if (ignored(node)) return;
  const current = node.nodeValue;
  const previous = translatedText.get(node);
  const source = previous && current === previous.rendered ? previous.source : current;
  const leading = source.match(/^\s*/)?.[0] || '';
  const trailing = source.match(/\s*$/)?.[0] || '';
  const content = source.slice(leading.length, source.length - trailing.length || undefined);
  const localized = translateUiText(locale, content);
  const rendered = `${leading}${localized}${trailing}`;
  translatedText.set(node, { source, rendered });
  if (current !== rendered) node.nodeValue = rendered;
}

function localizeAttributes(element, locale) {
  if (ignored(element)) return;
  const records = translatedAttributes.get(element) || {};
  for (const name of attributes) {
    if (!element.hasAttribute(name)) continue;
    const current = element.getAttribute(name);
    const previous = records[name];
    const source = previous && current === previous.rendered ? previous.source : current;
    const rendered = translateUiText(locale, source);
    records[name] = { source, rendered };
    if (current !== rendered) element.setAttribute(name, rendered);
  }
  translatedAttributes.set(element, records);
}

function localizeTree(root, locale) {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeText(root, locale);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || ignored(root)) return;
  localizeAttributes(root, locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) localizeText(node, locale);
    else localizeAttributes(node, locale);
  }
}

export default function LegacyI18nBridge() {
  const { locale } = useI18n();

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    localizeTree(root, locale);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') localizeText(record.target, locale);
        else if (record.type === 'attributes') localizeAttributes(record.target, locale);
        else for (const node of record.addedNodes) localizeTree(node, locale);
      }
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
