import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EventBusService {
  constructor(
    @Inject('EVENT_BUS')
    private client: ClientProxy,
  ) {}

  async emit(event: string, payload: any) {
    await this.client.connect();

    this.client.emit(event, payload);
  }
}
