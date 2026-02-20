import useSWR from 'swr';
import type { ModuleToggles } from '@/types/database';

const DEFAULT_TOGGLES: ModuleToggles = {
  gestao: true,
  scripts: true,
  personalizados: true,
  buscar: true,
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useModuleToggles() {
  const { data, isLoading } = useSWR<ModuleToggles>(
    '/api/module-toggles',
    fetcher,
    {
      fallbackData: DEFAULT_TOGGLES,
      revalidateOnFocus: true,
      refreshInterval: 60_000,
    }
  );

  return {
    toggles: data ?? DEFAULT_TOGGLES,
    isLoading,
  };
}
