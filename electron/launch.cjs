const { spawn } = require('node:child_process')
const electron = require('electron')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(electron, ['.', ...process.argv.slice(2)], {
  cwd: require('node:path').join(__dirname, '..'),
  env,
  stdio: 'inherit',
})
child.on('error', error => {
  console.error('Could not start Myoffice:', error)
  process.exitCode = 1
})
child.on('exit', code => { process.exitCode = code ?? 1 })
