/* AUTO-GENERATED FILE. DO NOT EDIT. */

import { FormSchema } from '../types/form'

const schema: FormSchema = {
  "title": "PolicyRequestUpdateDto",
  "fields": {
    "context": {
      "type": "string",
      "format": "enum",
      "placeholder": "",
      "required": false,
      "options": [
        "DASHBOARD",
        "SETTING_MANAGEMENT",
        "USER_MANAGEMENT",
        "CUSTOMER_MANAGEMENT",
        "LOCATION_MANAGEMENT",
        "MARKETING_MANAGEMENT"
      ]
    },
    "subject": {
      "type": "string",
      "format": "enum",
      "placeholder": "",
      "required": true,
      "options": [
        "DASHBOARD",
        "SETTING",
        "API_KEY",
        "APP_VERSION",
        "ROLE",
        "POLICY",
        "USER",
        "CONTENT",
        "COUNTRY",
        "DISTRICT",
        "PUSH",
        "PUSH_GROUP",
        "NOTIFICATION",
        "CUSTOMER",
        "CUSTOMER_PUSH",
        "CUSTOMER_NOTIFICATION",
        "ACTIVITY_LOG"
      ]
    },
    "actions": {
      "type": "array",
      "format": "array",
      "placeholder": "",
      "required": true
    },
    "path": {
      "type": "string",
      "format": "string",
      "placeholder": "",
      "required": true
    },
    "title": {
      "type": "object",
      "format": "string",
      "placeholder": "",
      "required": true,
      "options": [
        "en",
        "vi"
      ]
    },
    "sorting": {
      "type": "number",
      "format": "number",
      "placeholder": "",
      "required": true
    },
    "isVisible": {
      "type": "boolean",
      "format": "boolean",
      "placeholder": "",
      "required": true
    },
    "isActive": {
      "type": "boolean",
      "format": "boolean",
      "placeholder": "",
      "required": true
    }
  }
}

export default schema
