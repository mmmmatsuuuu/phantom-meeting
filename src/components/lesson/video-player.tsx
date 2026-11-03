"use client";

import YouTube, { type YouTubeProps } from "react-youtube";
import { extractYouTubeVideoId } from "@/lib/utils";

type Props = {
  youtubeUrl: string;
};

export default function VideoPlayer({ youtubeUrl }: Props) {
  const videoId = extractYouTubeVideoId(youtubeUrl);

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">動画URLが無効です</p>
      </div>
    );
  }

  const opts: YouTubeProps["opts"] = {
    width: "100%",
    height: "100%",
    playerVars: { rel: 0 },
  };

  return (
    <div className="w-full aspect-video overflow-hidden bg-black">
      <YouTube
        videoId={videoId}
        opts={opts}
        className="w-full h-full"
        iframeClassName="w-full h-full"
      />
    </div>
  );
}
