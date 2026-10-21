export default defineEventHandler((event) => {
  return handleList(getCrudConfig(masterConfigs, event), event)
})
