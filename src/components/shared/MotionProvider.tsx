'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * MotionProvider — global framer-motion config.
 * `reducedMotion="user"` honors the OS "reduce motion" setting:
 * transform/layout animations are skipped (opacity still animates),
 * non-transform updates (progress bars, width) are unaffected.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
