import { describe, it, expect } from 'vitest';
import { listBuiltinHatIds, hatsCompatibleWith } from '@/library/hats';

describe('HAT library expansion (#7 Phase 8b)', () => {
  it('exposes 5 built-in hats including the four new ones', () => {
    const ids = listBuiltinHatIds();
    expect(ids).toContain('cqrobot-dmx-shield-max485');
    expect(ids).toContain('rpi-poe-plus');
    expect(ids).toContain('rpi-sense-hat');
    expect(ids).toContain('pimoroni-fan-shim');
    expect(ids).toContain('arduino-ethernet-shield-2');
    expect(ids.length).toBe(5);
  });

  it('Pi 4B is compatible with Pi-only HATs but not Arduino HATs', () => {
    const ids = hatsCompatibleWith('rpi-4b').map((h) => h.id);
    expect(ids).toContain('rpi-poe-plus');
    expect(ids).toContain('rpi-sense-hat');
    expect(ids).toContain('pimoroni-fan-shim');
    expect(ids).not.toContain('cqrobot-dmx-shield-max485');
    expect(ids).not.toContain('arduino-ethernet-shield-2');
  });

  it('Arduino GIGA R1 WiFi is compatible with both Arduino HATs', () => {
    const ids = hatsCompatibleWith('arduino-giga-r1-wifi').map((h) => h.id);
    expect(ids).toContain('cqrobot-dmx-shield-max485');
    expect(ids).toContain('arduino-ethernet-shield-2');
  });
});
