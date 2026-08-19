import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-journey-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './journey-shell.component.html',
  styleUrl: './journey-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly signOutError = signal<string | null>(null);

  protected async signOut(): Promise<void> {
    this.signOutError.set(null);

    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    } catch {
      this.signOutError.set('No pudimos cerrar la sesión.');
    }
  }
}
