/* AUTO-GENERATED FILE. DO NOT EDIT. */

import formSchema from '../schemas/customer-request-update-dto.schema'
import { customerService } from '../services/customer.service.ts'
import { FormPage } from '../components/FormPage'
import { Navigate, useParams } from 'react-router-dom'

export default function CustomerEdit() {
   const { id } = useParams<{ id: string }>()

  if (!id) {
     return <Navigate to="/404" replace />
  }

  return (
    <FormPage
      schema={formSchema}
      onLoad={() => customerService.get({ id })}
      onSubmit={(data) => customerService.update({ id }, data)}
    />
  )
}

