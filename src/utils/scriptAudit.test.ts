import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeAndModernizeScript } from './scriptAudit.ts';

test('deteta ExecutionPolicy Bypass e pausa interativa', () => {
  const result = analyzeAndModernizeScript('start.cmd', 'powershell.exe -ExecutionPolicy Bypass -File fix.ps1\npause');
  assert.ok(result.findings.some((item) => item.id === 'exec-policy-bypass'));
  assert.ok(result.findings.some((item) => item.id === 'blocking-pause'));
});

test('não assinala padrões que aparecem apenas em comentários', () => {
  const result = analyzeAndModernizeScript('start.cmd', 'REM powershell.exe -ExecutionPolicy Bypass -File fix.ps1\n:: pause');
  assert.equal(result.findings.some((item) => item.id === 'exec-policy-bypass'), false);
  assert.equal(result.findings.some((item) => item.id === 'blocking-pause'), false);
});

test('deteta execução dinâmica e credencial potencialmente embutida em PowerShell', () => {
  const result = analyzeAndModernizeScript('deploy.ps1', 'Invoke-Expression $payload\n$api_key = "this-is-a-demo-secret"');
  assert.ok(result.findings.some((item) => item.id === 'dynamic-code-execution'));
  assert.ok(result.findings.some((item) => item.id === 'hard-coded-secret'));
});

test('reconhece e sinaliza comandos destrutivos', () => {
  const result = analyzeAndModernizeScript('cleanup.cmd', 'rd /s /q C:\\temp');
  assert.ok(result.findings.some((item) => item.id === 'destructive-command'));
});

test('devolve apenas resultados de análise, sem código de execução gerado', () => {
  const result = analyzeAndModernizeScript('ok.ps1', '$ErrorActionPreference = "Stop"\nWrite-Output "hello"');
  assert.equal(result.detectedType, 'powershell');
  assert.equal(typeof result.checksPassed, 'number');
  assert.equal(result.totalChecks, 9);
  assert.ok(!('hardenedCmd' in result));
});
