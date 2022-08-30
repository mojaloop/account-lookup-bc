import { MongoClient } from "mongodb";

export enum MongoDbOperationEnum {
    INSERT_ONE = 'insertOne',
    DELETE_MANY = 'deleteMany'
}

interface IMongoDBQuery {
    dbUrl: string;
    dbName: string;
    dbCollection: string;
    operation: MongoDbOperationEnum;
    query: object;
    cb?: Function
}

export async function mongoQuery({
    dbUrl,
    dbName,
    dbCollection,
    operation,
    query = {},
    cb = Function
}: IMongoDBQuery) {
    const client = new MongoClient(dbUrl);
    
    try {
        const database = client.db(dbName);

        const collection = database.collection(dbCollection);

        await collection[operation](query);

        if(cb) {
            cb();
        }
        
      } finally {
        await client.close();
      }
}