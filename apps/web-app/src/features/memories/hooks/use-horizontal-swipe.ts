import { type MouseEventHandler, type PointerEventHandler, useRef } from "react";

const MINIMUM_SWIPE_DISTANCE = 48;

type UseHorizontalSwipeOptions = {
  isEnabled: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

type HorizontalSwipeHandlers = {
  onClickCapture: MouseEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
};

type SwipeStart = {
  pointerId: number;
  x: number;
  y: number;
};

export function useHorizontalSwipe({
  isEnabled,
  onSwipeLeft,
  onSwipeRight,
}: UseHorizontalSwipeOptions): HorizontalSwipeHandlers {
  const swipeStart = useRef<SwipeStart | null>(null);
  const shouldSuppressClick = useRef(false);

  const handlePointerDown: PointerEventHandler<HTMLElement> = (event) => {
    shouldSuppressClick.current = false;
    if (!isEnabled || event.button !== 0) {
      return;
    }

    swipeStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp: PointerEventHandler<HTMLElement> = (event) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    if (
      Math.abs(horizontalDistance) < MINIMUM_SWIPE_DISTANCE ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    ) {
      return;
    }

    shouldSuppressClick.current = true;
    if (horizontalDistance < 0) {
      onSwipeLeft();
    } else {
      onSwipeRight();
    }
  };

  const handlePointerCancel = () => {
    swipeStart.current = null;
  };

  const handleClickCapture: MouseEventHandler<HTMLElement> = (event) => {
    if (!shouldSuppressClick.current) {
      return;
    }

    shouldSuppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    onClickCapture: handleClickCapture,
    onPointerCancel: handlePointerCancel,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
  };
}
