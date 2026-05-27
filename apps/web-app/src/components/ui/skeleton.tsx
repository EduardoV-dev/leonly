import { mergeClassNames } from '@/utils/merge-class-names';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={mergeClassNames('animate-pulse rounded-md bg-muted', className)} />;
}
