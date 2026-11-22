import { normalizeShopLink } from './shop-link';
describe('Canonical shop identity', () => {
  it('unifies Instagram case, www, trailing slash and tracking variants', () => {
    const a = normalizeShopLink(
      'https://www.instagram.com/My.Shop/?igsh=tracking',
    );
    const b = normalizeShopLink('instagram.com/my.shop');
    expect(a.identityKey).toBe(b.identityKey);
    expect(a.normalizedUrl).toBe('https://instagram.com/my.shop/');
  });
  it('unifies Facebook numeric page identities', () => {
    expect(
      normalizeShopLink('https://m.facebook.com/profile.php?id=1234&fbclid=x')
        .identityKey,
    ).toBe(
      normalizeShopLink('https://facebook.com/people/Shop/1234').identityKey,
    );
    expect(normalizeShopLink('https://facebook.com/1234').identityKey).toBe(
      'facebook:id:1234',
    );
  });
  it.each([
    'javascript:alert(1)',
    'https://instagram.com/p/post',
    'https://instagram.com/reel/abc',
    'https://facebook.com/groups/123',
    'https://facebook.com/share/abc',
    'https://user:password@example.com',
    'https://instagram.com',
    'https://facebook.com/',
  ])('rejects non-shop or unsafe input %s', (value) =>
    expect(() => normalizeShopLink(value)).toThrow(),
  );
  it('does not treat a deceptive hostname as a social platform', () => {
    expect(
      normalizeShopLink('https://instagram.com.evil.invalid/shop').platform,
    ).toBe('WEBSITE');
  });
  it('preserves separate sellers, case-sensitive paths and meaningful queries', () => {
    const a = normalizeShopLink(
      'https://example.com/Store?owner=A&utm_source=instagram',
    );
    const b = normalizeShopLink('https://example.com/store?owner=B');
    expect(a.identityKey).not.toBe(b.identityKey);
    expect(a.normalizedUrl).toBe('https://example.com/Store?owner=A');
  });
});
