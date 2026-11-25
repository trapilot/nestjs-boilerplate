/* AUTO-GENERATED FILE. DO NOT EDIT. */

import formSchema from '../schemas/customer-request-create-dto.schema'
import { customerService } from '../services/customer.service.ts'
import { FormPage } from '../components/FormPage'

export default function CustomerCreate() {
  return (
    <FormPage
      schema={formSchema}
      onSubmit={customerService.create}
    />
  )
}

