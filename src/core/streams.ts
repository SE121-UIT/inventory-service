//////////////////////////////////////
/// Getting the state from events
//////////////////////////////////////

import {
  EventStoreDBClient,
  EventType,
  RecordedEvent,
  ResolvedEvent,
  StreamingRead,
} from '@eventstore/db-client';
import createError from 'http-errors';
import { EVENT_STORE_DB_URL } from '../configs';

export type ApplyEvent<Entity, E extends EventType> = (
  currentState: Entity | undefined,
  event: RecordedEvent<E>
) => Entity;

export const StreamAggregator =
  <Entity, StreamEvents extends EventType>(when: ApplyEvent<Entity, StreamEvents>) =>
  async (eventStream: StreamingRead<ResolvedEvent<StreamEvents>>): Promise<Entity> => {
    let currentState: Entity | undefined = undefined;
    for await (const { event } of eventStream) {
      if (!event) continue;
      currentState = when(currentState, event);
    }
    if (currentState == null) throw createError.InternalServerError('Event not sync');
    return currentState;
  };

//////////////////////////////////////
/// ESDB
//////////////////////////////////////

let eventStore: EventStoreDBClient;

export const getEventStore = (connectionString?: string) => {
  if (!eventStore) {
    eventStore = EventStoreDBClient.connectionString(connectionString ?? EVENT_STORE_DB_URL!);
  }

  return eventStore;
};
