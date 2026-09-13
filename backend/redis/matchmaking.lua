local players = redis.call('ZRANGEBYSCORE', KEYS[1], ARGV[1], ARGV[2])

local bestId = nil
local bestArrival = nil

for i = 1, #players do
    if players[i] ~= ARGV[3] then                 
        local arrival = tonumber(redis.call('HGET', KEYS[2], players[i]))
        if bestId == nil or arrival < bestArrival then
            bestId = players[i]
            bestArrival = arrival
        end
    end
end

if bestId ~= nil then
    redis.call('ZREM', KEYS[1], bestId)
    redis.call('HDEL', KEYS[2], bestId)
    return bestId
end

return nil