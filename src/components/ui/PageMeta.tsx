import { useEffect } from 'react';

type Props = {
  title: string;
  description: string;
  /** Canonical URL for this page. Falls back to the current location. */
  canonicalUrl?: string;
  /** OG image URL. Relative paths are resolved against the current origin. */
  image?: string;
  /** og:type override - defaults to "website". */
  ogType?: string;
  /** Mark a page as noindex, useful for utility/admin/local-only surfaces. */
  noIndex?: boolean;
};

const SITE_NAME = 'Sumo Sauce';
const DEFAULT_IMAGE = '/logo-192.png';

function normalizeBrandCopy(value: string): string {
  return String(value || '')
    .replace(/SUMO WATCH/g, 'SUMO SAUCE')
    .replace(/Sumo Watch/g, 'Sumo Sauce')
    .replace(/SumoWatch/g, 'Sumo Sauce');
}

function resolveAbsoluteUrl(url: string): string {
  if (typeof window === 'undefined') return url;

  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

/**
 * Declarative document metadata manager.
 * Sets document.title, description, OpenGraph/Twitter tags, robots, and a
 * canonical link with safe defaults for route-level sharing.
 */
export default function PageMeta({
  title,
  description,
  canonicalUrl,
  image,
  ogType = 'website',
  noIndex = false,
}: Props) {
  useEffect(() => {
    const prev = document.title;
    const normalizedTitle = normalizeBrandCopy(title);
    const normalizedDescription = normalizeBrandCopy(description);

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

    const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const resolvedCanonicalUrl = resolveAbsoluteUrl(canonicalUrl ?? currentUrl);
    const resolvedImage = resolveAbsoluteUrl(image ?? DEFAULT_IMAGE);

    document.title = normalizedTitle;

    const desc = upsertMeta('name', 'description', normalizedDescription);
    const robots = upsertMeta('name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow');

    const ogTitleEl = upsertMeta('property', 'og:title', normalizedTitle);
    const ogDescEl = upsertMeta('property', 'og:description', normalizedDescription);
    const ogTypeEl = upsertMeta('property', 'og:type', ogType);
    const ogSiteName = upsertMeta('property', 'og:site_name', SITE_NAME);
    const ogImage = upsertMeta('property', 'og:image', resolvedImage);
    const ogUrlEl = upsertMeta('property', 'og:url', resolvedCanonicalUrl);

    const twCard = upsertMeta('name', 'twitter:card', 'summary');
    const twTitle = upsertMeta('name', 'twitter:title', normalizedTitle);
    const twDesc = upsertMeta('name', 'twitter:description', normalizedDescription);
    const twImage = upsertMeta('name', 'twitter:image', resolvedImage);

    const canonicalLink = upsertLink('canonical', resolvedCanonicalUrl);

    return () => {
      document.title = prev;
      desc.content = '';
      robots.content = 'index,follow';
      ogTitleEl.content = SITE_NAME;
      ogDescEl.content = '';
      ogTypeEl.content = 'website';
      ogSiteName.content = SITE_NAME;
      ogImage.content = resolveAbsoluteUrl(DEFAULT_IMAGE);
      ogUrlEl.content = '';
      twCard.content = 'summary';
      twTitle.content = SITE_NAME;
      twDesc.content = '';
      twImage.content = resolveAbsoluteUrl(DEFAULT_IMAGE);
      canonicalLink.href = '';
    };
  }, [title, description, canonicalUrl, image, ogType, noIndex]);

  return null;
}
