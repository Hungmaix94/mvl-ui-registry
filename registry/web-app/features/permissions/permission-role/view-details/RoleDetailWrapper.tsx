import { Flex } from '@radix-ui/themes'
import RolePermissionsTable from './RolePermissionsTable.tsx'
import RoleDetail from '@/features/permissions/permission-role/view-details/RoleDetail.tsx'

import type { Role } from '@/services/role-service.ts'

const RoleDetailWrapper = ({ role }: { role: Role }) => {
  return (
    <>
      <Flex direction={'column'} className="px-10">
        <RoleDetail role={role} />

        {/* Permissions table */}
        <RolePermissionsTable permissions={role.permissions_detail || []} />
      </Flex>
    </>
  )
}

export default RoleDetailWrapper
