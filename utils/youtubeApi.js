const axios = require("axios");
const ytdl = require("ytdl-core");
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");
const findVal = require('./findVal');

const API_KEY = "AIzaSyC8eoQm09jA8c4_2Qs7ekLTHAJYekm-4Tc";

const transformVideo = (data) => {
  const videoId = data.videoId;
  const thumbnail = data.thumbnail?.thumbnails.sort((prev, next) => next.height > prev.height)[0].url;
  const title = data.title.runs[0]?.text;
  const publishedTime = data.publishedTimeText?.simpleText;
  const duration = data.lengthText?.simpleText;
  const view = data.shortViewCountText?.simpleText;
  const channelTitle = data.longBylineText?.runs[0]?.text;
  const channelId = data.longBylineText?.runs[0]?.navigationEndpoint.browseEndpoint.browseId;
  const channelThumbnail = data.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0].url;

  return {
    videoId,
    thumbnail,
    title,
    publishedTime,
    duration,
    view,
    channelTitle,
    channelId,
    channelThumbnail,
  };
}

const youtubeApi = (function () {
  const getPlaylistsByChannelId = async (channelId) => {
    const response = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/playlists?part=contentDetails&channelId=${channelId}&maxResults=50&key=${API_KEY}`
    );
    return response.data.items.map((item) => item.id);
  };

  // TODO: get videos with pageToken if play list has more than 50 videos
  const getVideosByPlaylistId = async (playlistId) => {
    const response = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet%2CcontentDetails&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`
    );

    return response.data.items.map((item) => item.snippet);
  }

  const getVideoDetailById = async (id) => {
    const response = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails&id=${id}&key=${API_KEY}`
    );

    const data = response.data.items[0];
    const duration = moment.duration(data.contentDetails.duration).format('h:mm:ss').padStart(4, '0:0')
    const thumbnails = data.snippet.thumbnails;
    const thumbnail = (thumbnails.maxres || thumbnails.standard || thumbnails.high)?.url;
    return { ...data.snippet, resourceId: { videoId: data.id }, duration, thumbnail };
  }

  const searchVideo = async (keyword) => {
    const data = await axios.get("https://m.youtube.com/results?videoEmbeddable=true&search_query=" + encodeURI(keyword));

    const videos = data.data
      .split("var ytInitialData = ")[1]
      .split(";</script>")[0];

    const videosJson = JSON.parse(videos);
    const items = findVal(videosJson, 'itemSectionRenderer').contents;

    return items.filter((item) => item.videoRenderer).map((item) => transformVideo(item.videoRenderer));
  }

  const isValidID = async (id) => {
    return await ytdl.validateID(id);
  }

  return {
    getPlaylistsByChannelId,
    getVideosByPlaylistId,
    getVideoDetailById,
    searchVideo,
    isValidID,
  };
})();

module.exports = youtubeApi;
