'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CreatorStoryStrip } from '@/types';

interface StoryStripProps {
  strips: CreatorStoryStrip[];
}

export default function StoryStrip({ strips }: StoryStripProps) {
  const [activeStory, setActiveStory] = useState<{ stripIndex: number; storyIndex: number } | null>(null);

  if (strips.length === 0) return null;

  return (
    <>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4 py-4">
        {strips.map((strip, stripIndex) => (
          <button
            key={strip.creatorId}
            onClick={() => setActiveStory({ stripIndex, storyIndex: 0 })}
            className="flex min-h-20 min-w-20 flex-shrink-0 flex-col items-center justify-center gap-1"
          >
            <div
              className={`h-16 w-16 rounded-full border-2 border-ig-border p-[3px] ${
                strip.hasActiveStories
                  ? 'bg-[conic-gradient(from_130deg,#D4AA3A,#C95A7D,#5098B3,#98B54A,#D4AA3A)]'
                  : 'bg-ig-border'
              }`}
            >
              <div className="h-full w-full rounded-full bg-ig-primary p-[2px]">
                {strip.creatorAvatarUrl ? (
                  <Image
                    src={strip.creatorAvatarUrl}
                    alt={strip.creatorUsername}
                    width={56}
                    height={56}
                    className="h-full w-full rounded-full object-cover saturate-[0.92] contrast-[1.04]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-ig-elevated font-display text-lg font-black text-ig-text-tertiary">
                    {strip.creatorUsername?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>
            <span className="w-16 truncate text-center text-xs font-semibold text-ig-text-secondary">
              {strip.creatorUsername}
            </span>
          </button>
        ))}
      </div>

      {activeStory !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setActiveStory(null)}
        >
          <div
            className="relative mx-4 max-h-[92dvh] w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveStory(null)}
              className="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-white/20 bg-black/45 text-2xl text-white/80 transition-colors hover:text-white"
              aria-label="Close story"
            >
              &times;
            </button>

            {(() => {
              const strip = strips[activeStory.stripIndex];
              const story = strip.stories[activeStory.storyIndex];
              return (
                <div className="relative">
                  <div className="absolute left-2 right-2 top-2 z-10 flex gap-1">
                    {strip.stories.map((_, i) => (
                      <div
                        key={i}
                        className={`h-0.5 flex-1 rounded-full ${
                          i <= activeStory.storyIndex ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="absolute left-4 top-6 z-10 flex items-center gap-2">
                    <div className="h-8 w-8 overflow-hidden rounded-full border-2 border-white/70 bg-ig-elevated">
                      {strip.creatorAvatarUrl && (
                        <Image
                          src={strip.creatorAvatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <span className="font-display text-sm font-black text-white">{strip.creatorUsername}</span>
                  </div>

                  <Image
                    src={story.imageUrl}
                    alt={story.guideTitle}
                    width={1080}
                    height={1920}
                    sizes="(max-width: 640px) 100vw, 512px"
                    className="aspect-[9/16] w-full rounded-lg border-2 border-white/30 object-cover saturate-[0.92] contrast-[1.04]"
                  />

                  <div className="absolute bottom-4 left-4 right-4 rounded-lg border-2 border-white/25 bg-black/70 p-3 text-white backdrop-blur">
                    <p className="font-display text-sm font-black">{story.guideTitle}</p>
                    {story.promotionText && (
                      <p className="mt-1 text-sm text-white/80">{story.promotionText}</p>
                    )}
                    {(story.guidePrimaryCity || story.guideRegion) && (
                      <p className="mt-1 text-xs text-white/70">
                        {story.guidePrimaryCity || story.guideRegion}
                      </p>
                    )}
                    <Link
                      href={`/guides/${story.guideId}/view`}
                      className="mt-3 inline-flex min-h-11 items-center rounded-md border-2 border-white bg-white px-4 py-2 font-display text-sm font-black uppercase tracking-[0.06em] text-black transition hover:bg-accent-500"
                    >
                      Open guide preview
                    </Link>
                  </div>

                  <div className="absolute inset-0 flex">
                    <button
                      className="h-full w-1/2"
                      onClick={() => {
                        if (activeStory.storyIndex > 0) {
                          setActiveStory({ ...activeStory, storyIndex: activeStory.storyIndex - 1 });
                        } else if (activeStory.stripIndex > 0) {
                          const prevStrip = strips[activeStory.stripIndex - 1];
                          setActiveStory({ stripIndex: activeStory.stripIndex - 1, storyIndex: prevStrip.stories.length - 1 });
                        } else {
                          setActiveStory(null);
                        }
                      }}
                    />
                    <button
                      className="h-full w-1/2"
                      onClick={() => {
                        if (activeStory.storyIndex < strip.stories.length - 1) {
                          setActiveStory({ ...activeStory, storyIndex: activeStory.storyIndex + 1 });
                        } else if (activeStory.stripIndex < strips.length - 1) {
                          setActiveStory({ stripIndex: activeStory.stripIndex + 1, storyIndex: 0 });
                        } else {
                          setActiveStory(null);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
