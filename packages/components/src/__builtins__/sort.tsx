import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactFC } from '@formily/reactive-react'
import React, { createContext, useContext } from 'react'

export interface ISortableContainerProps {
  list: any[]
  accessibility?: {
    container?: Element
  }
  onSortStart?: (event: DragStartEvent) => void
  onSortEnd?: (event: { oldIndex: number; newIndex: number }) => void
}

export function SortableContainer<T extends React.HTMLAttributes<HTMLElement>>(
  Component: ReactFC<T>
): ReactFC<ISortableContainerProps & T> {
  return ({ list, accessibility, onSortStart, onSortEnd, ...props }) => {
    const _onSortEnd = (event: DragEndEvent) => {
      const { active, over } = event
      const oldIndex = (active.id as number) - 1
      const newIndex = (over?.id as number) - 1
      onSortEnd?.({
        oldIndex,
        newIndex,
      })
    }

    return (
      <DndContext
        accessibility={accessibility}
        onDragStart={onSortStart}
        onDragEnd={_onSortEnd}
      >
        <SortableContext items={list.map((_, index) => index + 1)}>
          <Component {...(props as unknown as T)}>{props.children}</Component>
        </SortableContext>
      </DndContext>
    )
  }
}

export const useSortableItem = () => {
  return useContext(SortableItemContext)
}

export const SortableItemContext = createContext<
  Partial<ReturnType<typeof useSortable>>
>({})

export interface ISortableElementProps {
  index?: number
  lockAxis?: 'x' | 'y'
}

export function SortableElement<T extends React.HTMLAttributes<HTMLElement>>(
  Component: ReactFC<T>
): ReactFC<T & ISortableElementProps> {
  return ({ index = 0, lockAxis, ...props }) => {
    const sortable = useSortable({
      id: index + 1,
    })
    const { setNodeRef, transform } = sortable
    if (transform) {
      switch (lockAxis) {
        case 'x':
          transform.y = 0
          break
        case 'y':
          transform.x = 0
          break

        default:
          break
      }
    }
    const style = {
      ...props.style,
      transform: CSS.Transform.toString(transform),
    }

    return (
      <SortableItemContext.Provider value={sortable}>
        {Component({
          ...props,
          style,
          ref: setNodeRef,
        } as unknown as T)}
      </SortableItemContext.Provider>
    )
  }
}

export function SortableHandle<T extends React.HTMLAttributes<HTMLElement>>(
  Component: ReactFC<T>
): ReactFC<T> {
  return (props: T) => {
    const { attributes, listeners } = useSortableItem()
    return <Component {...props} {...attributes} {...listeners} />
  }
}