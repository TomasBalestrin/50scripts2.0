import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingPage from '@/app/(onboarding)/onboarding/page';
import {
  BUSINESS_ROLES,
  BUSINESS_TYPES,
  FATURAMENTO_OPTIONS,
  MAIN_CHALLENGES,
  TIME_KNOWING_CLEITON_OPTIONS,
} from '@/lib/onboarding/options';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const choose = (placeholder: string, option: string) => {
  fireEvent.click(screen.getByText(placeholder));
  fireEvent.click(screen.getByText(option));
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));

describe('OnboardingPage — fluxo completo', () => {
  beforeEach(() => {
    push.mockClear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) }));
  });

  it('preenche os 3 passos e envia só valores das listas novas', async () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));

    // Passo 1: só avança com tudo válido
    const proximo = () => screen.getByRole('button', { name: 'Próximo' }) as HTMLButtonElement;
    expect(proximo().disabled).toBe(true);
    type(/Nome completo/, 'Maria Souza');
    type(/Telefone/, '49999123456');
    type(/Email/, 'maria@email.com');
    expect(proximo().disabled).toBe(true); // falta Instagram
    type(/Instagram/, '@maria');
    expect((screen.getByLabelText(/Telefone/) as HTMLInputElement).value).toBe('(49) 99912-3456');
    expect(proximo().disabled).toBe(false);
    next();

    // Passo 2: tudo múltipla escolha ou texto
    expect(screen.getByText('Passo 2 de 3')).toBeTruthy();
    type(/Nome da empresa/, 'Clínica Maria');
    choose('Selecione seu tipo de negócio', BUSINESS_TYPES[2]);
    choose('Selecione sua função', BUSINESS_ROLES[1]);
    choose('Selecione sua faixa de faturamento', FATURAMENTO_OPTIONS[2]);
    type(/Público-alvo/, 'Mulheres de 30 a 50');
    expect(proximo().disabled).toBe(true); // falta objeções
    type(/Principais objeções/, 'Preço');
    expect(proximo().disabled).toBe(false);
    next();

    // Passo 3
    expect(screen.getByText('Passo 3 de 3')).toBeTruthy();
    const finalizar = () => screen.getByRole('button', { name: 'Finalizar' }) as HTMLButtonElement;
    expect(finalizar().disabled).toBe(true);
    choose('Selecione seu principal desafio', MAIN_CHALLENGES[1]);
    choose('Selecione uma opção', TIME_KNOWING_CLEITON_OPTIONS[4]);
    expect(finalizar().disabled).toBe(false);
    fireEvent.click(finalizar());

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toMatchObject({
      business_type: BUSINESS_TYPES[2],
      role_in_business: BUSINESS_ROLES[1],
      faturamento_mensal: FATURAMENTO_OPTIONS[2],
      main_challenges: [MAIN_CHALLENGES[1]],
      time_knowing_cleiton: TIME_KNOWING_CLEITON_OPTIONS[4],
    });
  });

  it('mostra erro de telefone só depois de tocar o campo', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    type(/Telefone/, '4999');
    expect(screen.queryByText(/telefone válido/)).toBeNull();
    fireEvent.blur(screen.getByLabelText(/Telefone/));
    expect(screen.getByText(/telefone válido/)).toBeTruthy();
  });

  it('mostra erro da API sem sair da tela', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    type(/Nome completo/, 'Maria Souza');
    type(/Telefone/, '49999123456');
    type(/Email/, 'maria@email.com');
    type(/Instagram/, '@maria');
    next();
    type(/Nome da empresa/, 'X');
    choose('Selecione seu tipo de negócio', BUSINESS_TYPES[0]);
    choose('Selecione sua função', BUSINESS_ROLES[0]);
    choose('Selecione sua faixa de faturamento', FATURAMENTO_OPTIONS[0]);
    type(/Público-alvo/, 'A');
    type(/Principais objeções/, 'B');
    next();
    choose('Selecione seu principal desafio', MAIN_CHALLENGES[0]);
    choose('Selecione uma opção', TIME_KNOWING_CLEITON_OPTIONS[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    await waitFor(() => expect(screen.getByText('Sessão expirada. Faça login novamente.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
