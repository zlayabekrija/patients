'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatDateOnlyLabel } from '@/lib/date-only';
import type { Patient } from '@/types';

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

type PatientDetailsDialogProps = {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PatientDetailsDialog({
  patient,
  open,
  onOpenChange,
}: PatientDetailsDialogProps) {
  if (!patient) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {patient.firstName} {patient.lastName}
          </DialogTitle>
          <DialogDescription>Full patient record</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Email" value={patient.email} />
            <DetailItem label="Phone" value={patient.phoneNumber ?? '—'} />
            <DetailItem label="Date of birth" value={formatDateOnlyLabel(patient.dob)} />
            <DetailItem label="Created" value={formatTimestamp(patient.createdAt)} />
          </div>
          <Separator />
          <DetailItem label="Patient ID" value={patient.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
