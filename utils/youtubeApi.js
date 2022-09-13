const axios = require("axios");
const usetube = require('usetube');
const ytdl = require("ytdl-core");
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");

const API_KEY = "AIzaSyC8eoQm09jA8c4_2Qs7ekLTHAJYekm-4Tc";

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
    const response = await usetube.searchVideo(keyword);
    return await Promise.all(response.videos.map((video) => {
        return youtubeApi.getVideoDetailById(video.id);
    }));
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
