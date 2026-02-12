/**
 * SWR fetcher for API routes
 * Throws on non-ok responses so SWR handles error state
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('Erro ao carregar dados');
    throw error;
  }
  return res.json();
}
