'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { setAuth } from '@/lib/auth';

const setupPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SetupPasswordFormValues = z.infer<typeof setupPasswordSchema>;

type SetupPasswordFormProps = {
  token: string;
};

export function SetupPasswordForm({ token }: SetupPasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupPasswordFormValues>({
    resolver: zodResolver(setupPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function validateToken() {
      try {
        const result = await api.validateSetupToken(token);
        if (!cancelled) {
          setAccountEmail(result.email);
          setFirstName(result.firstName);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('This setup link is invalid or has expired.');
          }
        }
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    }

    void validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    try {
      const response = await api.setupPassword(token, values.password);
      setAuth(response.token, response.user);
      router.replace('/patients');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to set your password. Please try again.');
      }
    }
  });

  if (isValidating) {
    return (
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Set up your password</CardTitle>
          <CardDescription>Checking your setup link...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!accountEmail) {
    return (
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Link unavailable</CardTitle>
          <CardDescription>
            This password setup link is invalid or has already been used.
          </CardDescription>
        </CardHeader>
        {error ? (
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/60 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Set up your password</CardTitle>
        <CardDescription>
          Hi {firstName}, create a password for {accountEmail} to access your
          patient profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving password...' : 'Set password and sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
