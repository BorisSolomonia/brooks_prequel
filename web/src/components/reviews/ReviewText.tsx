'use client';

import { Fragment } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function renderSegment(segment: string) {
  if (!segment.startsWith('http://') && !segment.startsWith('https://')) {
    return segment;
  }

  return (
    <a
      key={segment}
      href={segment}
      target="_blank"
      rel="noreferrer noopener"
      className="text-brand-500 underline underline-offset-2"
    >
      {segment}
    </a>
  );
}

export default function ReviewText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-6 text-ig-text-secondary">
      {text.split('\n').map((line, index) => {
        const parts = line.split(URL_PATTERN);
        return (
          <p key={`${line}-${index}`}>
            {parts.map((part, partIndex) => (
              <Fragment key={`${part}-${partIndex}`}>{renderSegment(part)}</Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
