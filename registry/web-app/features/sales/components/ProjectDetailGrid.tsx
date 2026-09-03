import DetailRow from '@/components/commons/DetailRow'
import { APP_PATH } from '@/routes/AppRoute.constant'

export type SharedProjectData = {
  project_name?: string | null
  project_id?: string | number | null
  investor_name?: string | null
  property_code?: string | null
  product_inventory_id?: string | number | null
  sales_allocation_id?: string | number | null
}

type Props = {
  projectData: SharedProjectData
}

export const ProjectDetailGrid = ({ projectData }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <DetailRow
        label="Dự án"
        value={projectData.project_name || '-'}
        type={projectData.project_id ? 'link' : undefined}
        link={
          projectData.project_id
            ? APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(projectData.project_id))
            : undefined
        }
      />
      <DetailRow label="Chủ đầu tư" value={projectData.investor_name || '-'} />

      <div className="col-span-1 md:col-span-2">
        <DetailRow
          label="Mã bất động sản"
          value={projectData.property_code || '-'}
          type={projectData.product_inventory_id ? 'link' : undefined}
          link={
            projectData.product_inventory_id
              ? APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(
                  ':id',
                  String(projectData.product_inventory_id)
                )
              : undefined
          }
        />
      </div>
    </div>
  )
}

export default ProjectDetailGrid
