import { normalizeProfileData, Profile } from './profile';

describe('normalizeProfileData', () => {
  it('trims ISO datetime birthdays to yyyy-MM-dd', () => {
    const input: Profile = { birthday: '2025-11-12T05:00:00.000Z' };
    const result = normalizeProfileData(input);
    expect(result?.birthday).toBe('2025-11-12');
  });

  it('keeps already-normalized yyyy-MM-dd birthdays', () => {
    const input: Profile = { birthday: '2025-01-31' };
    const result = normalizeProfileData(input);
    expect(result?.birthday).toBe('2025-01-31');
  });

  it('falls back to slicing long non-date strings', () => {
    const input: Profile = { birthday: 'not-a-date-string' };
    const result = normalizeProfileData(input);
    expect(result?.birthday).toBe('not-a-date');
  });

  it('returns null when data is null', () => {
    const result = normalizeProfileData(null);
    expect(result).toBeNull();
  });
});
