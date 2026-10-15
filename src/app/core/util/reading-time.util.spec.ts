import { describe, expect, it } from 'vitest';
import { formatReadingTime } from './reading-time.util';

describe('formatReadingTime', () => {
	it('converts seconds to ceiling minutes below one hour', () => {
		expect(formatReadingTime(404)).toBe('7m');
		expect(formatReadingTime(1800)).toBe('30m');
		expect(formatReadingTime(1)).toBe('1m');
		expect(formatReadingTime(59)).toBe('1m');
		expect(formatReadingTime(60)).toBe('1m');
		expect(formatReadingTime(61)).toBe('2m');
	});

	it('renders whole hours when minutes round into exact hour boundaries', () => {
		expect(formatReadingTime(3600)).toBe('1h');
		expect(formatReadingTime(3599)).toBe('1h');
		expect(formatReadingTime(7199)).toBe('2h');
		expect(formatReadingTime(7200)).toBe('2h');
	});

	it('renders combined hours and minutes', () => {
		expect(formatReadingTime(5400)).toBe('1h 30m');
		expect(formatReadingTime(3601)).toBe('1h 1m');
		expect(formatReadingTime(7201)).toBe('2h 1m');
	});

	it('falls back to five minutes for missing or non-positive values', () => {
		expect(formatReadingTime(undefined)).toBe('5m');
		expect(formatReadingTime(null)).toBe('5m');
		expect(formatReadingTime(0)).toBe('5m');
		expect(formatReadingTime(-120)).toBe('5m');
	});
});
