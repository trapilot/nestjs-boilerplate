/* AUTO-GENERATED FILE. DO NOT EDIT. */

import formSchema from '../schemas/content-request-create-dto.schema'
import { contentService } from '../services/content.service.ts'
import { FormPage } from '../components/FormPage'

export default function ContentCreate() {
  return (
    <FormPage
      schema={formSchema}
      onSubmit={contentService.create}
    />
  )
}

