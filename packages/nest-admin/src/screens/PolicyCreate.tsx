/* AUTO-GENERATED FILE. DO NOT EDIT. */

import formSchema from '../schemas/policy-request-create-dto.schema'
import { policyService } from '../services/policy.service.ts'
import { FormPage } from '../components/FormPage'

export default function PolicyCreate() {
  return (
    <FormPage
      schema={formSchema}
      onSubmit={policyService.create}
    />
  )
}

