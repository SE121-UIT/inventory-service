import { NextFunction, Request, Response, Router } from 'express';
import { Inventory } from '../models';
import { v4 as uuid } from 'uuid';
import {
  addQuantityProduct,
  createProduct,
  deductQuantityProduct,
  deleteProduct,
  toInventoryStreamName,
  updateInfoProduct,
} from './inventory';
import { create, update } from '../core/commandHandling';
import { getEventStore } from '../core/streams';
import { assertNotEmptyString, assertPositiveNumber } from '../core/validation';

export interface ResJSON {
  statusCode: number;
  message: string;
  data?: Object | null;
  error?: string;
}

export const router = Router();

// [GET] /show -> Get all product
router.get('/show', async (request: Request, respond: Response<ResJSON>, next: NextFunction) => {
  try {
    const productList = await Inventory.findAll({});

    respond.status(200).json({
      statusCode: 200,
      message: 'Success',
      data: productList,
    });
  } catch (err) {
    next(err);
  }
});

// [POST] /add -> Add new product
type AddNewProductRequest = Request<
  unknown,
  unknown,
  Partial<{
    name: string;
    price: number;
    quantity: number;
    desc?: string;
  }>
>;

router.post(
  '/add',
  async (request: AddNewProductRequest, respond: Response<ResJSON>, next: NextFunction) => {
    try {
      const productId = uuid();
      const streamName = toInventoryStreamName(productId);

      const result = await create(getEventStore(), createProduct)(streamName, {
        productId,
        name: assertNotEmptyString(request.body.name),
        price: assertPositiveNumber(request.body.price),
        quantity: assertPositiveNumber(request.body.quantity),
        desc: request.body.desc,
      });

      respond.status(201).json({
        statusCode: 201,
        message: 'Success',
        data: {
          productId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// [DELETE] /remove/{productId} -> Remove product
type RemoveProductRequest = Request<
  Partial<{
    productId: string;
  }>
>;

router.delete(
  '/remove/:productId',
  async (request: RemoveProductRequest, respond: Response<ResJSON>, next: NextFunction) => {
    try {
      const productId = assertNotEmptyString(request.params.productId);
      const streamName = toInventoryStreamName(productId);

      const result = await update(getEventStore(), deleteProduct)(streamName, {
        productId,
      });

      respond.status(200).json({
        statusCode: 200,
        message: 'Success',
      });
    } catch (err) {
      next(err);
    }
  }
);

// [PUT] /update/{productId} -> Update product
type UpdateProductRequest = Request<
  Partial<{ productId: string }>,
  unknown,
  Partial<{
    price?: number;
    name?: string;
    desc?: string;
  }>
>;

router.put(
  '/update/:productId',
  async (request: UpdateProductRequest, respond: Response<ResJSON>, next: NextFunction) => {
    try {
      const productId = assertNotEmptyString(request.params.productId);
      const streamName = toInventoryStreamName(productId);

      const result = await update(getEventStore(), updateInfoProduct)(streamName, {
        productId,
        name: request.body.name,
        price: request.body.price,
        desc: request.body.desc,
      });

      respond.status(200).json({
        statusCode: 200,
        message: 'Success',
      });
    } catch (err) {
      next(err);
    }
  }
);

// [PUT] /deduct-quantity/{productId} -> Deduct quantity
type DeductQuantityRequest = Request<
  Partial<{ productId: string }>,
  unknown,
  Partial<{ quantity: number }>
>;

router.put(
  '/deduct-quantity/:productId',
  async (request: DeductQuantityRequest, respond: Response<ResJSON>, next: NextFunction) => {
    try {
      const productId = assertNotEmptyString(request.params.productId);
      const streamName = toInventoryStreamName(productId);

      const result = await update(getEventStore(), deductQuantityProduct)(streamName, {
        productId,
        quantity: assertPositiveNumber(request.body.quantity),
      });

      respond.status(200).json({
        statusCode: 200,
        message: 'Success',
      });
    } catch (err) {
      next(err);
    }
  }
);

// [PUT] /add-quantity/{productId} -> Add quantity
type AddQuantityRequest = Request<
  Partial<{ productId: string }>,
  unknown,
  Partial<{ quantity: number }>
>;

router.put(
  '/add-quantity/:productId',
  async (request: AddQuantityRequest, respond: Response<ResJSON>, next: NextFunction) => {
    try {
      const productId = assertNotEmptyString(request.params.productId);
      const streamName = toInventoryStreamName(productId);

      const result = await update(getEventStore(), addQuantityProduct)(streamName, {
        productId,
        quantity: assertPositiveNumber(request.body.quantity),
      });

      respond.status(200).json({
        statusCode: 200,
        message: 'Success',
      });
    } catch (err) {
      next(err);
    }
  }
);
