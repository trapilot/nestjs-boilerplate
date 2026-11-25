/* AUTO-GENERATED FILE. DO NOT EDIT. */

import formSchema from '../schemas/policy-request-update-dto.schema'
import { policyService } from '../services/policy.service.ts'
import { FormPage } from '../components/FormPage'
import { Navigate, useParams } from 'react-router-dom'

export default function PolicyEdit() {
   const { id } = useParams<{ id: string }>()

  if (!id) {
     return <Navigate to="/404" replace />
  }

  return (
    <FormPage
      schema={formSchema}
      onLoad={() => policyService.get({ id })}
      onSubmit={(data) => policyService.update({ id }, data)}
    />
  )
}

