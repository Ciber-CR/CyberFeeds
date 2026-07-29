import { useState, useEffect, useLayoutEffect, useRef, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode, MouseEvent as ReactMouseEvent, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  label: ReactNode;
  placement?: Placement;
  children: ReactElement;
}

const VIEWPORT_MARGIN = 8; // separación mínima respecto al borde de la ventana
const GAP = 8;             // separación respecto al elemento ancla

function clamp(value: number, min: number, max: number) {
  if (max < min) return min; // el tooltip es más grande que el espacio: prioriza el margen
  return Math.max(min, Math.min(value, max));
}

// Tooltip elegante y reutilizable (mismo estilo que las pestañas del editor).
// Clona al hijo y le añade los handlers de hover sin envolverlo en otro nodo,
// de modo que no altera los layouts flex existentes. Se reposiciona para no
// salirse de la pantalla y la flecha se re-ancla al centro del elemento.
export default function Tooltip({ label, placement = 'bottom', children }: TooltipProps) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrow: CSSProperties } | null>(null);

  // Medimos el tooltip ya renderizado y calculamos la posición con clamping.
  useLayoutEffect(() => {
    if (!anchor || !cardRef.current) { setPos(null); return; }
    const card = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = anchor.left + anchor.width / 2;
    const cy = anchor.top + anchor.height / 2;
    let left = 0;
    let top = 0;
    let arrow: CSSProperties = {};

    if (placement === 'top' || placement === 'bottom') {
      left = clamp(cx - card.width / 2, VIEWPORT_MARGIN, vw - card.width - VIEWPORT_MARGIN);
      top = placement === 'bottom' ? anchor.bottom + GAP : anchor.top - GAP - card.height;
      const ax = clamp(cx - left, 12, card.width - 12); // flecha alineada al centro del ancla
      arrow = placement === 'bottom'
        ? { top: -4, left: ax, marginLeft: -4, borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }
        : { bottom: -4, left: ax, marginLeft: -4, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' };
    } else {
      top = clamp(cy - card.height / 2, VIEWPORT_MARGIN, vh - card.height - VIEWPORT_MARGIN);
      left = placement === 'right' ? anchor.right + GAP : anchor.left - GAP - card.width;
      const ay = clamp(cy - top, 12, card.height - 12);
      arrow = placement === 'right'
        ? { left: -4, top: ay, marginTop: -4, borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }
        : { right: -4, top: ay, marginTop: -4, borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)' };
    }
    setPos({ left, top, arrow });
    // Nota: no dependemos de `label` para evitar recálculos en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, placement]);

  // Ocultar al hacer scroll para que el tooltip no quede "flotando".
  useEffect(() => {
    if (!anchor) return;
    const hide = () => setAnchor(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('wheel', hide, true);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('wheel', hide, true);
    };
  }, [anchor]);

  if (!isValidElement(children)) return children;
  const child = children as ReactElement<any>;

  const show = (e: ReactMouseEvent<HTMLElement>) => {
    child.props.onMouseEnter?.(e);
    if (label) setAnchor(e.currentTarget.getBoundingClientRect());
  };
  const hide = (e: ReactMouseEvent<HTMLElement>) => {
    child.props.onMouseLeave?.(e);
    setAnchor(null);
  };
  const clickHide = (e: ReactMouseEvent<HTMLElement>) => {
    child.props.onClick?.(e);
    setAnchor(null);
  };

  const cloned = cloneElement(child, {
    onMouseEnter: show,
    onMouseLeave: hide,
    onClick: clickHide,
  });

  return (
    <>
      {cloned}
      {anchor && label && createPortal(
        <div style={{
          position: 'fixed',
          left: pos ? pos.left : -9999,
          top: pos ? pos.top : -9999,
          zIndex: 1000001,
          pointerEvents: 'none',
          visibility: pos ? 'visible' : 'hidden',
        }}>
          <div
            ref={cardRef}
            className="glass-effect"
            style={{
              position: 'relative',
              background: 'rgba(15, 15, 20, 0.97)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 10px var(--accent-glow)',
              borderRadius: 8,
              padding: '6px 10px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              animation: 'tooltipPop 0.14s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {label}
            <div style={{
              position: 'absolute',
              width: 8,
              height: 8,
              background: 'rgba(15, 15, 20, 0.97)',
              transform: 'rotate(45deg)',
              ...(pos?.arrow || {}),
            }} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
