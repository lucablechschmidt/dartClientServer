"use client";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { createContext, useContext, useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

/**
 * Hold and drag to change the order (11.11.2026, players before the first dart), built on dnd-kit.
 * Loaded on demand (React.lazy in the callers): only a scoring screen that may still be reordered
 * fetches it. A drag starts after holding still for HOLD_MS; moving earlier scrolls as usual. A tap
 * still does what the item does (choose the starter); a hold never does. Alt + arrow keys move the
 * focused item for keyboard users.
 */
const HOLD_MS = 400;
const TOLERANCE_PX = 6;
/** A click right after a drag belongs to the drag, not to the item. */
const CLICK_AFTER_DRAG_MS = 300;

type Texts = { roleDescription: string; instructions: string; picked: string; dropped: string };

/**
 * Sideways only, and never past the screen's edge: a panel dragged beyond it made the row wider, the
 * auto-scroll followed it and the row ran away (seen in the e2e screenshot; auto-scroll is off too).
 */
const sidewaysOnScreen: Modifier = ({ transform, draggingNodeRect }) => {
  if (!draggingNodeRect) return { ...transform, y: 0 };
  const min = -draggingNodeRect.left;
  const max = window.innerWidth - draggingNodeRect.right;
  return { ...transform, x: Math.min(Math.max(transform.x, min), max), y: 0 };
};

type Area = { move: (id: string, by: number) => void; draggedRecently: () => boolean; roleDescription: string };
const AreaContext = createContext<Area | null>(null);

export function SortableArea({
  ids,
  onReorder,
  nameOf,
  texts,
  children,
}: {
  ids: string[];
  onReorder: (ids: string[]) => void;
  /** The visible name of an item, for the screen reader announcements. */
  nameOf: (id: string) => string;
  texts: Texts;
  children: ReactNode;
}) {
  // dnd-kit numbers its ids with a global counter, which differs between server and browser (hydration
  // mismatch on aria-describedby); React's id is the same on both
  const id = useId();
  const lastDrag = useRef(0);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: HOLD_MS, tolerance: TOLERANCE_PX } }),
    useSensor(TouchSensor, { activationConstraint: { delay: HOLD_MS, tolerance: TOLERANCE_PX } }),
  );
  const finish = (e: DragEndEvent) => {
    lastDrag.current = Date.now();
    const to = e.over ? ids.indexOf(String(e.over.id)) : -1;
    const from = ids.indexOf(String(e.active.id));
    if (to >= 0 && from >= 0 && to !== from) onReorder(arrayMove(ids, from, to));
  };
  const area: Area = {
    move: (id, by) => {
      const from = ids.indexOf(id);
      const to = from + by;
      if (from >= 0 && to >= 0 && to < ids.length) onReorder(arrayMove(ids, from, to));
    },
    draggedRecently: () => Date.now() - lastDrag.current < CLICK_AFTER_DRAG_MS,
    roleDescription: texts.roleDescription,
  };
  const position = (id: string | number) => String(ids.indexOf(String(id)) + 1);
  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[sidewaysOnScreen]}
      // no auto-scroll: it scrolled the row of panels away under the finger; scroll first, then drag
      autoScroll={false}
      onDragStart={() => (lastDrag.current = Date.now())}
      onDragEnd={finish}
      onDragCancel={() => (lastDrag.current = Date.now())}
      accessibility={{
        screenReaderInstructions: { draggable: texts.instructions },
        announcements: {
          onDragStart: ({ active }) => texts.picked.replace("{name}", nameOf(String(active.id))),
          onDragOver: () => undefined,
          onDragEnd: ({ active, over }) =>
            texts.dropped.replace("{name}", nameOf(String(active.id))).replace("{n}", position(over?.id ?? active.id)),
          onDragCancel: () => undefined,
        },
      }}
    >
      <AreaContext.Provider value={area}>
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          {children}
        </SortableContext>
      </AreaContext.Provider>
    </DndContext>
  );
}

/**
 * One item: a button that is tapped (onTap) or held and dragged. Its shift while dragging goes into
 * CSS variables that the `sortable-shift` utility reads (globals.css), so no style prop is needed.
 */
export function SortableItem({
  id,
  onTap,
  pressed,
  className = "",
  children,
}: {
  id: string;
  onTap: () => void;
  pressed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const area = useContext(AreaContext);
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });
  const node = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    el.style.setProperty("--drag-x", `${transform?.x ?? 0}px`);
    el.style.setProperty("--drag-y", `${transform?.y ?? 0}px`);
    el.style.setProperty("--drag-transition", transition ?? "none");
  }, [transform, transition]);
  const keys = (e: KeyboardEvent) => {
    if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    area?.move(id, e.key === "ArrowLeft" ? -1 : 1);
  };
  return (
    <button
      ref={(el) => {
        node.current = el;
        setNodeRef(el);
      }}
      type="button"
      {...attributes}
      {...listeners}
      aria-roledescription={area?.roleDescription}
      aria-pressed={pressed}
      onClick={() => {
        if (!area?.draggedRecently()) onTap();
      }}
      onKeyDown={keys}
      // the grab cursor shows mouse and trackpad users that the player can be dragged; touch ignores it
      className={`sortable-shift select-none touch-callout-none ${isDragging ? "relative z-10 scale-105 cursor-grabbing" : "cursor-grab"} ${className}`}
    >
      {children}
    </button>
  );
}
