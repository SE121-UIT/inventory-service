import { Transaction } from 'sequelize';
import { sequelize } from '../configs/sequelize';
import { ProductItem } from '../core/messageBroker';
import { Inventory } from '../models';
import { update } from '../core/commandHandling';
import { getEventStore } from '../core/streams';
import { deductQuantityProduct, toInventoryStreamName } from '../inventory/inventory';

export enum CartErrors {
  PRODUCTS_NOT_AVAILABLE = 'PRODUCTS_NOT_AVAILABLE',
  PRODUCT_ID_IN_CART_INVALID = 'PRODUCT_ID_IN_CART_INVALID',
}

const isInventoryAvailable = (
  productListInventory: Inventory[],
  productItems: ProductItem[]
): boolean => {
  let isValid = true;
  productListInventory.forEach((availableItem) => {
    const requiredQuantity = findProduct(productItems, availableItem.productId).quantity;
    if (availableItem.quantity < requiredQuantity) {
      isValid = false;
      return;
    }
  });

  return isValid;
};

const findProduct = (productItems: ProductItem[], productId: string): ProductItem => {
  return productItems.find((item) => item.productId === productId)!;
};

const deductInventory = async (
  t: Transaction,
  productList: Inventory[],
  productItems: ProductItem[]
): Promise<void> => {
  for (const productItem of productList) {
    const requiredQuantity = findProduct(productItems, productItem.productId).quantity;

    const streamName = toInventoryStreamName(productItem.productId);

    await update(getEventStore(), deductQuantityProduct)(streamName, {
      productId: productItem.productId,
      quantity: requiredQuantity,
    });
  }
};

export const deductInventoryFromCart = async (
  productItems: ProductItem[]
): Promise<{ message: string; result: boolean }> => {
  const t = await sequelize.transaction();

  try {
    let message = 'Success';

    const productList = await Inventory.findAll({
      where: {
        productId: productItems.map((item) => item.productId),
      },
      raw: true,
      transaction: t,
    });

    if (productList.length < productItems.length) {
      message = CartErrors.PRODUCT_ID_IN_CART_INVALID;
      return { message, result: false };
    }

    const result = isInventoryAvailable(productList, productItems);

    if (result) {
      await deductInventory(t, productList, productItems);
    } else {
      message = CartErrors.PRODUCTS_NOT_AVAILABLE;
    }

    await t.commit();
    return { message, result };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};
