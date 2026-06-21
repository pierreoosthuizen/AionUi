/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';

export type GroupDragHandle = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

/**
 * Sortable wrapper for a chat-group section. The label is the drag handle
 * (spread `handle` onto it), so groups reorder by dragging their header while
 * the conversation rows inside stay non-draggable.
 */
const SortableGroupSection: React.FC<{
  id: string;
  disabled?: boolean;
  renderLabel: (handle: GroupDragHandle) => React.ReactNode;
  children?: React.ReactNode;
}> = ({ id, disabled, renderLabel, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
    data: { type: 'group' },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    position: 'relative',
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className='min-w-0'>
      {renderLabel({ attributes, listeners })}
      {children}
    </div>
  );
};

export default SortableGroupSection;
