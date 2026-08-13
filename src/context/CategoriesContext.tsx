import React, { createContext, useContext } from 'react';
import {
  useCategories as useCategoriesController,
  UseCategoriesReturn,
} from '../hooks/useCategories';

const CategoriesContext = createContext<UseCategoriesReturn | null>(null);

// Instancia única de useCategories para toda la app: evita que pantallas que se
// muestran simultáneamente (ej. HomePage + el panel de categorías encima) disparen
// cada una su propia copia de las queries (incluida la que hace polling cada 30s).
export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const value = useCategoriesController();
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): UseCategoriesReturn {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return ctx;
}
