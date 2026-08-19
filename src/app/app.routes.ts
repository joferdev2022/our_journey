import { Routes } from '@angular/router';

import { environment } from '../environments/environment';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  ...(environment.production
    ? []
    : [
        {
          path: 'debug-map',
          title: 'Diagnóstico MapLibre · Our Journey',
          loadComponent: () =>
            import('./features/debug/debug-map/debug-map.page').then(
              (component) => component.DebugMapPage,
            ),
        },
      ]),
  {
    path: 'login',
    title: 'Ingresar · Our Journey',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.page').then((component) => component.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/journey/layout/journey-shell/journey-shell.component').then(
        (component) => component.JourneyShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'journey' },
      {
        path: 'journey',
        title: 'Our Journey',
        loadComponent: () =>
          import('./features/journey/pages/journey/journey.page').then(
            (component) => component.JourneyPage,
          ),
      },
      {
        path: 'memories',
        title: 'Recuerdos · Our Journey',
        loadComponent: () =>
          import('./features/memories/pages/memories/memories.page').then(
            (component) => component.MemoriesPage,
          ),
      },
      {
        path: 'memories/:id',
        title: 'Detalle del recuerdo · Our Journey',
        loadComponent: () =>
          import('./features/memories/pages/memory-detail/memory-detail.page').then(
            (component) => component.MemoryDetailPage,
          ),
      },
      {
        path: 'trips',
        title: 'Viajes · Our Journey',
        loadComponent: () =>
          import('./features/trips/pages/trips/trips.page').then(
            (component) => component.TripsPage,
          ),
      },
      {
        path: 'trips/:id',
        title: 'Detalle del viaje · Our Journey',
        loadComponent: () =>
          import('./features/trips/pages/trip-detail/trip-detail.page').then(
            (component) => component.TripDetailPage,
          ),
      },
      {
        path: 'timeline',
        title: 'Timeline · Our Journey',
        loadComponent: () =>
          import('./features/timeline/pages/timeline/timeline.page').then(
            (component) => component.TimelinePage,
          ),
      },
      {
        path: 'admin/memories/:id/edit',
        title: 'Editar recuerdo · Our Journey',
        loadComponent: () =>
          import('./features/admin/pages/edit-memory/edit-memory.page').then(
            (component) => component.EditMemoryPage,
          ),
      },
      {
        path: 'admin/memories/:id/photos',
        title: 'Fotografías del recuerdo · Our Journey',
        loadComponent: () =>
          import('./features/admin/pages/memory-photos/memory-photos.page').then(
            (component) => component.MemoryPhotosPage,
          ),
      },
      {
        path: 'admin/memories/new',
        title: 'Nuevo recuerdo · Our Journey',
        loadComponent: () =>
          import('./features/admin/pages/new-memory/new-memory.page').then(
            (component) => component.NewMemoryPage,
          ),
      },
      {
        path: 'admin/trips/new',
        title: 'Nuevo viaje · Our Journey',
        loadComponent: () =>
          import('./features/trips/pages/new-trip/new-trip.page').then(
            (component) => component.NewTripPage,
          ),
      },
      {
        path: 'admin/trips/:id/edit',
        title: 'Editar viaje · Our Journey',
        loadComponent: () =>
          import('./features/trips/pages/edit-trip/edit-trip.page').then(
            (component) => component.EditTripPage,
          ),
      },
      {
        path: 'admin/trips',
        title: 'Administrar viajes · Our Journey',
        loadComponent: () =>
          import('./features/trips/pages/admin-trips/admin-trips.page').then(
            (component) => component.AdminTripsPage,
          ),
      },
      {
        path: 'admin',
        title: 'Administración · Our Journey',
        loadComponent: () =>
          import('./features/admin/pages/admin/admin.page').then(
            (component) => component.AdminPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
