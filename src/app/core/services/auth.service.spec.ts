import { TestBed } from '@angular/core/testing';
import { Session } from '@supabase/supabase-js';

import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

describe('AuthService', () => {
  const session = {
    user: { id: 'user-1', email: 'us@example.com' },
  } as Session;

  const getSession = vi.fn();
  const signInWithPassword = vi.fn();
  const signOut = vi.fn();
  const unsubscribe = vi.fn();

  beforeEach(() => {
    getSession.mockReset();
    signInWithPassword.mockReset();
    signOut.mockReset();
    unsubscribe.mockReset();

    getSession.mockResolvedValue({
      data: { session },
      error: null,
    });
    signInWithPassword.mockResolvedValue({
      data: { session },
      error: null,
    });
    signOut.mockResolvedValue({ error: null });

    const client = {
      auth: {
        getSession,
        signInWithPassword,
        signOut,
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe } },
        }),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            isConfigured: true,
            client,
            clientOrNull: client,
          },
        },
      ],
    });
  });

  it('restores the session and exposes the current user', async () => {
    const service = TestBed.inject(AuthService);

    expect(await service.getSession()).toBe(session);
    expect(service.getCurrentUser()?.id).toBe('user-1');
  });

  it('signs in with email and password', async () => {
    const service = TestBed.inject(AuthService);

    await expect(service.signIn(' us@example.com ', 'secret')).resolves.toBe(session);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'us@example.com',
      password: 'secret',
    });
  });

  it('does not expose raw authentication failures', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'provider detail' },
    });
    const service = TestBed.inject(AuthService);

    await expect(service.signIn('us@example.com', 'wrong')).rejects.toMatchObject({
      code: 'authentication',
      message: 'No pudimos iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.',
    });
  });
});
