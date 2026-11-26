export const FindingSeverity = {
  CRITICO: 'Crítico',
  ATENCAO: 'Atenção',
  RECOMENDADO: 'Recomendado',
} as const;
export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

export interface ScriptFinding {
  id: string;
  severity: FindingSeverity;
  lineRef: string;
  title: string;
  description: string;
  remediation: string;
}

export interface ScriptAuditResult {
  filename: string;
  detectedType: 'batch' | 'powershell';
  checksPassed: number;
  totalChecks: number;
  findings: ScriptFinding[];
}
