-- KEYS[1] queue (sorted set), KEYS[2] arrival times (hash)
-- ARGV[1] low, ARGV[2] high, ARGV[3] searcher id
-- Claims the longest-waiting opponent in range and removes BOTH players, atomically.
-- A searcher who is no longer queued (matched or cancelled meanwhile) claims nothing.
if not redis.call('ZSCORE', KEYS[1], ARGV[3]) then
    return nil
end

local players = redis.call('ZRANGEBYSCORE', KEYS[1], ARGV[1], ARGV[2])

local bestId = nil
local bestArrival = nil

for i = 1, #players do
    if players[i] ~= ARGV[3] then
        local arrival = tonumber(redis.call('HGET', KEYS[2], players[i])) or 0
        if bestId == nil or arrival < bestArrival then
            bestId = players[i]
            bestArrival = arrival
        end
    end
end

if bestId ~= nil then
    redis.call('ZREM', KEYS[1], bestId, ARGV[3])
    redis.call('HDEL', KEYS[2], bestId, ARGV[3])
    return bestId
end

return nil