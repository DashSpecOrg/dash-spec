import { DemoContent } from '../demo-content';

export const dynamic = 'force-dynamic';

type DemoPageProps = {
  searchParams?: Promise<{
    dashboard?: string;
  }>;
};

export default function DemoPage(props: DemoPageProps) {
  return <DemoContent {...props} />;
}
