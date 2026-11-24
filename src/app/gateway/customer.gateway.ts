import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets'
import { CacheService, SocketGateWayBase } from 'lib/nest-core'
import { Socket } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' } })
export class CustomerGateway extends SocketGateWayBase {
  constructor(private readonly cache: CacheService) {
    super()
  }

  @SubscribeMessage('heartbeat')
  async onHeartbeat(client: Socket): Promise<boolean> {
    const { userId, userDevice } = client.data

    await this.cache.set(`customer:${userId}:device:${userDevice}`, 1, 60)
    await this.cache.set(`customer:${userId}:online`, 1, 60)
    return true
  }

  async setOnline(client: Socket): Promise<boolean> {
    const { userId, userDevice } = client.data

    await this.cache.set(`customer:${userId}:device:${userDevice}`, 1, 60)
    // await this.cache.sadd(`customer:${userId}:devices`, userDevice)
    return true
  }

  async setOffline(client: Socket): Promise<boolean> {
    const { userId, userDevice } = client.data

    await this.cache.del(`customer:${userId}:device:${userDevice}`)
    // await this.cache.srem(`customer:${userId}:devices`, userDevice)
    return true
  }

  async getUserDevices(_userId: string): Promise<number> {
    // return this.cache.sCustomers(`customer:${userId}:devices`)
    return 0
  }

  async isUserOnline(_userId: string): Promise<boolean> {
    // const counter = await this.cache.scard(`customer:${userId}:devices`)
    // return counter > 0
    return false
  }
}
