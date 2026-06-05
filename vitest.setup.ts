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

// ProseMirror (used by TipTap) calls getClientRects and
// getBoundingClientRect on contenteditable elements (and on
// descendant Text nodes), which jsdom doesn't fully implement.
// Polyfill them on Element.prototype AND on Text.prototype
// (Node.prototype) so PM's scrollToSelection / view updates
// don't throw "getClientRects is not a function" during tests.
const noopClientRects = {
  length: 0,
  item: (_index: number): DOMRect | null => null,
  [Symbol.iterator]: function* (): Generator<DOMRect> {
    // empty
  },
} as unknown as DOMRectList;

const noopRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: (): Record<string, never> => ({}),
} as DOMRect;

if (typeof Element !== "undefined") {
  if (!Element.prototype.getClientRects) {
    Element.prototype.getClientRects = function (): DOMRectList {
      return noopClientRects;
    };
  }
  if (!Element.prototype.getBoundingClientRect) {
    Element.prototype.getBoundingClientRect = function (): DOMRect {
      return noopRect;
    };
  }
}

if (typeof Text !== "undefined") {
  const textProto = Text.prototype as unknown as {
    getClientRects?: () => DOMRectList;
    getBoundingClientRect?: () => DOMRect;
  };
  if (!textProto.getClientRects) {
    textProto.getClientRects = function (): DOMRectList {
      return noopClientRects;
    };
  }
  if (!textProto.getBoundingClientRect) {
    textProto.getBoundingClientRect = function (): DOMRect {
      return noopRect;
    };
  }
}

// ProseMirror (used by TipTap) also calls getClientRects on
// Range objects via document.createRange() (see textRange() in
// prosemirror-view). JSDOM doesn't implement those either.
if (typeof Range !== "undefined") {
  const rangeProto = Range.prototype as unknown as {
    getClientRects?: () => DOMRectList;
    getBoundingClientRect?: () => DOMRect;
  };
  if (!rangeProto.getClientRects) {
    rangeProto.getClientRects = function (): DOMRectList {
      return noopClientRects;
    };
  }
  if (!rangeProto.getBoundingClientRect) {
    rangeProto.getBoundingClientRect = function (): DOMRect {
      return noopRect;
    };
  }
}

// TipTap's Placeholder extension calls document.elementFromPoint()
// to determine whether the editor is in the viewport. JSDOM does
// not implement it; polyfill to return null (treated as off-screen).
if (typeof document !== "undefined" && !document.elementFromPoint) {
  document.elementFromPoint = (): Element | null => null;
}
