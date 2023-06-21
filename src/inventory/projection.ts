import { sequelize } from '../configs/sequelize';
import { SubscriptionResolvedEvent } from '../core/subscriptions';
import { Inventory } from '../models';
import {
  InventoryErrors,
  isInventoryEvent,
  ProductCreated,
  ProductAddQuantity,
  ProductDeductQuantity,
  ProductDeleted,
  ProductUpdateInfo,
  InventoryStatus,
} from './inventory';
import { addQuantity, deductQuantity } from './productItem';
import createError from 'http-errors';

export const projectToInventory = (resolvedEvent: SubscriptionResolvedEvent): Promise<void> => {
  if (resolvedEvent.event === undefined || !isInventoryEvent(resolvedEvent.event))
    return Promise.resolve();

  const { event } = resolvedEvent;
  const streamRevision = Number(event.revision);

  switch (event.type) {
    case 'product-created':
      return projectProductCreated(event, streamRevision);
    case 'product-add-quantity':
      return projectProductAddQuantity(event, streamRevision);
    case 'product-deduct-quantity':
      return projectProductDeductQuantity(event, streamRevision);
    case 'product-deleted':
      return projectProductDeleted(event, streamRevision);
    case 'product-update-info':
      return projectProductUpdateInfo(event, streamRevision);

    default: {
      const _: never = event;
      throw createError.InternalServerError(InventoryErrors.UNKNOWN_EVENT_TYPE);
    }
  }
};

export const projectProductCreated = async (
  event: ProductCreated,
  streamRevision: number
): Promise<void> => {
  await Inventory.create({
    productId: event.data.productId,
    price: event.data.price,
    name: event.data.name,
    desc: event.data.desc,
    quantity: event.data.quantity,
    revision: streamRevision,
    status: InventoryStatus.Available,
  });
};

export const projectProductAddQuantity = async (
  event: ProductAddQuantity,
  streamRevision: number
): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const lastRevision = streamRevision - 1;
    const product = await Inventory.findOne({
      where: {
        productId: event.data.productId,
        revision: lastRevision,
      },
      transaction: t,
    });

    if (!product) {
      throw createError.NotFound(InventoryErrors.PRODUCT_NOT_FOUND);
    }

    const { revision, quantity } = product;

    if (revision > lastRevision) return;

    await Inventory.update(
      {
        revision: streamRevision,
        quantity: addQuantity(quantity, event.data.quantity),
      },
      {
        where: {
          productId: event.data.productId,
          revision: lastRevision,
        },
        transaction: t,
      }
    );

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const projectProductDeductQuantity = async (
  event: ProductDeductQuantity,
  streamRevision: number
): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const lastRevision = streamRevision - 1;
    const product = await Inventory.findOne({
      where: {
        productId: event.data.productId,
        revision: lastRevision,
      },
      transaction: t,
    });

    if (!product) {
      throw createError.NotFound(InventoryErrors.PRODUCT_NOT_FOUND);
    }

    const { revision, quantity } = product;

    if (revision > lastRevision) return;

    await Inventory.update(
      {
        revision: streamRevision,
        quantity: deductQuantity(quantity, event.data.quantity),
      },
      {
        where: {
          productId: event.data.productId,
          revision: lastRevision,
        },
        transaction: t,
      }
    );

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const projectProductDeleted = async (
  event: ProductDeleted,
  streamRevision: number
): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const lastRevision = streamRevision - 1;
    const product = await Inventory.findOne({
      where: {
        productId: event.data.productId,
        revision: lastRevision,
      },
      transaction: t,
    });

    if (!product) {
      throw createError.NotFound(InventoryErrors.PRODUCT_NOT_FOUND);
    }

    const { revision } = product;

    if (revision > lastRevision) return;

    await Inventory.destroy({
      where: {
        productId: event.data.productId,
      },
    });

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const projectProductUpdateInfo = async (
  event: ProductUpdateInfo,
  streamRevision: number
): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const lastRevision = streamRevision - 1;
    const product = await Inventory.findOne({
      where: {
        productId: event.data.productId,
        revision: lastRevision,
      },
      transaction: t,
    });

    if (!product) {
      throw createError.NotFound(InventoryErrors.PRODUCT_NOT_FOUND);
    }

    const { revision } = product;

    if (revision > lastRevision) return;

    await Inventory.update(
      {
        name: event.data.name,
        desc: event.data.desc,
        price: event.data.price,
        revision: streamRevision,
      },
      {
        where: {
          productId: event.data.productId,
        },
      }
    );

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
