import { BullModule } from '@nestjs/bullmq';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusModule } from './common/event-bus/event-bus.module';
import { EmailModule } from './jobs/queues/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DiscordNotificationProvider } from './providers/notification/discord.notification.provider';
import { NotificationEventHanlder } from './providers/notification/notification.event.handler';
import { PrismaModule } from './providers/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    EventEmitterModule.forRoot(),
    EmailModule,
    PrismaModule,
    AuthModule,
    UserModule,
    EventBusModule,
  ],
  controllers: [],
  providers: [
    {
      provide: Logger,
      useValue: new Logger('AppModule', { timestamp: true }),
    },
    NotificationEventHanlder,
    DiscordNotificationProvider,
  ],
})
export class AppModule {}
