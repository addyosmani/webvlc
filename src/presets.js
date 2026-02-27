import butterchurnPresets from 'butterchurn-presets';
import customPresets from '../custom-presets';

function buildPresets() {
  const presets = { ...customPresets, ...butterchurnPresets };
  const keys = Object.keys(presets).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const sorted = {};
  for (const k of keys) sorted[k] = presets[k];
  return sorted;
}

export const allPresets = buildPresets();
export const presetKeys = Object.keys(allPresets);
