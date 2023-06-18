import { Sequelize } from 'sequelize-typescript';
import { config } from 'dotenv';
import * as models from '../models';

config();

// Declare sequelize instance with database information.
const sequelize = new Sequelize(
  process.env.PG_DATABASE!,
  process.env.PG_USER!,
  process.env.PG_PASSWORD!,
  {
    host: process.env.PG_HOST,
    dialect: 'postgres',
    logging: false,
    models: Object.values(models),
  }
);

// Create database `inventory` if not exists
// sequelize
//   .query(`CREATE DATABASE ${process.env.PG_DATABASE};`)
//   .then(() => console.log(`DATABASE with name \`${process.env.PG_DATABASE}\` created`))
//   .catch((err) => console.log(`DATABASE with name \`${process.env.PG_DATABASE}\` existed`));

// Check connection to PostgreeDB
sequelize
  .authenticate()
  .then(() => {
    console.log('Connected successfully');
  })
  .catch((err) => {
    console.log('Unable connect to database: ', err);
  });

// Close connection when stop app
process.on('exit', () => {
  sequelize.close();
});

export { sequelize };
