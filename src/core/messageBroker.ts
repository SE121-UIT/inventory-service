import amqplib, { Channel } from 'amqplib';
import createError from 'http-errors';
import { Inventory } from '../models';
import { deductInventoryFromCart } from '../services/inventory.service';
import { RABBIT_MQ_URL, EXCHANGE_NAME } from '../configs';

const channelSingleton = (() => {
  let instance: Channel | null = null;

  async function createChannel(): Promise<Channel> {
    try {
      if (!instance) {
        const connection = await amqplib.connect(RABBIT_MQ_URL);
        instance = await connection.createChannel();
        await instance.assertQueue(EXCHANGE_NAME, {
          durable: true,
        });
      }
      return instance;
    } catch (err) {
      throw err;
    }
  }

  return {
    getInstance: function (): Promise<Channel> {
      if (!instance) {
        return createChannel();
      }
      return Promise.resolve(instance);
    },
  };
})();

export const createChannel = channelSingleton.getInstance;

export const publishMessage = (channel: Channel, routingKey: string, msg: string) => {
  channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(msg));
  console.log('Sent', msg);
};

export interface ProductItem {
  productId: string;
  quantity: number;
}

export type EventBroker = {
  name: EventTypeBroker;
  data: object | undefined;
};

export type ProductIdCheckEvent = EventBroker & {
  data: {
    productId: string;
  };
};

export type ProductIdCheckReplyEvent = EventBroker & {
  data: {
    productId: string;
    result: boolean;
  };
};

export type CartConfirmationEvent = EventBroker & {
  data: {
    productItems: ProductItem[];
  };
};

export type CartConfirmationReplyEvent = EventBroker & {
  data: {
    message: string;
    result: boolean;
  };
};

export enum EventTypeBroker {
  PRODUCT_ID_CHECK = 'product_id_check',
  PRODUCT_ID_CHECK_REPLY = 'product_id_check_reply',
  CART_CONFIRMATION = 'cart_confirmation',
  CART_CONFIRMATION_REPLY = 'cart_confirmation_reply',
}

export const subscribeMessage = async (channel: Channel, routingKey: string) => {
  await channel.assertExchange(EXCHANGE_NAME, 'direct', {
    durable: true,
  });

  const q = await channel.assertQueue('', { exclusive: true });
  console.log(` Waiting for messages in queue: ${q.queue}`);

  channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
  channel.consume(
    q.queue,
    async (msg) => {
      if (msg?.content) {
        console.log('the message is:', msg.content.toString());
        const eventPayload: EventBroker = JSON.parse(msg.content.toString());

        switch (eventPayload.name) {
          case EventTypeBroker.PRODUCT_ID_CHECK:
            {
              const eventData: ProductIdCheckEvent = JSON.parse(msg.content.toString());
              const productId = eventData.data.productId;

              const productFind = await Inventory.findOne({
                where: {
                  productId,
                },
              });

              const payload: ProductIdCheckReplyEvent = {
                name: EventTypeBroker.PRODUCT_ID_CHECK_REPLY,
                data: {
                  productId,
                  result: !!productFind,
                },
              };

              const message = JSON.stringify(payload);
              const replyTo = msg.properties.replyTo;
              const correlationId = msg.properties.correlationId;

              channel.sendToQueue(replyTo, Buffer.from(message), {
                correlationId,
              });
            }

            break;
          case EventTypeBroker.CART_CONFIRMATION:
            {
              const eventData: CartConfirmationEvent = JSON.parse(msg.content.toString());
              const productItems = eventData.data.productItems;

              const { message, result } = await deductInventoryFromCart(productItems);

              const payload: CartConfirmationReplyEvent = {
                name: EventTypeBroker.CART_CONFIRMATION_REPLY,
                data: {
                  message,
                  result,
                },
              };

              const replyTo = msg.properties.replyTo;
              const correlationId = msg.properties.correlationId;

              channel.sendToQueue(replyTo, Buffer.from(JSON.stringify(payload)), {
                correlationId,
              });
            }

            break;
          default:
            throw createError.InternalServerError('EventBroker not map');
        }
      }
      console.log('[X] received');
    },
    {
      noAck: true,
    }
  );
};
