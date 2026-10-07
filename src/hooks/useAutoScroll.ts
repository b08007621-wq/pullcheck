import { useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type Scrollable = {
  scrollTo?: (options: { y: number; animated: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated: boolean }) => void;
};

export class AutoScroller {
  private target: Scrollable | null = null;
  private offset = 0;
  private content = 0;
  private viewport = 0;

  attach = (target: Scrollable | null) => {
    this.target = target;
  };

  onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.offset = event.nativeEvent.contentOffset.y;
    this.content = event.nativeEvent.contentSize.height;
    this.viewport = event.nativeEvent.layoutMeasurement.height;
  };

  onLayout = (event: LayoutChangeEvent) => {
    this.viewport = event.nativeEvent.layout.height;
  };

  onContentSizeChange = (_: number, height: number) => {
    this.content = height;
  };

  scrollBy = (dy: number): number => {
    const target = this.target;
    if (!target) return 0;
    const max = Math.max(0, this.content - this.viewport);
    const next = Math.min(Math.max(this.offset + dy, 0), max);
    const applied = next - this.offset;
    if (Math.abs(applied) < 0.5) return 0;
    this.offset = next;
    if (target.scrollToOffset) target.scrollToOffset({ offset: next, animated: false });
    else target.scrollTo?.({ y: next, animated: false });
    return applied;
  };
}

export function useAutoScroll(): AutoScroller {
  const [scroller] = useState(() => new AutoScroller());
  return scroller;
}
