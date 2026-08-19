import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-memory-delete-dialog',
  templateUrl: './memory-delete-dialog.component.html',
  styleUrl: './memory-delete-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryDeleteDialogComponent {
  readonly memoryTitle = input.required<string>();
  readonly isDeleting = input(false);
  readonly error = input('');
  readonly canceled = output<void>();
  readonly confirmed = output<void>();

  @HostListener('document:keydown.escape')
  protected escape(): void {
    if (!this.isDeleting()) this.canceled.emit();
  }
}
