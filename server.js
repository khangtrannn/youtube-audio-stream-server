const express = require("express");
const redis = require("redis");
const request = require("request");
const axios = require("axios");
const cors = require("cors");
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

router.get("/videos/detail/:id", async (req, res) => {
  try {
    if (await youtubeApi.isValidID(req.params.id)) {
      res.json(await youtubeApi.getVideoDetailById(req.params.id));
    }
  } catch (err) {
    console.log(err);
    res.send("Get video detail error.");
  }
});

router.get("/videos/suggestion/:id", async (req, res) => {
  try {
    if (await youtubeApi.isValidID(req.params.id)) {
      res.json(await youtubeApi.getSuggestVideos(req.params.id));
    }
  } catch (err) {
    console.log(err);
    res.send("Get video detail error.");
  }
});

router.get('/videos/favorite/:userId', async (req, res) => {
  const favorites = await redisClient.HGETALL("favorites");
  const userFavorites = favorites[req.params.userId] ? JSON.parse(favorites[req.params.userId]) : [];
  res.json(userFavorites);
});

router.post('/videos/favorite', async (req, res) => {
  const { userId, video } = req.body;
  const favorites = await redisClient.HGETALL("favorites");

  const userFavorites = favorites[userId.toString()] ? JSON.parse(favorites[userId.toString()]) : [];
  const isFavoriteAlready = userFavorites.find((favorite) => favorite.id === video.id);

  if (isFavoriteAlready) {
    return res.json({ success: true });
  }

  userFavorites.unshift(video);
  await redisClient.HSET("favorites", userId.toString(), JSON.stringify(userFavorites));

  res.json({ success: true });
});

router.post('/videos/unfavorite', async (req, res) => {
  const { userId, video } = req.body;
  const favorites = await redisClient.HGETALL("favorites");

  let userFavorites = favorites[userId.toString()] ? JSON.parse(favorites[userId.toString()]) : [];
  userFavorites = userFavorites.filter((favorite) => favorite.id !== video.id);
  
  await redisClient.HSET("favorites", userId.toString(), JSON.stringify(userFavorites));
  res.json({ success: true });
});

router.post("/videos/suggestion/continuation", async (req, res) => {
  try {
    res.json(await youtubeApi.getSuggestVideosContinuation(req.body.continuation, req.body.visitorData));
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

router.get("/stream/v2/:videoId", async (req, res) => {
  try {
    const url = await youtubeApi.getStreamAudioUrl(req.params.videoId);
    const stream = request(url);
    req.pipe(stream)
    stream.pipe(res)
  } catch (err) {
    console.error(err);
  }
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
