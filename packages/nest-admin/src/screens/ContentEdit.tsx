/* AUTO-GENERATED FILE. DO NOT EDIT. */

import formSchema from '../schemas/content-request-update-dto.schema'
import { contentService } from '../services/content.service.ts'
import { FormPage } from '../components/FormPage'
import { Navigate, useParams } from 'react-router-dom'

export default function ContentEdit() {
   const { id } = useParams<{ id: string }>()

  if (!id) {
     return <Navigate to="/404" replace />
  }

  return (
    <FormPage
      schema={formSchema}
      onLoad={() => contentService.get({ id })}
      onSubmit={(data) => contentService.update({ id }, data)}
    />
  )
}

