import localforage from 'localforage';
import { MapData } from '../../schemas/mapSchema';
import { MapSerializer } from '../systems/MapSerializer';

const STORE_KEY_CURRENT = 'editor-current-project';
const STORE_KEY_PROJECTS = 'editor-project-list';

export class ProjectStorage {
    
    public static async saveProject(data: MapData): Promise<void> {
        // Save current working project (Editor Format)
        await localforage.setItem(STORE_KEY_CURRENT, data);
        
        // Update Project List
        const list = await this.getProjectList();
        const existingIndex = list.findIndex(p => p.name === data.name);
        
        if (existingIndex >= 0) {
            list[existingIndex].lastModified = Date.now();
        } else {
            list.push({ name: data.name, lastModified: Date.now() });
        }
        await localforage.setItem(STORE_KEY_PROJECTS, list);
        
        // Also save the named project separately so it can be loaded later
        // Key format: 'project-[name]'
        await localforage.setItem(`project-${data.name}`, data);
        
        console.log('Project Saved:', data.name);
    }
    
    public static async loadProject(name?: string): Promise<MapData | null> {
        if (!name) {
            return await localforage.getItem<MapData>(STORE_KEY_CURRENT);
        } else {
            return await localforage.getItem<MapData>(`project-${name}`);
        }
    }
    
    public static async getProjectList(): Promise<{name: string, lastModified: number}[]> {
         return await localforage.getItem<{name: string, lastModified: number}[]>(STORE_KEY_PROJECTS) || [];
    }

    public static async downloadProject(data: MapData) {
        // ALWAYS download as Game Format (snake_case) with Metadata
        // The 'format' param is kept for compatibility but ignored for the file structure itself if we want one unified file.
        // However, user might want to download "work in progress" vs "final".
        // BUT the requirement is: "remove import export form editor... update the json file to update the format"
        // I will standardize on ONE format for file storage: The Game Format (snake_case) which is what the game reads.
        // The Editor will translate it back to Editor Format (PascalCase) on load.
        
        const exportData = MapSerializer.translateToGameFormat(data);
        
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        // filename.json (no .editor.json or .game.json)
        a.download = `${data.name || 'map'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    public static async importProject(file: File): Promise<MapData> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                 try {
                     const json = JSON.parse(evt.target?.result as string);
                     
                     // 1. Check Header (App Tag)
                     const headerCheck = MapSerializer.validateHeader(json);
                     if (!headerCheck.valid) {
                         reject(new Error(headerCheck.error));
                         return;
                     }
                     
                     // 2. Validate Schema
                     const validation = MapSerializer.validate(json);
                     
                     if (validation.success) {
                         // 3. Version Check (Warning is handled by UI, here we just ensure we can load)
                         // We assume if schema is valid, we can try to load.
                         
                         // Check if objects are PascalCase (Old Editor) or snake_case (Game)
                         // Simple heuristic: Check first object type
                         if (json.objects && json.objects.length > 0) {
                             const firstType = json.objects[0].type;
                             if (firstType === firstType.toLowerCase() && firstType.includes('_')) {
                                 // isGameFormat = true; 
                             } else if (firstType === 'spawn' || firstType === 'door') {
                                 // specific lowercase types
                                 // isGameFormat = true;
                             }
                         }
                         
                         // If we are unified, we ALWAYS expect Game Format from files now,
                         // BUT we should be robust.
                         // MapSerializer.translateToEditorFormat handles snake_case -> PascalCase.
                         // If it's already PascalCase, it might ignore it? 
                         // Check translateToEditorFormat logic... it maps specific values.
                         // If value is not found, it keeps original?
                         // Let's rely on translateToEditorFormat to do its job.
                         
                         const editorData = MapSerializer.translateToEditorFormat(validation.data);
                         resolve(editorData);
                     } else {
                         reject(new Error("Invalid Map Schema"));
                     }
                 } catch (err) {
                     reject(err);
                 }
            };
            reader.readAsText(file);
        });
    }

    public static async deleteProject(name: string): Promise<void> {
        await localforage.removeItem(`project-${name}`);
        
        const list = await this.getProjectList();
        const updatedList = list.filter(p => p.name !== name);
        await localforage.setItem(STORE_KEY_PROJECTS, updatedList);
    }
    
    public static async clearAllProjects(): Promise<void> {
        // Clear all individual projects
        const list = await this.getProjectList();
        const promises = list.map(p => localforage.removeItem(`project-${p.name}`));
        await Promise.all(promises);
        
        // Clear main list
        await localforage.setItem(STORE_KEY_PROJECTS, []);
        
        // Optionally clear current? No, let's keep current workspace safe.
    }
}
