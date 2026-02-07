import { EventBus } from '../EventBus';

export type EditorActionType = 
    | 'PAINT_TILES' 
    | 'PLACE_OBJECT' 
    | 'DELETE_OBJECT' 
    | 'MOVE_OBJECT' 
    | 'UPDATE_PROP'
    | 'UPDATE_SCRIPT'
    | 'GLOBAL_UPDATE';

export interface EditorAction {
    type: EditorActionType;
    label: string; // "Paint Wall", "Move Spawner"
    timestamp: number;
    data: any;
}

export class HistoryManager {
    private undoStack: EditorAction[] = [];
    private redoStack: EditorAction[] = [];
    private readonly MAX_HISTORY = 50;

    constructor() {}

    public push(action: EditorAction) {
        this.undoStack.push(action);
        // Clear redo stack on new action (standard behavior)
        this.redoStack = [];
        
        // Limit size
        if (this.undoStack.length > this.MAX_HISTORY) {
            this.undoStack.shift();
        }

        this.emitUpdate();
    }

    public undo(): EditorAction | null {
        if (this.undoStack.length === 0) return null;

        const action = this.undoStack.pop();
        if (action) {
            this.redoStack.push(action);
            this.emitUpdate();
            return action;
        }
        return null;
    }

    public redo(): EditorAction | null {
        if (this.redoStack.length === 0) return null;

        const action = this.redoStack.pop();
        if (action) {
            this.undoStack.push(action);
            this.emitUpdate();
            return action;
        }
        return null;
    }

    public clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.emitUpdate();
    }

    public getHistory() {
        return {
            undo: this.undoStack,
            redo: this.redoStack
        };
    }

    private emitUpdate() {
        EventBus.emit('history-update', {
            canUndo: this.undoStack.length > 0,
            canRedo: this.redoStack.length > 0,
            history: [
                ...this.undoStack.map(a => ({ label: a.label, active: true })),
                ...[...this.redoStack].reverse().map(a => ({ label: a.label, active: false }))
            ]
        });
    }
}
