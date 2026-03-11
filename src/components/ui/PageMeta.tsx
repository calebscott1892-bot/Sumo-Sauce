import { useEffect } from 'react';

type Props = {
  title: string;
  description: string;
  /** Canonical URL for this page (absolute). */
  canonicalUrl?: string;
  /** OG image URL (absolute). Falls back to site default. */
  image?: string;
  /** og:type override — defaults to "website". */
  ogType?: string;
};

const SITE_NAME = 'Sumo Sauce';
const DEFAULT_IMAGE = '/favicon.svg';

/**
 * Declarative document metadata manager.
 * Sets document.title, meta description, OpenGraph tags, Twitter card tags,
 * and canonical link. Cleans up on unmount.
 */
export default function PageMeta({ title, description, canonicalUrl, image, ogType = 'website' }: Props) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;

    function upsertMeta(attr: string, key: string, content: string): HTMLMetaElement {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
      return el;
    }

    function upsertLink(rel: string, href: string): HTMLLinkElement {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
      return el;
    }

    const resolvedImage = image || DEFAULT_IMAGE;

    // Standard meta
    const desc = upsertMeta('name', 'description', description);

    // OpenGraph
    const ogTitleEl = upsertMeta('property', 'og:title', title);
    const ogDescEl = upsertMeta('property', 'og:description', description);
    const ogTypeEl = upsertMeta('property', 'og:type', ogType);
    const ogSiteName = upsertMeta('property', 'og:site_name', SITE_NAME);
    const ogImage = upsertMeta('property', 'og:image', resolvedImage);
    const ogUrlEl = canonicalUrl ? upsertMeta('property', 'og:url', canonicalUrl) : null;

    // Twitter Card
    const twCard = upsertMeta('name', 'twitter:card', 'summary');
    const twTitle = upsertMeta('name', 'twitter:title', title);
    const twDesc = upsertMeta('name', 'twitter:description', description);
    const twImage = upsertMeta('name', 'twitter:image', resolvedImage);

    // Canonical link
    const canonicalLink = canonicalUrl ? upsertLink('canonical', canonicalUrl) : null;

    return () => {
      document.title = prev;
      desc.content = '';
      ogTitleEl.content = SITE_NAME;
      ogDescEl.content = '';
      ogTypeEl.content = 'website';
      ogSiteName.content = SITE_NAME;
      ogImage.content = DEFAULT_IMAGE;
      if (ogUrlEl) ogUrlEl.content = '';
      twCard.content = 'summary';
      twTitle.content = SITE_NAME;
      twDesc.content = '';
      twImage.content = DEFAULT_IMAGE;
      if (canonicalLink) canonicalLink.href = '';
    };
  }, [title, description, canonicalUrl, image, ogType]);

  return null;
}
