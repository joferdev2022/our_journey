import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { CreateMemory } from '../../../../core/models/memory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { MemoryService } from '../../../../core/services/memory.service';
import { MemoryFormComponent } from '../../components/memory-form/memory-form.component';

@Component({
  selector: 'app-new-memory-page',
  imports: [RouterLink, MemoryFormComponent],
  templateUrl: './new-memory.page.html',
  styleUrl: './new-memory.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewMemoryPage {
  private readonly memoryService = inject(MemoryService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly initialTripId = this.route.snapshot.queryParamMap.get('tripId');
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected async createMemory(memory: CreateMemory): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const authenticatedUser =
        this.auth.getCurrentUser() ?? (await this.auth.getSession())?.user ?? null;

      if (!authenticatedUser?.id) {
        this.saveError.set('Tu sesión ya no está disponible. Vuelve a iniciar sesión.');
        return;
      }

      const created = await this.memoryService.create(memory);
      await this.router.navigate(['/journey'], {
        queryParams: { created: created.id, memory: created.id },
      });
    } catch (error) {
      console.error('Our Journey: no se pudo guardar el recuerdo.', error);
      this.saveError.set('No pudimos guardar el recuerdo. Intenta nuevamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected cancel(): void {
    void this.router.navigate(['/admin']);
  }
}
