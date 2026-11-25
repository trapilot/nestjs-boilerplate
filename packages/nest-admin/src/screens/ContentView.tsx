/* AUTO-GENERATED FILE. DO NOT EDIT. */

import { useNavigate } from 'react-router-dom'
import { GenericList } from '../components/GenericList'
import { contentService } from '../services'

export default function ContentView() {
  const navigate = useNavigate()

  return (
    <GenericList
      module="content"
      subject="CONTENT"
      actions={{
        onList: contentService.list,
        onRead: (row) => navigate(`/content/${row.id}/view`),
        onCreate: contentService.create,
        onUpdate: (row) => navigate(`/content/${row.id}/edit`),
        onDelete: contentService.delete,
      }}
    />
  )
}
