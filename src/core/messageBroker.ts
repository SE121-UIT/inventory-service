import amqplib, { Channel } from 'amqplib';

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

export const subscribeMessage = async (channel: Channel, routingKey: string) => {
  await channel.assertExchange('ONLINE_SHOPPING_CART', 'direct', {
    durable: true,
  });

  const q = await channel.assertQueue('', { exclusive: true });
  console.log(` Waiting for messages in queue: ${q.queue}`);

  channel.bindQueue(q.queue, 'ONLINE_SHOPPING_CART', routingKey);
  channel.consume(
    q.queue,
    (msg) => {
      if (msg?.content) {
        console.log('the message is:', msg.content.toString());
        // console.log('the message is:', msg.content;

        if (typeof msg.content === 'object') {
          const productId = JSON.parse(msg.content.toString())['productId'];
          const quantity = 10;

          const replyTo = msg.properties.replyTo;
          const correlationId = msg.properties.correlationId;
          const result = JSON.stringify({
            productId,
            quantity,
          });

          channel.sendToQueue(replyTo, Buffer.from(result), {
            correlationId,
          });
        }
      }
      console.log('[X] received');
    },
    {
      noAck: true,
    }
  );
};
