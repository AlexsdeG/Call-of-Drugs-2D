import { MapData } from "../schemas/mapSchema";

export interface SecurityReport {
    safe: boolean;
    issues: string[];
    warnings: string[];
}

export class SecurityAnalyzer {
    
    public static scanMapData(data: MapData): SecurityReport {
        const issues: string[] = [];
        const warnings: string[] = [];
        
        // 1. Check for massive map sizes (DoS prevention)
        if (data.width * data.height > 1000 * 1000) {
            warnings.push("Map size is extremely large (> 1,000,000 tiles). Performance may suffer.");
        }
        
        // 2. Check Custom Object Properties for dangerous strings
        // Though we just store them, future script injection might use them.
        data.objects?.forEach(obj => {
             if (obj.properties) {
                 Object.entries(obj.properties).forEach(([key, val]) => {
                     if (typeof val === 'string') {
                         if (val.includes('<script>') || val.includes('javascript:')) {
                             issues.push(`Object ${obj.id} property '${key}' contains suspicious code.`);
                         }
                     }
                 });
             }
        });
        
        // 3. Script Validation
        // Scan actions for dangerous parameters
        data.scripts?.forEach(script => {
             const scanActions = (actions: any[]) => {
                 actions.forEach(action => {
                     if (action.parameters) {
                         Object.values(action.parameters).forEach(val => {
                             if (typeof val === 'string' && (val.includes('<script>') || val.includes('javascript:'))) {
                                 issues.push(`Script '${script.name}' action '${action.type}' has suspicious parameter.`);
                             }
                         });
                     }
                     if (action.then) scanActions(action.then);
                     if (action.else) scanActions(action.else);
                 });
             };
             
             if (script.actions) {
                 scanActions(script.actions);
             }
        });

        return {
            safe: issues.length === 0,
            issues,
            warnings
        };
    }
}
