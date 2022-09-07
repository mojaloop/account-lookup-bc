export function cache(target: any, methodName: string) {
    const originalMethod = descriptor.value;
    let cache = new Map<string, any>();

    if(cache.has(key)) {
        return cache.get(key)
    }
}