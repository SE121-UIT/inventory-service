import { JSONEventType, ResolvedEvent, StreamingRead } from '@eventstore/db-client';
import { StreamAggregator } from '../core/streams';
import { addQuantity, assertProductExists, deductQuantity } from './productItem';
import createError from 'http-errors';

export type ProductCreated = JSONEventType<
  'product-created',
  {
    productId: string;
    quantity: number;
    name: string;
    price: number;
    desc?: string;
    createdAt: Date;
  }
>;

export type ProductDeleted = JSONEventType<
  'product-deleted',
  {
    productId: string;
  }
>;

export type ProductAddQuantity = JSONEventType<
  'product-add-quantity',
  {
    productId: string;
    quantity: number;
  }
>;

export type ProductDeductQuantity = JSONEventType<
  'product-deduct-quantity',
  {
    productId: string;
    quantity: number;
  }
>;

export type ProductUpdateInfo = JSONEventType<
  'product-update-info',
  {
    productId: string;
    name?: string;
    price?: number;
    desc?: string;
  }
>;

export type InventoryEvent =
  | ProductCreated
  | ProductDeleted
  | ProductAddQuantity
  | ProductDeductQuantity
  | ProductUpdateInfo;

//////////////////////////////////////
/// Entity/State
//////////////////////////////////////

export const enum InventoryStatus {
  Available = 1,
  OutOfStock = 2,
  StopProvider = 3,
  Deleted = 4,
}

export interface InventoryEntity {
  productId: string;
  name: string;
  price: number;
  desc?: string;
  quantity: number;
  status: InventoryStatus;
  createdAt: Date;
  lastUpdated: Date;
}

export const isInventoryEvent = (event: unknown): event is InventoryEvent => {
  return (
    event != null &&
    ((event as InventoryEvent).type === 'product-created' ||
      (event as InventoryEvent).type === 'product-deleted' ||
      (event as InventoryEvent).type === 'product-add-quantity' ||
      (event as InventoryEvent).type === 'product-deduct-quantity' ||
      (event as InventoryEvent).type === 'product-update-info')
  );
};

export const toInventoryStreamName = (productId: string) => `inventory-${productId}`;

export const enum InventoryErrors {
  CREATED_EXISTING_PRODUCT = 'CREATED_EXISTING_PRODUCT',
  INVENTORY_NOT_FOUND = 'INVENTORY_NOT_FOUND',
  PRODUCT_NOT_ENOUGH = 'PRODUCT_NOT_ENOUGH',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_IS_ALREADY_DELETED = 'PRODUCT_IS_ALREADY_DELETED',
  UNKNOWN_EVENT_TYPE = 'UNKNOWN_EVENT_TYPE',
}

export const assertProductIsNotDeleted = (inventory: InventoryEntity) => {
  if (inventory.status === InventoryStatus.Deleted) {
    throw createError.Conflict(InventoryErrors.PRODUCT_IS_ALREADY_DELETED);
  }
};

//////////////////////////////////////
/// Getting the state from events
//////////////////////////////////////

export const getCurrentStateProduct = StreamAggregator<InventoryEntity, InventoryEvent>(
  (currentState, event) => {
    if (event.type === 'product-created') {
      if (currentState != null)
        throw createError.Conflict(InventoryErrors.CREATED_EXISTING_PRODUCT);
      return {
        productId: event.data.productId,
        name: event.data.name,
        price: event.data.price,
        desc: event.data?.desc,
        quantity: event.data.quantity,
        status: InventoryStatus.Available,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };
    }

    if (currentState == null) throw createError.NotFound(InventoryErrors.INVENTORY_NOT_FOUND);

    switch (event.type) {
      case 'product-add-quantity':
        return {
          ...currentState,
          quantity: addQuantity(currentState.quantity, event.data.quantity),
          lastUpdated: new Date(),
          status: InventoryStatus.Available,
        };
      case 'product-deduct-quantity':
        const newQuantity = deductQuantity(currentState.quantity, event.data.quantity);
        return {
          ...currentState,
          quantity: newQuantity,
          status: newQuantity === 0 ? InventoryStatus.OutOfStock : InventoryStatus.Available,
          lastUpdated: new Date(),
        };
      case 'product-deleted':
        return {
          ...currentState,
          status: InventoryStatus.Deleted,
          lastUpdated: new Date(),
        };
      case 'product-update-info':
        return {
          ...currentState,
          name: event.data.name ?? currentState.name,
          price: event.data.price ?? currentState.price,
          desc: event.data.desc,
          lastUpdated: new Date(),
        };
      default: {
        const _: never = event;
        throw createError.InternalServerError(InventoryErrors.UNKNOWN_EVENT_TYPE);
      }
    }
  }
);

//////////////////////////////////////
/// Create product
//////////////////////////////////////

export type CreateProduct = {
  productId: string;
  price: number;
  name: string;
  desc?: string;
  quantity: number;
};

export const createProduct = ({
  productId,
  price,
  name,
  desc,
  quantity,
}: CreateProduct): ProductCreated => {
  return {
    type: 'product-created',
    data: {
      productId,
      name,
      price,
      desc,
      quantity,
      createdAt: new Date(),
    },
  };
};

export type DeleteProduct = {
  productId: string;
};
export const deleteProduct = async (
  events: StreamingRead<ResolvedEvent<InventoryEvent>>,
  { productId }: DeleteProduct
): Promise<ProductDeleted> => {
  const product = await getCurrentStateProduct(events);
  assertProductIsNotDeleted(product);

  return {
    type: 'product-deleted',
    data: {
      productId,
    },
  };
};

export type AddQuantityProduct = {
  productId: string;
  quantity: number;
};

export const addQuantityProduct = async (
  events: StreamingRead<ResolvedEvent<InventoryEvent>>,
  { productId, quantity }: AddQuantityProduct
): Promise<ProductAddQuantity> => {
  const product = await getCurrentStateProduct(events);
  assertProductIsNotDeleted(product);

  return {
    type: 'product-add-quantity',
    data: {
      productId,
      quantity,
    },
  };
};

export type DeductQuantityProduct = {
  productId: string;
  quantity: number;
};

export const deductQuantityProduct = async (
  events: StreamingRead<ResolvedEvent<InventoryEvent>>,
  { productId, quantity }: DeductQuantityProduct
): Promise<ProductDeductQuantity> => {
  const product = await getCurrentStateProduct(events);
  assertProductIsNotDeleted(product);
  assertProductExists(product.quantity, quantity);

  return {
    type: 'product-deduct-quantity',
    data: {
      productId,
      quantity,
    },
  };
};

export type UpdateInfoProduct = {
  productId: string;
  name?: string;
  price?: number;
  desc?: string;
};

export const updateInfoProduct = async (
  events: StreamingRead<ResolvedEvent<InventoryEvent>>,
  { productId, name, price, desc }: UpdateInfoProduct
): Promise<ProductUpdateInfo> => {
  const product = await getCurrentStateProduct(events);
  assertProductIsNotDeleted(product);

  return {
    type: 'product-update-info',
    data: {
      productId,
      desc,
      name,
      price,
    },
  };
};
