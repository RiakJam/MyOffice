import fs from 'node:fs'
import { NtExecutable, NtExecutableResource } from 'pe-library'
import { Data, Resource } from 'resedit'

const iconPath = new URL('../build/icon.ico', import.meta.url)
const icon = Data.IconFile.from(fs.readFileSync(iconPath))
const files = process.argv.slice(2)
if (!files.length) throw new Error('Pass at least one packaged Myoffice.exe path')
for (const file of files) {
  const executable = NtExecutable.from(fs.readFileSync(file))
  const resources = NtExecutableResource.from(executable)
  const groups = Resource.IconGroupEntry.fromEntries(resources.entries)
  if (!groups.length) throw new Error(`No icon group found in ${file}`)
  for (const group of groups) {
    Resource.IconGroupEntry.replaceIconsForResource(resources.entries, group.id, group.lang, icon.icons.map(item => item.data))
  }
  resources.outputResource(executable)
  const temporary = `${file}.icon-new`
  fs.writeFileSync(temporary, Buffer.from(executable.generate()))
  fs.renameSync(temporary, file)
  console.log(`Updated icon: ${file}`)
}
