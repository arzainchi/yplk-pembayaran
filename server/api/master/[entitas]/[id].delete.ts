export default defineEventHandler((event) => {
  return handleDelete(getCrudConfig(masterConfigs, event), event)
})
