import { startAPI } from './core/api';
import { SubscriptionToAllWithPostgreCheckpoints, storeCheckpointPostgre } from './core/mongoDB';
import { projectToInventory } from './inventory/projection';
import { router } from './inventory/routes';

//////////////////////////////////////
/// API
//////////////////////////////////////

startAPI(router);

//////////////////////////////////////
/// Run
//////////////////////////////////////
(async () => {
  await SubscriptionToAllWithPostgreCheckpoints('sub_inventory', [
    storeCheckpointPostgre(projectToInventory),
  ]);
})().catch(console.log);
