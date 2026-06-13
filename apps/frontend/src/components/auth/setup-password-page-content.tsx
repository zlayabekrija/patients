'use client';

import { useSearchParams } from 'next/navigation';
import { SetupPasswordForm } from '@/components/auth/setup-password-form';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function SetupPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Missing setup link</CardTitle>
          <CardDescription>
            Open the password setup link from your email to continue.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <SetupPasswordForm token={token} />;
}
