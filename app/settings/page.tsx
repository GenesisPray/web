import ContractImportExport from '@/components/ContractImportExport'
import RetentionSetting from '@/components/RetentionSetting'
import ResetAppData from '@/components/ResetAppData'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ContractImportExport />
      <RetentionSetting />
      <ResetAppData />
    </div>
  )
}