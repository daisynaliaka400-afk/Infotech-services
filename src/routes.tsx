import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  public?: boolean;
}

export const routes: RouteConfig[] = [];
