const KEY = 'sn.location';

export function readLocation() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { label: '', city: '', lat: '', lng: '' };
  } catch {
    return { label: '', city: '', lat: '', lng: '' };
  }
}

export function saveLocation(value) {
  localStorage.setItem(KEY, JSON.stringify(value));
}
