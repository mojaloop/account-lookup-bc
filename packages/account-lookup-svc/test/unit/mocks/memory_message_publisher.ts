import {IMessagePublisher, IMessageValue} from "@mojaloop/account-lookup-bc-domain";

export class MemoryMessagePublisher implements IMessagePublisher{
    
    init(): Promise<void> {
        return Promise.resolve();
    }
    
    destroy(): Promise<void> {
        return Promise.resolve();
    }
    send(message: IMessageValue | IMessageValue[]): Promise<void> {
        return Promise.resolve();
    }
}