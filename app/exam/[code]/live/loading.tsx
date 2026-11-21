import { PageLoader } from '@/components/PageLoader';

export default function LiveExamLoading() {
  return (
    <PageLoader
      fullScreen
      title="Preparing your exam…"
      subtitle="Please don't refresh or close this window"
    />
  );
}
