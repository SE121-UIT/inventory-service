import amqplib, { Channel } from 'amqplib';
import createError from 'http-errors';
import { Inventory } from '../models';

const channelSingleton = (() => {
  let instance: Channel | null = null;

  async function createChannel(): Promise<Channel> {
    try {
      if (!instance) {
        const connection = await amqplib.connect(
          'amqps://nlpghfsl:tAsRiPJT9G5avar1fwH-ahUvJkRncdRX@gerbil.rmq.cloudamqp.com/nlpghfsl'
        );
        instance = await connection.createChannel();
        await instance.assertQueue('ONLINE_SHOPPING_CART', {
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
  channel.publish('ONLINE_SHOPPING_CART', routingKey, Buffer.from(msg));
  console.log('Sent', msg);
};

export type EventBroker = {
  name: EventTypeBroker;
  data: object | undefined;
};

export type ProductIdCheckEvent = EventBroker & {
  data: {
    productId: string;
  };
};

export type ProductIdCheckReplyEvent = Event & {
  data: {
    productId: string;
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
  await channel.assertExchange('ONLINE_SHOPPING_CART', 'direct', {
    durable: true,
  });

  const q = await channel.assertQueue('', { exclusive: true });
  console.log(` Waiting for messages in queue: ${q.queue}`);

  channel.bindQueue(q.queue, 'ONLINE_SHOPPING_CART', routingKey);
  channel.consume(
    q.queue,
    async (msg) => {
      if (msg?.content) {
        console.log('the message is:', msg.content.toString());
        const eventPayload: EventBroker = JSON.parse(msg.content.toString());

        switch (eventPayload.name) {
          case EventTypeBroker.PRODUCT_ID_CHECK:
            const eventData: ProductIdCheckEvent = JSON.parse(msg.content.toString());
            const productId = eventData.data.productId;

            const productFind = await Inventory.findOne({
              where: {
                productId,
              },
            });

            const payload: EventBroker = {
              name: EventTypeBroker.PRODUCT_ID_CHECK_REPLY,
              data: {
                productId,
                result: !!productFind,
              },
            };

            console.log(payload);

            const message = JSON.stringify(payload);
            const replyTo = msg.properties.replyTo;
            const correlationId = msg.properties.correlationId;

            channel.sendToQueue(replyTo, Buffer.from(message), {
              correlationId,
            });

            break;
          case EventTypeBroker.CART_CONFIRMATION:
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
