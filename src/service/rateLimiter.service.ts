import redis from '../config/redis.config'

export const createTokenBucket = (capacity: number, refillRate: number) => {
        const consume = async(key:string) =>{
        const now = Date.now();

        const bucketData = await redis.get(key);

        let tokens = capacity;
        let lastRefill = now;

        if (bucketData) {
            const parsed = JSON.parse(bucketData);
            tokens = parsed.tokens;
            lastRefill = parsed.lastRefill;
        }

        const elapsed = (now - lastRefill) / 1000;
        const refill = elapsed * refillRate;

        tokens = Math.min(capacity, tokens + refill);

        if(tokens < 1) return false;

        tokens -= 1;

        await redis.set(key, JSON.stringify({tokens, lastRefill:now}),{EX:60*60});
        return true;
    };
    return {consume};
}