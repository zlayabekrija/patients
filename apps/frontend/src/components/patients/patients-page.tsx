'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/layout/app-header';
import { PatientDetailsDialog } from '@/components/patients/patient-details-dialog';
import { api, ApiError } from '@/lib/api';
import { getValidToken } from '@/lib/auth';
import { PatientFormDialog } from '@/components/patients/patient-form-dialog';
import { PatientProfileView } from '@/components/patients/patient-profile-view';
import { useAuth } from '@/components/providers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateOnlyLabel } from '@/lib/date-only';
import type { PatientFormValues } from '@/lib/patient-validation';
import type { Patient, PatientsQuery } from '@/types';

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

function toPayload(values: PatientFormValues) {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phoneNumber: values.phoneNumber || undefined,
    dob: values.dob || undefined,
  };
}

export function PatientsPage() {
  const { isAdmin, isLoading, user } = useAuth();

  if (isLoading || !user) {
    return <PatientsPageLoading />;
  }

  if (!isAdmin) {
    return <PatientProfileView />;
  }

  return <PatientsAdminView />;
}

function PatientsPageLoading() {
  return (
    <div className="min-h-full bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </main>
    </div>
  );
}

function PatientsAdminView() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] =
    useState<PatientsQuery['sortBy']>('lastName');
  const [sortOrder, setSortOrder] =
    useState<PatientsQuery['sortOrder']>('asc');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [detailsPatient, setDetailsPatient] = useState<Patient | null>(null);

  const query = useMemo(
    () => ({
      page,
      limit: 10,
      search: search.trim() || undefined,
      sortBy,
      sortOrder,
    }),
    [page, search, sortBy, sortOrder],
  );

  const patientsQuery = useQuery({
    queryKey: ['patients', query],
    queryFn: () => api.getPatients(query),
    placeholderData: (previous) => previous,
    enabled: Boolean(getValidToken()),
  });

  const createMutation = useMutation({
    mutationFn: api.createPatient,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      const previous = queryClient.getQueriesData({ queryKey: ['patients'] });
      const optimisticPatient: Patient = {
        id: `temp-${Date.now()}`,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phoneNumber: input.phoneNumber ?? null,
        dob: input.dob ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueriesData<{ data: Patient[]; total: number }>(
        { queryKey: ['patients'] },
        (current) =>
          current
            ? {
                ...current,
                data: [optimisticPatient, ...current.data].slice(0, current.data.length),
                total: current.total + 1,
              }
            : current,
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      toast.error('Failed to create patient');
    },
    onSuccess: () => {
      toast.success('Patient created');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PatientFormValues> }) =>
      api.updatePatient(id, toPayload(data as PatientFormValues)),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      const previous = queryClient.getQueriesData({ queryKey: ['patients'] });

      queryClient.setQueriesData<{ data: Patient[] }>(
        { queryKey: ['patients'] },
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((patient) =>
                  patient.id === id
                    ? {
                        ...patient,
                        ...toPayload(data as PatientFormValues),
                        phoneNumber:
                          data.phoneNumber === ''
                            ? null
                            : (data.phoneNumber ?? patient.phoneNumber),
                        dob: data.dob || patient.dob,
                        updatedAt: new Date().toISOString(),
                      }
                    : patient,
                ),
              }
            : current,
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      toast.error('Failed to update patient');
    },
    onSuccess: () => {
      toast.success('Patient updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deletePatient,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      const previous = queryClient.getQueriesData({ queryKey: ['patients'] });

      queryClient.setQueriesData<{ data: Patient[]; total: number }>(
        { queryKey: ['patients'] },
        (current) =>
          current
            ? {
                ...current,
                data: current.data.filter((patient) => patient.id !== id),
                total: Math.max(0, current.total - 1),
              }
            : current,
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      toast.error('Failed to delete patient');
    },
    onSuccess: () => {
      toast.success('Patient deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const totalPages = patientsQuery.data
    ? Math.max(1, Math.ceil(patientsQuery.data.total / patientsQuery.data.limit))
    : 1;

  const toggleSort = (column: PatientsQuery['sortBy']) => {
    if (sortBy === column) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setSortOrder('asc');
  };

  const handleSave = async (values: PatientFormValues) => {
    try {
      if (editingPatient) {
        await updateMutation.mutateAsync({
          id: editingPatient.id,
          data: values,
        });
      } else {
        await createMutation.mutateAsync(toPayload(values));
      }
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      }
      throw error;
    }
  };

  return (
    <div className="min-h-full bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">Patients</h2>
              <Badge variant="secondary">
                {isAdmin ? 'Admin access' : 'View only'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Search, sort, and manage patient records.
            </p>
          </div>

          {isAdmin ? (
            <Button
              onClick={() => {
                setEditingPatient(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add patient
            </Button>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search patients..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort('lastName')}
            >
              Last name
              {sortBy === 'lastName' && sortOrder === 'asc' ? (
                <ArrowDownAZ className="size-4" />
              ) : (
                <ArrowUpAZ className="size-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort('dateOfBirth')}
            >
              DOB
            </Button>
          </div>
        </section>

        {patientsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Unable to load patients. The API may be temporarily unavailable.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patientsQuery.isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : null}

              {!patientsQuery.isLoading &&
              patientsQuery.data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <p className="font-medium">No patients found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or add a new patient.
                    </p>
                  </TableCell>
                </TableRow>
              ) : null}

              {patientsQuery.data?.data.map((patient) => (
                <TableRow key={patient.id} className="transition-colors">
                  <TableCell className="font-medium">
                    <div>
                      <p>
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {patient.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {patient.email}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {patient.phoneNumber ?? '—'}
                  </TableCell>
                  <TableCell>{formatDateOnlyLabel(patient.dob)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="View patient"
                        onClick={() => setDetailsPatient(patient)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {isAdmin ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit patient"
                            onClick={() => {
                              setEditingPatient(patient);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete patient"
                            onClick={() => deleteMutation.mutate(patient.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
            {patientsQuery.data ? ` · ${patientsQuery.data.total} total` : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </main>

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editingPatient}
        title={editingPatient ? 'Edit patient' : 'Add patient'}
        description={
          editingPatient
            ? 'Update the patient record and save your changes.'
            : 'Create a new patient record in the system.'
        }
        onSubmit={handleSave}
      />

      <PatientDetailsDialog
        patient={detailsPatient}
        open={Boolean(detailsPatient)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsPatient(null);
          }
        }}
      />
    </div>
  );
}
