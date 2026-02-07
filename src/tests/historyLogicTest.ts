import { HistoryManager, EditorAction } from '../game/systems/HistoryManager.ts';
import { EventBus } from '../game/EventBus.ts';

// Mock EventBus
const events: any[] = [];
EventBus.emit = (event: string, data?: any) => {
    events.push({ event, data });
    return true;
};

const history = new HistoryManager();

console.log('--- HistoryManager Tests ---');

// Test 1: Push
history.push({ type: 'PAINT_TILES', label: 'Paint', timestamp: Date.now(), data: { id: 1 } });
if (history.getHistory().undo.length !== 1) console.error('FAIL: Push failed');
else console.log('PASS: Push');

// Test 2: Undo
const undoAction = history.undo();
if (undoAction?.type !== 'PAINT_TILES' || history.getHistory().undo.length !== 0 || history.getHistory().redo.length !== 1) {
    console.error('FAIL: Undo failed', undoAction, history.getHistory());
} else {
    console.log('PASS: Undo');
}

// Test 3: Redo
const redoAction = history.redo();
if (redoAction?.type !== 'PAINT_TILES' || history.getHistory().undo.length !== 1 || history.getHistory().redo.length !== 0) {
    console.error('FAIL: Redo failed', redoAction, history.getHistory());
} else {
    console.log('PASS: Redo');
}

// Test 4: Limit
for(let i=0; i<60; i++) {
    history.push({ type: 'PAINT_TILES', label: `Paint ${i}`, timestamp: Date.now(), data: {} });
}
if (history.getHistory().undo.length !== 50) console.error('FAIL: History Limit failed', history.getHistory().undo.length);
else console.log('PASS: History Limit');

console.log('--- Tests Complete ---');
