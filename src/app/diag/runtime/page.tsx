export const dynamic = 'force-dynamic';

function DevOnly({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="p-6 text-sm text-gray-600">
        /diag/runtime is disabled outside development.
      </div>
    );
  }
  return <>{children}</>;
}

import ClientPane from './ClientPane';

export default function Page() {
  return (
    <DevOnly>
      <ClientPane />
    </DevOnly>
  );
}


