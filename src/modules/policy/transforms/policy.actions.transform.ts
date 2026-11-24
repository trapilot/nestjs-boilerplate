import { UserAbilityUtil } from 'app/helpers/user.ability.util'
import { Transform } from 'class-transformer'
import { TPolicy } from '../interfaces/policy.interface'

export function ToPolicyActions(): (target: object, key: string) => void {
  return Transform(({ obj }: { obj: TPolicy }) => {
    return UserAbilityUtil.map2Actions(obj.bitwise)
  })
}
