import { ConflictException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Prisma } from '@runtime/prisma-client'
import { IAuthPassword } from 'lib/nest-auth'
import { APP_LANGUAGE, HelperService } from 'lib/nest-core'
import {
  IPrismaExportOptions,
  IPrismaReturnList,
  IPrismaReturnPaging,
  PrismaService,
} from 'lib/nest-prisma'
import { CustomerCreatedEvent } from '../events/customer.created.event'
import { TCustomer } from '../interfaces/customer.interface'

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getOne(kwargs: Prisma.CustomerFindUniqueArgs): Promise<TCustomer> {
    return await this.prisma.customer.findUnique(kwargs)
  }

  async getFirst(kwargs?: Prisma.CustomerFindFirstArgs): Promise<TCustomer> {
    return await this.prisma.customer.findFirst(kwargs)
  }

  async getMany(kwargs?: Prisma.CustomerFindManyArgs): Promise<TCustomer[]> {
    return await this.prisma.customer.findMany(kwargs)
  }

  async getList(
    kwargs: Prisma.CustomerFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnList> {
    return await this.prisma.customer.list(kwargs, options)
  }

  async getPage(
    kwargs: Prisma.CustomerFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnPaging> {
    return await this.prisma.customer.paginate(kwargs, options)
  }

  async findOrFail(
    id: number,
    kwargs: Omit<Prisma.CustomerFindUniqueOrThrowArgs, 'where'> = {},
  ): Promise<TCustomer> {
    return await this.prisma.customer
      .findUniqueOrThrow({ ...kwargs, where: { id } })
      .catch((_err: unknown) => {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'module.customer.notFound',
        })
      })
  }

  async create(
    data: Prisma.CustomerUncheckedCreateInput,
    authPassword: IAuthPassword,
  ): Promise<TCustomer> {
    if (data?.birthDate) {
      const dateOfBirth = this.helperService.dateCreateFromGeneric(data.birthDate)
      const extractDate = this.helperService.dateExtract(dateOfBirth)
      data.birthDay = extractDate.day
      data.birthMonth = extractDate.month
      data.birthYear = extractDate.year
    }

    const nowDate = this.helperService.dateNow()
    const { region, phone } = this.helperService.parsePhone(data.phone)

    const customer = await this.prisma.customer
      .create({
        data: {
          locale: APP_LANGUAGE,
          phoneRegion: region,
          phoneNumber: phone,
          isEmailVerified: false,
          isPhoneVerified: false,
          createdAt: nowDate,
          updatedAt: nowDate,
          ...data,
          // Always last: the hash must win over any raw `password` a caller passed in `data`
          password: authPassword.passwordHash,
        },
      })
      .catch((err: unknown) => {
        // unique constraint on email / phone / appleId
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictException({
            statusCode: HttpStatus.CONFLICT,
            message: 'module.customer.conflict',
          })
        }
        throw err
      })

    const event = new CustomerCreatedEvent(customer)
    this.eventEmitter.emit(event.topic, event)

    return customer
  }

  async update(id: number, data: Prisma.CustomerUncheckedUpdateInput): Promise<TCustomer> {
    const customer = await this.findOrFail(id)

    const { region, phone } = this.helperService.parsePhone(`${data?.phone}`)

    return await this.prisma.customer.update({
      data: {
        ...data,
        phoneRegion: region,
        phoneNumber: phone,
      },
      where: { id: customer.id },
    })
  }

  async inactive(id: number): Promise<TCustomer> {
    const customer = await this.findOrFail(id)
    return await this.prisma.customer.update({
      data: { isActive: false },
      where: { id: customer.id },
    })
  }

  async active(id: number): Promise<TCustomer> {
    const customer = await this.findOrFail(id)
    return await this.prisma.customer.update({
      data: { isActive: true },
      where: { id: customer.id },
    })
  }

  async changeAvatar(
    customer: TCustomer,
    data: Prisma.CustomerUncheckedUpdateInput,
  ): Promise<TCustomer> {
    return await this.prisma.customer.update({
      data,
      where: { id: customer.id },
    })
  }

  async closeProfile(id: number, reasons?: string[]): Promise<boolean> {
    const customer = await this.getOne({ where: { id } })
    if (customer && customer?.isActive) {
      // clear all personal information and associated data
      const nowDate = this.helperService.dateNow()
      const timestamp = this.helperService.dateGetTimestamp(nowDate)
      await this.prisma.customer.update({
        data: {
          isActive: false,
          email: this.helperService.dirtyString(customer.email, timestamp),
          phone: this.helperService.dirtyString(customer.phone, timestamp),
          appleId: this.helperService.dirtyString(customer.appleId, timestamp),
          deletions: {
            createMany: {
              data: reasons.map((reason: string) => {
                return {
                  title: reason,
                  createdAt: nowDate,
                }
              }),
              skipDuplicates: true,
            },
          },
        },
        where: { id },
      })
    }
    return true
  }

  async editProfile(id: number, dto: Prisma.CustomerUncheckedUpdateInput): Promise<TCustomer> {
    const customer = await this.findOrFail(id)
    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: dto,
    })
    const profile = await this.getProfile(updated.id)
    return profile
  }

  async getProfile(id: number): Promise<TCustomer> {
    return await this.findOrFail(id)
  }
}
