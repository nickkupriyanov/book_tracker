import "@testing-library/jest-dom/vitest";

// Radix UI uses pointer events (e.g. hasPointerCapture) that jsdom doesn't
// implement. Polyfill the no-op versions on Element.prototype so Radix
// components don't throw "hasPointerCapture is not a function" during tests.
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = (): boolean => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = (): void => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = (): void => {};
  }
}
