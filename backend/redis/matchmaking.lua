local players = redis.call('ZRANGEBYSCORE', KEYS[1], ARGV[1], ARGV[2])

for i = 1, #players do
    if players[i] ~= ARGV[3] then
        redis.call('ZREM', KEYS[1], players[i])
        redis.call('HDEL', KEYS[2], players[i])
        return players[i]
    end
end

return nil