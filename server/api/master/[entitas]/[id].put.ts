export default defineEventHandler((event) => {
  return handleUpdate(getCrudConfig(masterConfigs, event), event)
})
