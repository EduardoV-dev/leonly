import "@testing-library/jest-dom";

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
