import { InventoryErrors } from './inventory';
import createError from 'http-errors';

export const addQuantity = (currentQuantity: number, addedQuantity: number): number => {
  return currentQuantity + addedQuantity;
};

export const deductQuantity = (currentQuantity: number, deductQuantity: number): number => {
  return assertProductExists(currentQuantity, deductQuantity);
};

export const assertProductExists = (currentQuantity: number, deductQuantity: number) => {
  if (currentQuantity < deductQuantity) {
    throw createError.Conflict(InventoryErrors.PRODUCT_NOT_ENOUGH);
  }

  const newQuantity = currentQuantity - deductQuantity;

  return newQuantity;
};
