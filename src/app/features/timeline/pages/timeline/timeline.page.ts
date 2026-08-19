import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ComingSoonComponent } from '../../../../shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-timeline-page',
  imports: [ComingSoonComponent],
  template: '<app-coming-soon title="Timeline" monogram="TL" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelinePage {}
