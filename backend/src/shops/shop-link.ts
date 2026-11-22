import { BadRequestException } from '@nestjs/common';
import type { ShopPlatform } from '../generated/prisma/client';
export type NormalizedLink = {
  platform: ShopPlatform;
  originalUrl: string;
  normalizedUrl: string;
  identityKey: string;
  handle: string | null;
};
const invalid = () =>
  new BadRequestException({
    code: 'INVALID_SHOP_LINK',
    message:
      'Enter a shop page link, not a post, story, group or sharing link.',
  });
const instagramHosts = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
]);
const facebookHosts = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'mbasic.facebook.com',
  'fb.com',
  'www.fb.com',
]);
const reserved = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'accounts',
  'direct',
  'tv',
  'share',
  'sharer.php',
  'groups',
  'watch',
  'marketplace',
  'photo',
  'photo.php',
  'photos',
  'posts',
  'events',
  'login',
  'login.php',
  'help',
  'settings',
  'privacy',
  'terms',
  'search',
  'hashtag',
]);
export function normalizeShopLink(value: string): NormalizedLink {
  const originalUrl = value.trim();
  let url: URL;
  try {
    url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(originalUrl)
        ? originalUrl
        : `https://${originalUrl}`,
    );
  } catch {
    throw invalid();
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname.includes('.') ||
    url.port
  )
    throw invalid();
  const host = url.hostname.toLowerCase();
  const parts = url.pathname
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        throw invalid();
      }
    });
  if (instagramHosts.has(host)) {
    const handle = parts[0]?.replace(/^@/, '').toLowerCase();
    if (
      parts.length !== 1 ||
      !handle ||
      !/^[a-z\d._]{1,30}$/.test(handle) ||
      reserved.has(handle)
    )
      throw invalid();
    return {
      originalUrl,
      platform: 'INSTAGRAM',
      handle,
      identityKey: `instagram:${handle}`,
      normalizedUrl: `https://instagram.com/${handle}/`,
    };
  }
  if (facebookHosts.has(host)) {
    let handle: string | null = null;
    let id: string | null = null;
    if (parts.length === 1 && parts[0].toLowerCase() === 'profile.php') {
      id = url.searchParams.get('id');
      if (!id || !/^\d+$/.test(id)) throw invalid();
    } else if (
      parts.length === 3 &&
      ['people', 'pages'].includes(parts[0].toLowerCase()) &&
      /^\d+$/.test(parts[2])
    )
      id = parts[2];
    else if (parts.length === 2 && parts[0].toLowerCase() === 'pg')
      handle = parts[1].toLowerCase();
    else if (parts.length === 1) handle = parts[0].toLowerCase();
    else throw invalid();
    if (handle && (!/^[a-z\d.]{1,100}$/.test(handle) || reserved.has(handle)))
      throw invalid();
    if (handle && /^\d+$/.test(handle)) {
      id = handle;
      handle = null;
    }
    if (!handle && !id) throw invalid();
    return {
      originalUrl,
      platform: 'FACEBOOK',
      handle,
      identityKey: id ? `facebook:id:${id}` : `facebook:${handle}`,
      normalizedUrl: id
        ? `https://facebook.com/profile.php?id=${id}`
        : `https://facebook.com/${handle}/`,
    };
  }
  // Websites retain meaningful case-sensitive paths and queries on shared storefronts.
  url.hostname = host;
  for (const key of new Set(url.searchParams.keys()))
    if (
      /^utm_/i.test(key) ||
      ['fbclid', 'gclid', 'igsh', 'igshid', 'mc_cid', 'mc_eid'].includes(
        key.toLowerCase(),
      )
    )
      url.searchParams.delete(key);
  if (!/^#!?\//.test(url.hash)) url.hash = '';
  const normalizedUrl = url.toString();
  return {
    originalUrl,
    normalizedUrl,
    identityKey: `website:${normalizedUrl}`,
    platform: 'WEBSITE',
    handle: null,
  };
}
export function looksLikeLink(value: string) {
  return /^(?:[a-z][a-z\d+.-]*:|(?:www\.)?[^\s/]+\.[a-z]{2,}(?:[/:?#]|$))/i.test(
    value,
  );
}
