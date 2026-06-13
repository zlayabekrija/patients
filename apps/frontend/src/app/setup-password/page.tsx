import { Suspense } from 'react';
import { SetupPasswordPageContent } from '@/components/auth/setup-password-page-content';

export default function SetupPasswordPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_45%)] px-4 py-10">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading setup link...</p>
        }
      >
        <SetupPasswordPageContent />
      </Suspense>
    </div>
  );
}
