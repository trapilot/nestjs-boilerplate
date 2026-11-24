import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthUtil } from 'lib/nest-auth'
import {
  APP_COUNTRY_LIST,
  APP_LANGUAGE_LIST,
  EnumUserType,
  HelperService,
  ScheduleMockupBase,
  StrUtil,
} from 'lib/nest-core'
import { PrismaService } from 'lib/nest-prisma'
import { CustomerService } from 'modules/customer/services/customer.service'

@Injectable()
export class CustomerMock extends ScheduleMockupBase {
  private readonly startDate: Date
  private readonly mockupNumbers: number = 100

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
    private readonly customerService: CustomerService,
    private readonly authUtil: AuthUtil,
  ) {
    super()

    this.startDate = this.config.get<Date>('app.startDate')
  }

  async mockup(): Promise<void> {
    const remainNumbers = await this.getRemainNumbers()
    const mockupNumbers = Math.min(this.mockupNumbers, remainNumbers)

    if (mockupNumbers <= 0) {
      return
    }

    const lastCustomer = await this.prisma.customer.findFirst({
      orderBy: [{ id: 'desc' }],
      select: { id: true, createdAt: true },
    })

    // const deviceModels = ['iPhone', 'Samsung Galaxy', 'Samsung Note', 'Xiaomi']
    // const deviceVersions = ['5', '6', '7', '8', '9', '10', '11', '12']
    const firstNames = [
      'John',
      'Jane',
      'Alex',
      'Emily',
      'Michael',
      'Sarah',
      'Andy',
      'Mihawk',
      'Lix',
      'Lisa',
      'Shark',
    ]
    const lastNames = [
      'Smith',
      'Johnson',
      'Brown',
      'Taylor',
      'Anderson',
      'Ed',
      'Parker',
      'Anna',
      'Wex',
      'Yay',
      'Kyn',
    ]
    const streetNames = ['Main St', 'Oak Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln']
    const cities = [
      'New York',
      'Los Angeles',
      'Chicago',
      'Houston',
      'Phoenix',
      'Seul',
      'Tokyo',
      'Shanghai',
    ]
    const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'AX', 'YY', 'TW', 'AT', 'IG']

    const dateCheck = lastCustomer ? lastCustomer.createdAt : this.startDate
    const dateExecute = this.helperService.dateForward(dateCheck, {
      days: this.helperService.randomNumber({ min: 0, max: 2 }),
    })
    const authPassword = this.authUtil.passwordCreate(process.env.MOCK_CUSTOMER_PASS)

    for (let i = 0; i < mockupNumbers; i++) {
      const isFemale = !this.helperService.randomNumber({ min: 0, max: 1 })

      const randCountry = this.helperService.arrayRandom(APP_COUNTRY_LIST)
      const fullPhone = this.helperService.randomDigits(10 - randCountry.length, {
        prefix: randCountry,
      })
      const { region, phone } = this.helperService.parsePhone(fullPhone)

      const birthDate = this.helperService.randomBirthDate(20, 60)
      const dateOfBirth = this.helperService.dateCreate(birthDate, { startOfDay: true })
      const extractDate = this.helperService.dateExtract(dateOfBirth)

      await this.customerService.create(
        {
          email:
            this.helperService.mixinString([lastNames, firstNames], {
              delimiter: '_',
              format: 'lowercase',
              suffix: this.helperService.randomDigits(4),
            }) +
            this.helperService.mixinString(
              [
                ['gmail', 'apple', 'domain', 'test', 'develop', 'x-mail', 'x-networks', 'x.ip6'],
                ['com', 'net', 'vn', 'io', 'info', 'org', 'in', 'uk'],
              ],
              {
                delimiter: '.',
                format: 'lowercase',
                prefix: '@',
              },
            ),
          name: this.helperService.mixinString([firstNames, lastNames], { delimiter: ' ' }),
          phone: i === 0 ? process.env.MOCK_CUSTOMER_PHONE : fullPhone,
          phoneRegion: region,
          phoneNumber: phone,
          address: this.helperService.mixinString([streetNames, cities, states], {
            delimiter: ', ',
            prefix: this.helperService.randomDigits(3, { suffix: ' ' }),
            suffix: this.helperService.randomDigits(5, { prefix: ' ' }),
          }),
          locale: this.helperService.arrayRandom(APP_LANGUAGE_LIST),
          gender: isFemale ? EnumUserType.FEMALE : EnumUserType.MALE,
          birthDate,
          birthDay: extractDate.day,
          birthMonth: extractDate.month,
          birthYear: extractDate.year,
          isActive: true,
          isPushable: true,
          isNotifiable: false,
          isPromotable: false,
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: dateExecute,
          updatedAt: dateExecute,
        },
        authPassword,
      )
    }
  }

  async mockable(): Promise<boolean> {
    const remainNumbers = await this.getRemainNumbers()
    return remainNumbers > 0
  }

  async getRemainNumbers(): Promise<number> {
    const limitCustomers = StrUtil.numeric(process.env.AUTO_GEN_CUSTOMER_NUMB, 0)
    if (limitCustomers <= 0) {
      return 0
    }

    const totalCustomers = await this.prisma.customer.count()
    return Math.max(0, limitCustomers - totalCustomers)
  }
}
