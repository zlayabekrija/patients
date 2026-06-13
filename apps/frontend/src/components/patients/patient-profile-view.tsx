'use client';

import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/layout/app-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { getValidToken } from '@/lib/auth';
import { formatDateOnlyLabel } from '@/lib/date-only';

function formatTimestamp(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

export function PatientProfileView() {
  const profileQuery = useQuery({
    queryKey: ['patients', 'profile'],
    queryFn: () => api.getPatients({ limit: 1 }),
    enabled: Boolean(getValidToken()),
  });

  const patient = profileQuery.data?.data[0];

  return (
    <div className="min-h-full bg-background">
      <AppHeader />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">My profile</h2>
            <Badge variant="secondary">Patient</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            View your personal patient record.
          </p>
        </section>

        {profileQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Unable to load your profile. Please try again later.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>
              {profileQuery.isLoading ? (
                <Skeleton className="h-7 w-48" />
              ) : patient ? (
                `${patient.firstName} ${patient.lastName}`
              ) : (
                'No profile found'
              )}
            </CardTitle>
            <CardDescription>Your patient information</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {profileQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : null}

            {!profileQuery.isLoading && !patient ? (
              <p className="text-sm text-muted-foreground">
                No patient profile is linked to your account yet.
              </p>
            ) : null}

            {patient ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileField label="Email" value={patient.email} />
                  <ProfileField
                    label="Phone"
                    value={patient.phoneNumber ?? '—'}
                  />
                  <ProfileField
                    label="Date of birth"
                    value={formatDateOnlyLabel(patient.dob)}
                  />
                  <ProfileField
                    label="Member since"
                    value={formatTimestamp(patient.createdAt)}
                  />
                </div>
                <Separator />
                <ProfileField label="Patient ID" value={patient.id} />
              </>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
