"use client";

import YouTube, { type YouTubePlayer, type YouTubeProps } from "react-youtube";
import { extractYouTubeVideoId } from "@/lib/utils";

type Props = {
  youtubeUrl: string;
  onPlayerReady: (player: YouTubePlayer) => void;
};

export default function VideoPlayer({ youtubeUrl, onPlayerReady }: Props) {
  const videoId = extractYouTubeVideoId(youtubeUrl);

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground text-sm">動画URLが無効です</p>
      </div>
    );
  }

  const opts: YouTubeProps["opts"] = {
    width: "100%",
    height: "100%",
    playerVars: { rel: 0 },
  };

  const handleReady: YouTubeProps["onReady"] = (event) => {
    onPlayerReady(event.target);
  };

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={handleReady}
        className="w-full h-full"
        iframeClassName="w-full h-full"
      />
    </div>
  );
}
