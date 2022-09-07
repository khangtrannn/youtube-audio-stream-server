const express = require("express");
const redis = require("redis");
const request = require('request');
const cors = require('cors');
const youtubeApi = require("./utils/youtubeApi");

const app = express();
const port = process.env.PORT || 1235;

app.use(cors());

let redisClient;

(async () => {
  redisClient = redis.createClient();
  redisClient.on("error", (error) => console.error(`Error : ${error}`));
  await redisClient.connect();
})();

app.get('/api/videos/channel/:channel', async (req, res) => {
  try {
    const playlists = await youtubeApi.getPlaylistsByChannelId(req.params.channel);
    playlists.forEach(async (playlist) => {
      const videos = await youtubeApi.getVideosByPlaylistId(playlist);
      videos.forEach(async (video) => await redisClient.HSET("videos", video.resourceId.videoId, JSON.stringify(video)));
    });

    res.send('Craw videos from channel successfully.');
  } catch (err) {
    console.log(err);
    res.send('Craw videos from channel error.');
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    const videos = await redisClient.HGETALL('videos');
    res.json(Object.keys(videos).map((key) => JSON.parse(videos[key])));
  } catch (err) {
    console.log(err);
    res.send('Get videos from cache error.');
  }
});

app.get('/api/proxy', async (req, res) => {
  try {
    request.get(req.query.url).pipe(res);
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});