const axios = require("axios");
const ytdl = require("ytdl-core");
const moment = require("moment");
const findVal = require("./findVal");
const { findTextBetween } = require("./sttringUtils");

const API_KEY = "AIzaSyC8eoQm09jA8c4_2Qs7ekLTHAJYekm-4Tc";

const isLiveStreamVideo = (video) => {
  return video.badges?.[0].metadataBadgeRenderer?.icon?.iconType === 'LIVE';
}

const transformVideo = (data) => {
  const videoId = data.videoId;
  const thumbnail = data.thumbnail?.thumbnails[0].url; // Return first thumbnail with small resolution
  const title = data.title.runs[0]?.text;
  const publishedTime = data.publishedTimeText?.simpleText;
  const duration = data.lengthText?.simpleText;
  const view = data.shortViewCountText?.simpleText;
  const channel = {
    id: data.longBylineText?.runs[0]?.navigationEndpoint?.browseEndpoint.browseId,
    title: data.longBylineText?.runs[0]?.text,
    thumbnail: data.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails[0].url,
  }

  return {
    videoId,
    thumbnail,
    title,
    publishedTime,
    duration,
    view,
    channel,
  };
};

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
  };

  const getVideoDetailById = async (id) => {
    const response = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails&id=${id}&key=${API_KEY}`
    );

    const data = response.data.items[0];
    const duration = moment.duration(data.contentDetails.duration).format("h:mm:ss").padStart(4, "0:0");
    const thumbnails = data.snippet.thumbnails;
    const thumbnail = (
      thumbnails.maxres ||
      thumbnails.standard ||
      thumbnails.high
    )?.url;

    return { ...data.snippet, videoId: data.id, duration, thumbnail };
  };

  const searchVideo = async (keyword) => {
    const { data } = await axios.get("https://m.youtube.com/results?videoEmbeddable=true&search_query=" + encodeURI(keyword));
    const videos = findTextBetween(data, "var ytInitialData = ", ";</script>");
    const continuation = findTextBetween(data, '{"token":"', '",');
    const visitorData = findTextBetween(data, '{"ytConfigData":{"visitorData":"', '",');

    const videosJson = JSON.parse(videos);
    const items = findVal(videosJson, "itemSectionRenderer").contents;

    return {
      continuation,
      visitorData,
      videos: items
        .filter((item) => item.videoRenderer && !isLiveStreamVideo(item.videoRenderer))
        .map((item) => transformVideo(item.videoRenderer)),
    };
  };

  const searchVideoContinuation = async (continuation, visitorData) => {
    const { data } = await axios.post(
      "https://www.youtube.com/youtubei/v1/search",
      {
        context: {
          client: {
            visitorData,
            clientName: "WEB",
            clientVersion: "2.20220913.04.00",
          },
        },
        continuation,
      }
    );

    const items = findVal(data, "itemSectionRenderer").contents;
    const token = findVal(data, "continuationCommand").token;

    return {
      continuation: token,
      videos: items
        .filter((item) => item.videoRenderer && !isLiveStreamVideo(item.videoRenderer))
        .map((item) => transformVideo(item.videoRenderer)),
    };
  };

  const isValidID = async (id) => {
    return await ytdl.validateID(id);
  };

  return {
    getPlaylistsByChannelId,
    getVideosByPlaylistId,
    getVideoDetailById,
    searchVideo,
    searchVideoContinuation,
    isValidID,
  };
})();

module.exports = youtubeApi;
