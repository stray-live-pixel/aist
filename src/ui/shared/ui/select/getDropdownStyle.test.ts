import { describe, expect, it } from 'vitest';

import { getDropdownStyle } from './getDropdownStyle';

describe('getDropdownStyle', () => {
  it('hides dropdown before portal position is calculated', () => {
    expect(getDropdownStyle({ dropdownPosition: undefined })).toEqual({
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      maxHeight: 0,
      opacity: 0,
      pointerEvents: 'none',
      transform: 'translate3d(-100vw, -100vh, 0)'
    });
  });

  it('uses fixed position values after calculation', () => {
    expect(
      getDropdownStyle({
        dropdownPosition: {
          top: 120,
          left: 16,
          width: 280,
          maxHeight: 240,
          placement: 'bottom'
        }
      })
    ).toEqual({
      top: 120,
      left: 16,
      width: 280,
      height: 240,
      maxHeight: 240
    });
  });
});
