'use client';

import { LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/providers';
import { useTheme } from '@/hooks/use-theme';

export function AppHeader() {
  const { user, logout } = useAuth();
  const { isDark, followsSystem, toggleTheme, useSystemTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Patients</p>
          <h1 className="text-lg font-semibold tracking-tight">
            Management System
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label={
              followsSystem
                ? 'Toggle theme (currently following system preference)'
                : 'Toggle theme'
            }
            title={
              followsSystem
                ? 'Following system color scheme'
                : `Using ${isDark ? 'dark' : 'light'} theme`
            }
          >
            {followsSystem ? (
              <Monitor className="size-4" />
            ) : isDark ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>

          {!followsSystem ? (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={useSystemTheme}
            >
              Use system's
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="gap-2">
                  <UserRound className="size-4" />
                  <span className="hidden sm:inline">{user?.email}</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-1">
                <p className="text-sm font-medium">{user?.email}</p>
                <Badge variant="secondary" className="capitalize">
                  {user?.role}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
