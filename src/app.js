import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
import path from 'path';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import routes from './routes';
import './database';

import sentryConfig from './config/sentry';

class App {
  constructor() {
    this.server = express();

    Sentry.init(sentryConfig);

    this.middlewares();
    this.routes();
    this.exceptionHandler();
  }

  middlewares() {
    this.server.use(Sentry.Handlers.requestHandler());
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      let errorMessage = '';
      if (process.env.APP_URL === 'development') {
        errorMessage = await new Youch(err, req).toJSON();
      } else {
        errorMessage = { error: 'Internal server error.' };
      }
      return res.status(500).json(errorMessage);
    });
  }
}

export default new App().server;
