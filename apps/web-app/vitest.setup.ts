import "@testing-library/jest-dom";
import type { ImageProps } from "next/image";
import { createElement } from "react";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    src,
    unoptimized: _unoptimized,
    ...props
  }: ImageProps) => {
    let imageSource = src;
    if (typeof imageSource !== "string") {
      imageSource = "src" in imageSource ? imageSource.src : imageSource.default.src;
    }
    return createElement("img", {
      ...props,
      src: imageSource,
    });
  },
}));

class IntersectionObserverMock {
  disconnect() {}

  observe() {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve() {}
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  configurable: true,
  value: IntersectionObserverMock,
  writable: true,
});

Object.defineProperties(HTMLDialogElement.prototype, {
  close: {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
    writable: true,
  },
  showModal: {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
    writable: true,
  },
});
