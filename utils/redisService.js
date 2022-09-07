const redis = require("redis");

const redisService = (function () {
  let redisClient;
  async () => {
    redisClient = redis.createClient();
    redisClient.on("error", (error) => console.error(`Error : ${error}`));
    await redisClient.connect();
  };

  const cacheVideo = async (video) => {
    await redisClient.HSET(
      "videos",
      video.resourceId.videoId,
      JSON.stringify(video)
    );
  };

  return {
    cacheVideo,
  };
})();

module.exports = redisService;
