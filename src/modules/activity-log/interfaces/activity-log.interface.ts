import { Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from '../enums/activity-log.enum'
import { ClassConstructor } from 'class-transformer'
import { EnumActivityLogOwner } from '../enums/activity-log.enum'

export type IActivityLogMetadata = Record<string, string | number | boolean>

export interface IActivityLogActionContract {
  owner: EnumActivityLogOwner
  /** class-validator DTO the metadata must match (unknown keys are rejected) */
  metadata: ClassConstructor<object>
}

export interface IActivityLogPrepareInput {
  action: EnumActivityLogAction
  metadata?: IActivityLogMetadata
  /** Also write the row when the request ends in an error (e.g. failed login). */
  onError?: boolean
  /** Owner when the contract owner is USER. */
  userId?: number
  /** Owner when the contract owner is CUSTOMER. */
  customerId?: number
  /** Admin staff user who performed the action (target rows of admin actions). */
  createdBy?: number
}

export interface IActivityLogStagedEvent {
  action: EnumActivityLogAction
  metadata: IActivityLogMetadata
  onError: boolean
  userId?: number
  customerId?: number
  createdBy?: number
}

export interface IActivityLogRequestInfo {
  /** Scope and id of the authenticated caller, null on public routes. */
  payload: { scopeType: string; id: number } | null
  ipAddress: string | null
  userAgent: Prisma.InputJsonValue | null
}

export interface IActivityLogFlushOptions {
  isError: boolean
  request: IActivityLogRequestInfo
}
