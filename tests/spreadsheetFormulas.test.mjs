import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/spreadsheetFormulas.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { evaluateFormula } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const calculate = (cells, address = 'Z1') => evaluateFormula({ cells }, address)

test('arithmetic, references, ranges, and recalculation', () => {
  const cells = { A1: '10', A2: '20', Z1: '=SUM(A1:A2)*2' }
  assert.equal(calculate(cells), '60')
  cells.A2 = '30'
  assert.equal(calculate(cells), '80')
  assert.equal(calculate({ A1: '2', Z1: '=A1^3+10%' }), '8.1')
  assert.equal(calculate({ A1: '1', A2: '2', Z1: '=AVERAGE(A1:A2)' }), '1.5')
})

test('logic, text, and error handling', () => {
  assert.equal(calculate({ A1: '12', Z1: '=IF(AND(A1>10,A1<20),"yes","no")' }), 'yes')
  assert.equal(calculate({ Z1: '=IF(FALSE,1/0,"safe")' }), 'safe')
  assert.equal(calculate({ Z1: '=IFERROR(1/0,"fallback")' }), 'fallback')
  assert.equal(calculate({ A1: 'Hello', Z1: '=UPPER(LEFT(A1,2))&"!"' }), 'HE!')
  assert.equal(calculate({ Z1: '=1/0' }), '#DIV/0!')
  assert.equal(calculate({ A1: '=Z1', Z1: '=A1' }), '#CYCLE!')
  assert.equal(calculate({ Z1: '=MADEUP(1)' }), '#NAME?')
})

test('conditional calculations, lookups, and dates', () => {
  const cells = { A1: 'Apple', A2: 'Pear', B1: '10', B2: '20' }
  assert.equal(calculate({ ...cells, Z1: '=COUNTIF(B1:B2,">10")' }), '1')
  assert.equal(calculate({ ...cells, Z1: '=SUMIF(A1:A2,"Pear",B1:B2)' }), '20')
  assert.equal(calculate({ ...cells, Z1: '=VLOOKUP("Pear",A1:B2,2,FALSE)' }), '20')
  assert.equal(calculate({ ...cells, Z1: '=XLOOKUP("Pear",A1:A2,B1:B2)' }), '20')
  assert.equal(calculate({ ...cells, Z1: '=INDEX(B1:B2,MATCH("Pear",A1:A2,0))' }), '20')
  assert.equal(calculate({ Z1: '=YEAR(DATE(2024,2,29))' }), '2024')
  assert.equal(calculate({ Z1: '=ROUND(-1.235,2)' }), '-1.24')
})
