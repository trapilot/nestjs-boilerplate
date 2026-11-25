/* AUTO-GENERATED FILE. DO NOT EDIT. */

import { useNavigate } from 'react-router-dom'
import { GenericList } from '../components/GenericList'
import { customerService } from '../services'

export default function CustomerView() {
  const navigate = useNavigate()

  return (
    <GenericList
      module="customer"
      subject="CUSTOMER"
      actions={{
        onList: customerService.list,
        onRead: (row) => navigate(`/customer/${row.id}/view`),
        onCreate: customerService.create,
        onUpdate: (row) => navigate(`/customer/${row.id}/edit`),
        onDelete: () => {},
      }}
    />
  )
}
