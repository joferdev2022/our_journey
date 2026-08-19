export type ServiceErrorCode =
  'configuration' | 'authentication' | 'not-found' | 'data-access' | 'storage';

export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ServiceError';
  }
}
