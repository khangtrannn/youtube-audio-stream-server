const express = require("express");
const redis = require("redis");
const request = require("request");
const axios = require("axios");
const cors = require("cors");
const ytstream = require('yt-stream');

const youtubeApi = require("./utils/youtubeApi");
const streamify = require("./utils/streamify");

const router = express.Router();
const app = express();
const port = process.env.PORT || 1235;

app.use(cors());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.json());

let redisClient;

(async () => {
  redisClient = redis.createClient();
  redisClient.on("error", (error) => console.error(`Error : ${error}`));
  await redisClient.connect();
})();

router.get("/videos/channel/:channel", async (req, res) => {
  try {
    const playlists = await youtubeApi.getPlaylistsByChannelId(
      req.params.channel
    );
    playlists.forEach(async (playlist) => {
      const videos = await youtubeApi.getVideosByPlaylistId(playlist);
      videos.forEach(
        async (video) =>
          await redisClient.HSET(
            "videos",
            video.resourceId.videoId,
            JSON.stringify(video)
          )
      );
    });

    res.send("Craw videos from channel successfully.");
  } catch (err) {
    console.log(err);
    res.send("Craw videos from channel error.");
  }
});

router.get("/videos", async (req, res) => {
  try {
    const videos = await redisClient.HGETALL("videos");
    res.json(Object.keys(videos).map((key) => JSON.parse(videos[key])));
  } catch (err) {
    console.log(err);
    res.send("Get videos from cache error.");
  }
});

router.get("/videos/detail/:id", async (req, res) => {
  try {
    res.json(await youtubeApi.getVideoDetailById(req.params.id));
  } catch (err) {
    console.log(err);
    res.send("Get video detail error.");
  }
});

router.get("/videos/search", async (req, res) => {
  try {
    res.json(await youtubeApi.searchVideo(req.query.keyword));
  } catch (err) {
    console.log(err);
    res.send("Search video error.");
  }
});

router.post("/videos/search/continuation", async (req, res) => {
  try {
    res.json(await youtubeApi.searchVideoContinuation(req.body.continuation, req.body.visitorData));
  } catch (err) {
    console.log(err);
    res.send("Search video error.");
  }
});

// TODO: another stream method can be considered
router.get("/stream/v2/:videoId", async (req, res) => {
  const stream = await ytstream.stream(`https://www.youtube.com/watch?v=${req.params.videoId}`, {
    quality: 'high',
    type: 'video',
    highWaterMark: 1048576 * 32
  });

  stream.stream.pipe(res);
});

router.get("/stream/:videoId", async (req, res) => {
  try {
    if (await youtubeApi.isValidID(req.params.videoId)) {
      streamify(req.params.videoId).pipe(res);
    }
  } catch (err) {
    console.error(err);
  }
});

router.get("/images", async (req, res) => {
  try {
    const response = await axios.get(req.query.url, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data, "utf-8")
    res.send(buffer);
  } catch (err) {
    console.log(err);
  }
});

app.use('/api', router);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
