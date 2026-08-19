import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';
import { ServiceError } from '../models/service-error.model';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly isConfigured =
    this.isRealValue(environment.supabaseUrl) &&
    this.isRealValue(environment.supabasePublishableKey);

  private readonly instance: SupabaseClient | null = this.isConfigured
    ? createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  constructor() {
    if (!this.isConfigured) {
      console.warn(
        'Our Journey: configura supabaseUrl y supabasePublishableKey en src/environments antes de iniciar sesión.',
      );
    }
  }

  get client(): SupabaseClient {
    if (!this.instance) {
      throw new ServiceError('configuration', 'Supabase todavía no está configurado.');
    }

    return this.instance;
  }

  get clientOrNull(): SupabaseClient | null {
    return this.instance;
  }

  private isRealValue(value: string): boolean {
    return value.trim().length > 0 && !value.startsWith('YOUR_');
  }
}
