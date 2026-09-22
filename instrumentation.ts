export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (typeof globalThis.DOMMatrix === 'undefined') {
      globalThis.DOMMatrix = class DOMMatrix {} as any;
    }
    if (typeof globalThis.Path2D === 'undefined') {
      globalThis.Path2D = class Path2D {} as any;
    }
  }
}
