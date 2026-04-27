import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore, clampPort } from '@/store/settingsStore';

describe('app settings', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
  });

  it('default port is 8000', () => {
    expect(useSettingsStore.getState().port).toBe(8000);
  });

  it('setPort persists a valid value', () => {
    useSettingsStore.getState().setPort(9000);
    expect(useSettingsStore.getState().port).toBe(9000);
  });

  it('setPort rejects out-of-range and falls back to default', () => {
    useSettingsStore.getState().setPort(70000);
    expect(useSettingsStore.getState().port).toBe(8000);
    useSettingsStore.getState().setPort(0);
    expect(useSettingsStore.getState().port).toBe(8000);
  });

  it('clampPort floors decimals and rejects non-numbers', () => {
    expect(clampPort(8080.7)).toBe(8080);
    expect(clampPort(NaN)).toBe(8000);
    expect(clampPort('1234' as unknown)).toBe(8000);
  });

  it('bindToAll defaults to false', () => {
    expect(useSettingsStore.getState().bindToAll).toBe(false);
    useSettingsStore.getState().setBindToAll(true);
    expect(useSettingsStore.getState().bindToAll).toBe(true);
  });
});
