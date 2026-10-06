import { EmptyState } from './EmptyState';

type Props = {
  message: string;
  onRetry: () => void;
  title?: string;
  bottomInset?: number;
};

export function ErrorState({ message, onRetry, title = 'Something went wrong', bottomInset }: Props) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      tone="danger"
      title={title}
      message={message}
      bottomInset={bottomInset}
      action={{ label: 'Try again', onPress: onRetry, icon: 'refresh' }}
    />
  );
}
