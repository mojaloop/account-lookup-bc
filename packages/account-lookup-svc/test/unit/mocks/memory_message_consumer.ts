import {IMessage, IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";


export class MemoryMessageConsumer implements IMessageConsumer{
    
    setCallbackFn: (handlerCallback: (message: IMessage) => Promise<void>)=>{
       return: any;
    };
    
    setFilteringFn: (filterFn: (message: IMessage) => boolean) => {
        return: any;
    };
    
    setTopics (topics: string[]){

    };
    
    private _destroy: (force: boolean) => Promise<void>;
    public get destroy(): (force: boolean) => Promise<void> {
        return this._destroy;
    }
    public set destroy(value: (force: boolean) => Promise<void>) {
        this._destroy = value;
    }

    private _connect: () => Promise<void>;
    
    public get connect(): () => Promise<void> {
        return this._connect;
    }
    public set connect(value: () => Promise<void>) {
        this._connect = value;
    }
    
    private _disconnect: (force: boolean) => Promise<void>;
    
    public get disconnect(): (force: boolean) => Promise<void> {
        return this._disconnect;
    }
    public set disconnect(value: (force: boolean) => Promise<void>) {
        this._disconnect = value;
    }

    private _start: () => Promise<void>;
    public get start(): () => Promise<void> {
        return this._start;
    }
    public set start(value: () => Promise<void>) {
        this._start = value;
    }

    private _stop: () => Promise<void>;
    public get stop(): () => Promise<void> {
        return this._stop;
    }
    public set stop(value: () => Promise<void>) {
        this._stop = value;
    }
}