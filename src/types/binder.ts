export type BinderColor = 'navy' | 'crimson' | 'aqua' | 'onyx' | 'violet';

export type Binder = {
  id: string;
  name: string;
  color: BinderColor;
  slots: Record<string, string>;
  createdAt: string;
};
