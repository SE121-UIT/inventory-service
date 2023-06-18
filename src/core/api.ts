import express, { Application, NextFunction, Router, Request, Response } from 'express';
import http from 'http';
import { createChannel, subscribeMessage } from './messageBroker';
import { sequelize } from '../configs/sequelize';
import createError, { HttpError } from 'http-errors';
import { ResJSON } from '../inventory/routes';

export const startAPI = async (router: Router) => {
  const app: Application = express();

  // Connect database
  sequelize
    .sync()
    .then((data) => console.log('All table sync successfully'))
    .catch((err) => console.log('All table sync failed', err));

  app.set('etag', false);
  app.use(express.json());
  app.use(
    express.urlencoded({
      extended: true,
    })
  );
  app.use(router);

  // Handle error
  app.use((req, res, next: NextFunction) => {
    next(createError.NotFound('This route does not exist.'));
  });

  app.use((err: HttpError, req: Request, res: Response<ResJSON>, next: NextFunction) => {
    res.status(err.statusCode || 500).json({
      statusCode: err.statusCode || 500,
      message: err.message,
      error: err.name,
    });
  });

  const server = http.createServer(app);

  server.listen(5000);

  server.on('listening', () => {
    console.info('server up listening');
  });

  const channel = await createChannel();
  subscribeMessage(channel, 'INVENTORY_SERVICE');
};
