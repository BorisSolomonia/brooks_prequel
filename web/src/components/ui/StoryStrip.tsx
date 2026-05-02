'use client';

import { useState } from 'react';
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
      <div className="flex gap-4 overflow-x-auto py-4 px-4 scrollbar-hide">
        {strips.map((strip, stripIndex) => (
          <button
            key={strip.creatorId}
            onClick={() => setActiveStory({ stripIndex, storyIndex: 0 })}
            className="flex min-h-20 min-w-20 flex-shrink-0 flex-col items-center justify-center gap-1"
          >
            <div
              className={`w-16 h-16 rounded-full p-[3px] ${
                strip.hasActiveStories
                  ? 'bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]'
                  : 'bg-ig-border'
              }`}
            >
              <div className="w-full h-full rounded-full bg-ig-primary p-[2px]">
                {strip.creatorAvatarUrl ? (
                  <img
                    src={strip.creatorAvatarUrl}
                    alt={strip.creatorUsername}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-ig-elevated flex items-center justify-center text-ig-text-tertiary text-lg font-semibold">
                    {strip.creatorUsername?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-ig-text-secondary truncate w-16 text-center">
              {strip.creatorUsername}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {activeStory !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setActiveStory(null)}
        >
          <div
            className="relative mx-4 max-h-[92dvh] w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveStory(null)}
              className="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/35 text-2xl text-white/80 transition-colors hover:text-white"
              aria-label="Close story"
            >
              &times;
            </button>

            {(() => {
              const strip = strips[activeStory.stripIndex];
              const story = strip.stories[activeStory.storyIndex];
              return (
                <div className="relative">
                  {/* Progress bars */}
                  <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                    {strip.stories.map((_, i) => (
                      <div
                        key={i}
                        className={`h-0.5 flex-1 rounded-full ${
                          i <= activeStory.storyIndex ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Creator info */}
                  <div className="absolute top-6 left-4 flex items-center gap-2 z-10">
                    <div className="w-8 h-8 rounded-full bg-ig-elevated overflow-hidden">
                      {strip.creatorAvatarUrl && (
                        <img src={strip.creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-white text-sm font-semibold">{strip.creatorUsername}</span>
                  </div>

                  <img
                    src={story.imageUrl}
                    alt={story.guideTitle}
                    className="w-full aspect-[9/16] object-cover rounded-lg"
                  />

                  <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/55 p-3 text-white">
                    <p className="text-sm font-semibold">{story.guideTitle}</p>
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
                      className="mt-3 inline-flex min-h-11 items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-black"
                    >
                      Open guide preview
                    </Link>
                  </div>

                  {/* Navigation */}
                  <div className="absolute inset-0 flex">
                    <button
                      className="w-1/2 h-full"
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
                      className="w-1/2 h-full"
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
