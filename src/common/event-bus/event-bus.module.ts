import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventBusService } from './event-bus.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'events',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
