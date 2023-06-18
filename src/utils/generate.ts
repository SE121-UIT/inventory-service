import { v4 as uuid } from 'uuid';

export const generateCorrelationId = (): string => {
  return uuid();
};
