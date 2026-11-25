export type WorkroomErrorCode =
  | 'forbidden'
  | 'not_found'
  | 'invalid'
  | 'unauthenticated'
  | 'offline';

export class WorkroomError extends Error {
  readonly code: WorkroomErrorCode;

  constructor(message: string, code: WorkroomErrorCode) {
    super(message);
    this.name = 'WorkroomError';
    this.code = code;
  }
}

export function isWorkroomError(error: unknown): error is WorkroomError {
  return error instanceof WorkroomError;
}
