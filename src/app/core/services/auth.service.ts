import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { ServiceError } from '../models/service-error.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionState = signal<Session | null>(null);
  private readonly initialization: Promise<void>;

  readonly session = this.sessionState.asReadonly();
  readonly currentUser = computed(() => this.sessionState()?.user ?? null);
  readonly isConfigured = this.supabase.isConfigured;

  constructor() {
    const client = this.supabase.clientOrNull;

    if (!client) {
      this.initialization = Promise.resolve();
      return;
    }

    this.initialization = this.loadInitialSession(client);

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      this.sessionState.set(session);
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  async signIn(email: string, password: string): Promise<Session> {
    const client = this.requireClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      throw new ServiceError(
        'authentication',
        'No pudimos iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.',
        error ? { cause: error } : undefined,
      );
    }

    this.sessionState.set(data.session);
    return data.session;
  }

  async signOut(): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw new ServiceError('authentication', 'No pudimos cerrar la sesión. Inténtalo de nuevo.', {
        cause: error,
      });
    }

    this.sessionState.set(null);
  }

  async getSession(): Promise<Session | null> {
    const client = this.supabase.clientOrNull;

    if (!client) {
      return null;
    }

    await this.initialization;
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw new ServiceError('authentication', 'No pudimos verificar la sesión actual.', {
        cause: error,
      });
    }

    this.sessionState.set(data.session);
    return data.session;
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  private async loadInitialSession(client: SupabaseClient): Promise<void> {
    const { data, error } = await client.auth.getSession();

    if (error) {
      console.warn('Our Journey: no se pudo restaurar la sesión guardada.');
      return;
    }

    this.sessionState.set(data.session);
  }

  private requireClient(): SupabaseClient {
    return this.supabase.client;
  }
}
