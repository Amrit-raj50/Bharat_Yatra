import React from 'react';
import type { BufferRating } from '@/domain/types';
import { StatusPill } from './StatusPill';

export function RatingBadge({ rating }: { rating: BufferRating }): React.ReactElement {
  return <StatusPill rating={rating} size="sm" />;
}
