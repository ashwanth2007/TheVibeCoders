import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

export type AnnotationTool = 'pen' | 'text' | 'move';
type Point = { x: number; y: number };

interface Path {
    type: 'path';
    points: Point[];
    color: string;
    id: number;
}

interface Text {
    type: 'text';
    content: string;
    position: Point;
    color: string;
    id: number;
}

type AnnotationObject = Path | Text;

interface AnnotationCanvasProps {
    tool: AnnotationTool;
    color: string;
}

export interface AnnotationCanvasHandle {
    undo: () => void;
    clear: () => void;
}

const HIT_TOLERANCE = 10;

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
    ({ tool, color }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [history, setHistory] = useState<AnnotationObject[]>([]);
        const [isDrawing, setIsDrawing] = useState(false);
        const [textInput, setTextInput] = useState<{ value: string; position: Point } | null>(null);

        const currentPathRef = useRef<Path | null>(null);
        const movingObjectRef = useRef<{ object: Text; offset: Point } | null>(null);
        const textInputRef = useRef<HTMLInputElement>(null);
        const nextId = useRef(0);

        // --- Drawing Logic ---

        const getCanvasContext = useCallback(() => {
            const canvas = canvasRef.current;
            return canvas ? canvas.getContext('2d') : null;
        }, []);

        const drawObject = useCallback((ctx: CanvasRenderingContext2D, obj: AnnotationObject | null) => {
            if (!obj) return;

            if (obj.type === 'path') {
                ctx.beginPath();
                ctx.strokeStyle = obj.color;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                obj.points.forEach((point, index) => {
                    if (index === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
            } else if (obj.type === 'text') {
                ctx.fillStyle = obj.color;
                ctx.font = '16px sans-serif';
                ctx.fillText(obj.content, obj.position.x, obj.position.y);
            }
        }, []);

        const redrawCanvas = useCallback(() => {
            const canvas = canvasRef.current;
            const ctx = getCanvasContext();
            if (!canvas || !ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            history.forEach(obj => drawObject(ctx, obj));
        }, [history, getCanvasContext, drawObject]);

        useEffect(() => {
            const canvas = canvasRef.current;
            const handleResize = () => {
                if (canvas) {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    redrawCanvas();
                }
            };
            window.addEventListener('resize', handleResize);
            handleResize();
            return () => window.removeEventListener('resize', handleResize);
        }, [redrawCanvas]);
        
        useEffect(() => {
            redrawCanvas();
        }, [history, redrawCanvas]);

        useEffect(() => {
            if (textInput && textInputRef.current) {
                textInputRef.current.focus();
            }
        }, [textInput]);


        // --- Event Handlers ---

        const findTextAtPosition = useCallback((pos: Point): Text | null => {
            const ctx = getCanvasContext();
            if (!ctx) return null;
            for (let i = history.length - 1; i >= 0; i--) {
                const obj = history[i];
                if (obj.type === 'text') {
                    ctx.font = '16px sans-serif';
                    const metrics = ctx.measureText(obj.content);
                    if (
                        pos.x >= obj.position.x - HIT_TOLERANCE &&
                        pos.x <= obj.position.x + metrics.width + HIT_TOLERANCE &&
                        pos.y >= obj.position.y - 16 - HIT_TOLERANCE &&
                        pos.y <= obj.position.y + HIT_TOLERANCE
                    ) {
                        return obj;
                    }
                }
            }
            return null;
        }, [history, getCanvasContext]);
        
        const handleTextInputSubmit = useCallback(() => {
            if (textInput && textInput.value.trim()) {
                setHistory(prev => [...prev, {
                    type: 'text',
                    content: textInput.value,
                    position: textInput.position,
                    color: color,
                    id: nextId.current++,
                }]);
            }
            setTextInput(null);
        }, [textInput, color]);

        const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
            const { clientX: x, clientY: y } = e;

            if (textInput) {
                handleTextInputSubmit();
                return;
            }

            if (tool === 'pen') {
                setIsDrawing(true);
                currentPathRef.current = { type: 'path', points: [{ x, y }], color, id: nextId.current++ };
            } else if (tool === 'text') {
                setTextInput({ value: '', position: { x, y } });
            } else if (tool === 'move') {
                const textObject = findTextAtPosition({ x, y });
                if (textObject) {
                    setIsDrawing(true);
                    movingObjectRef.current = {
                        object: textObject,
                        offset: { x: x - textObject.position.x, y: y - textObject.position.y },
                    };
                    // Temporarily remove from history so it doesn't get drawn twice
                    setHistory(prev => prev.filter(obj => obj.id !== textObject.id));
                }
            }
        }, [tool, color, textInput, findTextAtPosition, handleTextInputSubmit]);

        const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!isDrawing) return;
            const { clientX: x, clientY: y } = e;
            const ctx = getCanvasContext();
            if (!ctx) return;

            redrawCanvas(); // Redraw the stable history first

            if (tool === 'pen' && currentPathRef.current) {
                currentPathRef.current.points.push({ x, y });
                drawObject(ctx, currentPathRef.current);
            } else if (tool === 'move' && movingObjectRef.current) {
                const newPosition = { x: x - movingObjectRef.current.offset.x, y: y - movingObjectRef.current.offset.y };
                drawObject(ctx, { ...movingObjectRef.current.object, position: newPosition });
            }
        }, [isDrawing, tool, getCanvasContext, redrawCanvas, drawObject]);

        const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!isDrawing) return;
            setIsDrawing(false);

            if (tool === 'pen' && currentPathRef.current && currentPathRef.current.points.length > 1) {
                setHistory(prev => [...prev, currentPathRef.current!]);
            } else if (tool === 'move' && movingObjectRef.current) {
                const { clientX: x, clientY: y } = e;
                const finalPosition = { x: x - movingObjectRef.current.offset.x, y: y - movingObjectRef.current.offset.y };
                setHistory(prev => [...prev, { ...movingObjectRef.current!.object, position: finalPosition }]);
            }
            
            currentPathRef.current = null;
            movingObjectRef.current = null;
            redrawCanvas();
        }, [isDrawing, tool, redrawCanvas]);

        useImperativeHandle(ref, () => ({
            undo: () => setHistory(prev => prev.slice(0, -1)),
            clear: () => setHistory([]),
        }));

        const cursorStyle = {
            pen: 'crosshair',
            text: 'text',
            move: 'move',
        }[tool];

        return (
            <>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="fixed inset-0 z-[10000]"
                    style={{ cursor: cursorStyle }}
                />
                {textInput && (
                    <input
                        ref={textInputRef}
                        type="text"
                        value={textInput.value}
                        onChange={(e) => setTextInput(prev => prev ? { ...prev, value: e.target.value } : null)}
                        onBlur={handleTextInputSubmit}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTextInputSubmit(); } }}
                        className="annotation-text-input"
                        style={{ left: textInput.position.x, top: textInput.position.y - 20, color: color }}
                    />
                )}
            </>
        );
    }
);
