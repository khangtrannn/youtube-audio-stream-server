const axios = require("axios");
const usetube = require('usetube');
const ytdl = require("ytdl-core");

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

    return { ...response.data.items[0].snippet, resourceId: { videoId: response.data.items[0].id } };
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
