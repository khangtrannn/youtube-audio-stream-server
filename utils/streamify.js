const ytdl = require("ytdl-core");
const FFmpeg = require("fluent-ffmpeg");
const { PassThrough } = require("stream");

const streamify = (videoId) => {
  const video = ytdl(`http://www.youtube.com/watch?v=${videoId}`);
  const stream = new PassThrough();
  const ffmpeg = new FFmpeg(video);

  process.nextTick(() => {
    const output = ffmpeg.format("mp3").pipe(stream);

    ffmpeg.once("error", (error) => stream.emit("error", error));
    output.once("error", (error) => {
      video.end();
      stream.emit("error", error);
    });
  });

  stream.video = video;
  stream.ffmpeg = ffmpeg;

  return stream;
};

module.exports = streamify;