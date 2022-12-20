import { Client } from '@pepperi-addons/debug-server';
import { UtilitiesService } from './utilities.service';
import { EventsRelation, UserEvent } from 'udc-shared'
import { Relation } from '@pepperi-addons/papi-sdk';

export class UserEventsService {
    utilities = new UtilitiesService(this.client);

    constructor(private client: Client) {

    }
    
    async getCollectionEvents(collectionName: string): Promise<EventsRelation> {
        // get relations of type UDCEvents with collection name
        const relations = await this.getRelations(collectionName);
        // call the relation api function to get the events
        const events = await this.getEventsFromRelations(relations, collectionName);
        // add events filter to the events returned from the relation
        return this.addEventFilter(events, collectionName);
    }
    
    getEventFilter(collectionName: string) {
        return {
            ObjectType: collectionName
        }
    }

    addEventFilter(events: EventsRelation, collectionName: string): EventsRelation {
        events.Events.forEach((event) => {
            const filter = this.getEventFilter(collectionName);
            event.EventFilter = {
                ...filter,
                ...event.EventFilter
            }
        })
        return events;
    }
    
    async getEventsFromRelations(relations: Relation[], collectionName: string) {
        const res = await Promise.all(relations.map(async (relation): Promise<EventsRelation> => {
            if (relation.AddonRelativeURL) {
                return (await this.utilities.papiClient.get(`/addons/api/${relation.AddonUUID}/${relation.AddonRelativeURL}?collection_name=${collectionName}`)) as EventsRelation;
            }
            else {
                throw new Error(`AddonRelativeURL is mandatory on relations of type UDCEvents. collectionName: ${collectionName}.`)
            }
        }));
        return res.reduce((prev, current)=> {
            prev.Events.push(...current.Events);
            return prev;
        }, { Events:[] });

    }
    
    async getRelations(collectionName: string) {
        return await this.utilities.papiClient.addons.data.relations.find({where: `RelationName=UDCEvents And Name='${collectionName}'`});
    }
}