"use client";

import { extractYouTubeVideoId } from "@/lib/utils";

type Props = {
  youtubeUrl: string;
};

export default function VideoPlayer({ youtubeUrl }: Props) {
  const videoId = extractYouTubeVideoId(youtubeUrl);

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground text-sm">動画URLが無効です</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="授業動画"
      />
    </div>
  );
}
