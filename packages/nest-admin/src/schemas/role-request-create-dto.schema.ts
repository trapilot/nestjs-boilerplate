/* AUTO-GENERATED FILE. DO NOT EDIT. */

import { FormSchema } from '../types/form'

const schema: FormSchema = {
  "title": "RoleRequestCreateDto",
  "fields": {
    "name": {
      "type": "string",
      "format": "string",
      "placeholder": "",
      "required": true
    },
    "type": {
      "type": "string",
      "format": "string",
      "placeholder": "",
      "required": false
    },
    "description": {
      "type": "object",
      "format": "object",
      "placeholder": "",
      "required": false
    },
    "isActive": {
      "type": "boolean",
      "format": "boolean",
      "placeholder": "",
      "required": true
    },
    "policies": {
      "type": "array",
      "format": "array",
      "placeholder": "",
      "required": true
    }
  }
}

export default schema
