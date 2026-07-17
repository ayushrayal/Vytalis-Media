import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Sliders, GripVertical, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const SortableItem = ({ id, title, isVisible, onToggle, isMinDisabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.65rem 0.85rem',
    marginBottom: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    background: isDragging ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
    userSelect: 'none',
    boxShadow: isDragging ? 'var(--shadow-md)' : 'none'
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-tertiary)',
            padding: '0.2rem'
          }}
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: isVisible ? 'var(--text-primary)' : 'var(--text-tertiary)',
            textDecoration: isVisible ? 'none' : 'line-through'
          }}
        >
          {title}
        </span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', cursor: isMinDisabled && isVisible ? 'not-allowed' : 'pointer' }}>
        <input
          type="checkbox"
          checked={isVisible}
          disabled={isMinDisabled && isVisible}
          onChange={() => onToggle(id)}
          style={{
            width: '16px',
            height: '16px',
            accentColor: 'var(--primary)',
            cursor: isMinDisabled && isVisible ? 'not-allowed' : 'pointer'
          }}
        />
      </label>
    </div>
  );
};

const CustomizeDashboardDrawer = ({
  isOpen,
  onClose,
  cardDefinitions,
  visibleCards,
  cardOrder,
  onReorder,
  onToggleVisibility,
  onReset,
  saveStatus,
  minVisibleCards = 3
}) => {
  const [toastMessage, setToastMessage] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!isOpen) return null;

  // Map of card key to friendly title
  const titleMap = {};
  cardDefinitions.forEach((card) => {
    titleMap[card.key] = card.title;
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = cardOrder.indexOf(active.id);
      const newIndex = cardOrder.indexOf(over.id);
      const newOrder = arrayMove(cardOrder, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  const handleToggle = (key) => {
    const isCurrentlyVisible = visibleCards.includes(key);
    if (isCurrentlyVisible && visibleCards.length <= minVisibleCards) {
      setToastMessage(`At least ${minVisibleCards} KPI cards must remain visible.`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setToastMessage(null);
    onToggleVisibility(key);
  };

  // Compute live preview list
  const previewList = cardOrder
    .filter((key) => visibleCards.includes(key))
    .map((key) => titleMap[key] || key);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Overlay backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 22, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />

      {/* Drawer Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          height: '100vh',
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: 'var(--shadow-lg)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              Customize Dashboard
            </h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Sync Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600 }}>
              {saveStatus === 'saving' ? (
                <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Loader2 size={12} className="spin" /> Saving...
                </span>
              ) : saveStatus === 'error' ? (
                <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} /> Sync error
                </span>
              ) : (
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={12} /> Saved
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Toast / Alert Message */}
          {toastMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Available Cards Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                KPI Cards ({visibleCards.length} Visible)
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Drag to reorder
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={cardOrder}
                strategy={verticalListSortingStrategy}
              >
                {cardOrder.map((key) => {
                  const title = titleMap[key] || key;
                  const isVisible = visibleCards.includes(key);
                  const isMinDisabled = visibleCards.length <= minVisibleCards;

                  return (
                    <SortableItem
                      key={key}
                      id={key}
                      title={title}
                      isVisible={isVisible}
                      onToggle={handleToggle}
                      isMinDisabled={isMinDisabled}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>

          {/* Live Preview Section */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-primary)',
              border: '1px dashed var(--border-color)'
            }}
          >
            <h4 style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              Live Preview
            </h4>
            {previewList.length > 0 ? (
              <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {previewList.map((title, idx) => (
                  <li key={idx} style={{ fontWeight: 500 }}>
                    {title}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0 }}>
                No cards visible.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '1rem',
            background: 'var(--bg-primary)'
          }}
        >
          <button
            onClick={onReset}
            className="btn btn-secondary"
            style={{
              flex: 1,
              padding: '0.65rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <RotateCcw size={14} />
            Reset to Default Layout
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CustomizeDashboardDrawer;
