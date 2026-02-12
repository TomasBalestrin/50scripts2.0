/**
 * SWR fetcher for API routes
 * Throws on non-ok responses so SWR handles error state
 */
export class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
  }
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new FetchError(`Erro ao carregar dados (${res.status})`, res.status);
  }
  return res.json();
}
