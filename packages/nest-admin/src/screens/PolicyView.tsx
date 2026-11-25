/* AUTO-GENERATED FILE. DO NOT EDIT. */

import { useNavigate } from 'react-router-dom'
import { GenericList } from '../components/GenericList'
import { policyService } from '../services'

export default function PolicyView() {
  const navigate = useNavigate()

  return (
    <GenericList
      module="policy"
      subject="POLICY"
      actions={{
        onList: policyService.list,
        onRead: (row) => navigate(`/policy/${row.id}/view`),
        onCreate: policyService.create,
        onUpdate: (row) => navigate(`/policy/${row.id}/edit`),
        onDelete: () => {},
      }}
    />
  )
}
