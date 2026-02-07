import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn (class name merger)', () => {
    it('should merge simple class names', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle undefined and null values', () => {
      const result = cn('foo', undefined, null, 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle boolean conditions', () => {
      const isActive = true;
      const isHidden = false;
      const result = cn('base', isActive && 'active', isHidden && 'hidden');
      expect(result).toContain('base');
      expect(result).toContain('active');
      expect(result).not.toContain('hidden');
    });

    it('should resolve Tailwind conflicts (last wins)', () => {
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2');
    });

    it('should resolve Tailwind color conflicts', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should resolve Tailwind background conflicts', () => {
      const result = cn('bg-red-100', 'bg-blue-200');
      expect(result).toBe('bg-blue-200');
    });

    it('should handle arrays of class names', () => {
      const result = cn(['foo', 'bar'], 'baz');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
      expect(result).toContain('baz');
    });

    it('should handle object syntax for conditional classes', () => {
      const result = cn({
        'bg-red-500': true,
        'text-white': true,
        hidden: false,
      });
      expect(result).toContain('bg-red-500');
      expect(result).toContain('text-white');
      expect(result).not.toContain('hidden');
    });

    it('should resolve complex Tailwind conflicts', () => {
      const result = cn('px-4 py-2 bg-blue-500', 'px-2 bg-red-500');
      expect(result).toContain('py-2');
      expect(result).toContain('px-2');
      expect(result).toContain('bg-red-500');
      expect(result).not.toContain('px-4');
      expect(result).not.toContain('bg-blue-500');
    });

    it('should handle responsive prefixes without conflict', () => {
      const result = cn('p-4', 'md:p-6');
      expect(result).toContain('p-4');
      expect(result).toContain('md:p-6');
    });

    it('should handle mix of strings, arrays, and objects', () => {
      const result = cn(
        'base-class',
        ['array-class'],
        { 'object-class': true, 'skip-class': false },
        undefined,
        'final-class'
      );
      expect(result).toContain('base-class');
      expect(result).toContain('array-class');
      expect(result).toContain('object-class');
      expect(result).not.toContain('skip-class');
      expect(result).toContain('final-class');
    });

    it('should handle single class name', () => {
      const result = cn('single');
      expect(result).toBe('single');
    });

    it('should not produce duplicate classes', () => {
      const result = cn('foo', 'foo');
      // tailwind-merge deduplicates
      expect(result).toBe('foo');
    });

    it('should handle whitespace in class strings', () => {
      const result = cn('  foo  ', 'bar');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });
  });
});
