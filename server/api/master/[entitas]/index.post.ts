export default defineEventHandler((event) => {
  return handleCreate(getCrudConfig(masterConfigs, event), event)
})
